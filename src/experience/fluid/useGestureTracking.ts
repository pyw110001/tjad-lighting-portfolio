import { useRef, useState, useCallback, useEffect } from 'react';

export type GestureStatusType =
  | 'idle'
  | 'starting'
  | 'waiting_hand'
  | 'attracting'
  | 'pinching'
  | 'error';

export interface GestureTrackingResult {
  status: GestureStatusType;
  cursorPos: { x: number; y: number } | null; // Normalized 0..1 in mirrored video coordinates
  isPinching: boolean;
  errorMessage: string | null;
  start: () => Promise<void>;
  stop: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const PINCH_ENTER = 0.08;
const PINCH_RELEASE = 0.105;
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

export function useGestureTracking(): GestureTrackingResult {
  const [status, setStatus] = useState<GestureStatusType>('idle');
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const landmarkerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const activeRef = useRef<boolean>(false);
  const pinchStateRef = useRef<boolean>(false);

  const drawSkeleton = useCallback((landmarksList: any[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    landmarksList.forEach(landmarks => {
      // Architectural golden wireframe with cyan joints
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(198, 181, 139, 0.75)'; // TJAD Gold
      ctx.lineCap = 'round';

      HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const p1 = landmarks[startIdx];
        const p2 = landmarks[endIdx];
        if (!p1 || !p2) return;
        ctx.beginPath();
        ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
        ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
        ctx.stroke();
      });

      // Nodes
      landmarks.forEach((p: { x: number; y: number }, idx: number) => {
        const isTip = [4, 8, 12, 16, 20].includes(idx);
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, isTip ? 4.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? '#ffffff' : 'rgba(132, 169, 184, 0.9)'; // Cyan
        ctx.fill();
      });
    });
  }, []);

  const processFrame = useCallback(() => {
    if (!activeRef.current) return;

    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (landmarker && video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      try {
        const results = landmarker.detectForVideo(video, performance.now());
        const hands = results.landmarks || [];

        if (hands.length > 0) {
          // Track right hand (mirrored video, index 0 or right-labeled)
          const primaryHand = hands[0];
          drawSkeleton(hands);

          const thumb = primaryHand[4];
          const index = primaryHand[8];

          if (thumb && index) {
            const dx = thumb.x - index.x;
            const dy = thumb.y - index.y;
            const dz = (thumb.z || 0) - (index.z || 0);
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            let nextPinch = pinchStateRef.current;
            if (!pinchStateRef.current && dist < PINCH_ENTER) {
              nextPinch = true;
            } else if (pinchStateRef.current && dist > PINCH_RELEASE) {
              nextPinch = false;
            }
            pinchStateRef.current = nextPinch;
            setIsPinching(nextPinch);
            setStatus(nextPinch ? 'pinching' : 'attracting');

            // Mirrored horizontal position
            setCursorPos({
              x: 1 - index.x,
              y: index.y
            });
          }
        } else {
          drawSkeleton([]);
          setStatus('waiting_hand');
          setCursorPos(null);
        }
      } catch (err) {
        console.warn('MediaPipe tracking frame warning:', err);
      }
    }

    if (activeRef.current) {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [drawSkeleton]);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setStatus('idle');
    setCursorPos(null);
    setIsPinching(false);
  }, []);

  const start = useCallback(async () => {
    stop();
    setStatus('starting');
    setErrorMessage(null);
    activeRef.current = true;

    try {
      // 1. Load MediaPipe tasks-vision dynamically
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
      const wasmFileset = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm'
      );

      const landmarker = await HandLandmarker.createFromOptions(wasmFileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 1
      });
      landmarkerRef.current = landmarker;

      // 2. Request Camera Stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus('waiting_hand');
      animFrameRef.current = requestAnimationFrame(processFrame);
    } catch (err: any) {
      console.error('Failed to initialize gesture tracking:', err);
      const msg = err?.message || '无法获取摄像头权限或加载手势识别模型';
      setErrorMessage(msg);
      setStatus('error');
      stop();
    }
  }, [processFrame, stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    status,
    cursorPos,
    isPinching,
    errorMessage,
    start,
    stop,
    videoRef,
    canvasRef
  };
}
