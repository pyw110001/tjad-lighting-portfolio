export type ParticleData = {
  positions: Float32Array
  colors: Float32Array
  behavior: Float32Array
  flow: Float32Array
  meta: Float32Array
  palette: string[]
  count: number
  seed: number
}

const MAX_SIDE = 640
const MAX_POINTS = 84000

function randomGenerator(seed: number) {
  let state = seed || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
}

function hashPixels(bytes: Uint8ClampedArray) {
  let hash = 2166136261
  for (let index = 0; index < bytes.length; index += 17) {
    hash = Math.imul(hash ^ bytes[index], 16777619)
  }
  return hash >>> 0
}

function toHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((component) => Math.max(0, Math.min(255, Math.round(component))).toString(16).padStart(2, '0'))
    .join('')}`
}

function extractPalette(bytes: Uint8ClampedArray) {
  const buckets = new Map<number, { red: number; green: number; blue: number; score: number }>()
  for (let index = 0; index < bytes.length; index += 36) {
    const alpha = bytes[index + 3] / 255
    if (alpha < 0.15) continue
    const red = bytes[index]
    const green = bytes[index + 1]
    const blue = bytes[index + 2]
    const max = Math.max(red, green, blue)
    const min = Math.min(red, green, blue)
    const saturation = max === 0 ? 0 : (max - min) / max
    const lightness = (max + min) / 510
    if (lightness < 0.075) continue
    const key = (red >> 5) * 64 + (green >> 5) * 8 + (blue >> 5)
    const score = alpha * (0.4 + saturation * 1.3) * (0.45 + lightness)
    const bucket = buckets.get(key) ?? { red: 0, green: 0, blue: 0, score: 0 }
    bucket.red += red * score
    bucket.green += green * score
    bucket.blue += blue * score
    bucket.score += score
    buckets.set(key, bucket)
  }

  const ordered = [...buckets.values()]
    .sort((left, right) => right.score - left.score)
    .map((bucket) => [bucket.red / bucket.score, bucket.green / bucket.score, bucket.blue / bucket.score])
  const selected: number[][] = []
  for (const color of ordered) {
    if (selected.every((existing) => Math.hypot(color[0] - existing[0], color[1] - existing[1], color[2] - existing[2]) > 56)) {
      selected.push(color)
    }
    if (selected.length === 6) break
  }
  return selected.length ? selected.map((color) => toHex(color[0], color[1], color[2])) : ['#4bc9d8', '#e3a764', '#bd607d']
}

function behaviorWeights(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  const saturation = max === 0 ? 0 : delta / max
  let hue = 0
  if (delta > 0) {
    if (max === red) hue = ((green - blue) / delta + 6) % 6
    else if (max === green) hue = (blue - red) / delta + 2
    else hue = (red - green) / delta + 4
    hue *= 60
  }
  const weight = Math.min(1, saturation * 1.35)
  const warm = (hue < 65 || hue >= 345 ? 1 : 0) * weight
  const greenWeight = (hue >= 65 && hue < 165 ? 1 : 0) * weight
  const cool = (hue >= 165 && hue < 255 ? 1 : 0) * weight
  const violet = (hue >= 255 && hue < 345 ? 1 : 0) * weight
  return [warm, cool, greenWeight, violet]
}

export async function analyzeImage(blob: Blob): Promise<ParticleData> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob)
  } catch {
    throw new Error('This image could not be decoded. Try a JPG, PNG, or WebP file.')
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    bitmap.close()
    throw new Error('Image processing is unavailable in this browser.')
  }
  context.clearRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const bytes = context.getImageData(0, 0, width, height).data
  return createParticleData(bytes, width, height)
}

export function createParticleData(bytes: Uint8ClampedArray, width: number, height: number): ParticleData {
  const seed = hashPixels(bytes)
  const random = randomGenerator(seed)
  const palette = extractPalette(bytes)
  const accentColors = palette.map((hex) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255))
    .sort((left, right) => {
      const score = (color: number[]) => Math.max(...color) * 0.5 + (Math.max(...color) - Math.min(...color)) * 0.5
      return score(right) - score(left)
    }).slice(0, 3)

  const cumulative = new Float32Array(width * height)
  let totalWeight = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x
      const index = pixel * 4
      const alpha = bytes[index + 3] / 255
      const luminance = (bytes[index] * 0.2126 + bytes[index + 1] * 0.7152 + bytes[index + 2] * 0.0722) / 255
      const maximum = Math.max(bytes[index], bytes[index + 1], bytes[index + 2])
      const minimum = Math.min(bytes[index], bytes[index + 1], bytes[index + 2])
      const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum
      const right = Math.min(width - 1, x + 1)
      const down = Math.min(height - 1, y + 1)
      const rightIndex = (y * width + right) * 4
      const downIndex = (down * width + x) * 4
      const edge = (Math.abs(bytes[index] - bytes[rightIndex]) + Math.abs(bytes[index + 1] - bytes[downIndex + 1])) / 510
      const weight = alpha * (0.002 + luminance * luminance * 0.8 + saturation * luminance * 0.34 + edge * 1.5)
      totalWeight += weight
      cumulative[pixel] = totalWeight
    }
  }
  if (totalWeight < 0.01) throw new Error('This image has no visible pixels to turn into particles.')

  const imageAspect = width / height
  const worldWidth = Math.min(4.75, 3.55 * imageAspect)
  const worldHeight = worldWidth / imageAspect
  const positions = new Float32Array(MAX_POINTS * 3)
  const colors = new Float32Array(MAX_POINTS * 3)
  const behavior = new Float32Array(MAX_POINTS * 4)
  const flow = new Float32Array(MAX_POINTS * 3)
  const meta = new Float32Array(MAX_POINTS * 4)

  for (let point = 0; point < MAX_POINTS; point++) {
    const target = random() * totalWeight
    let low = 0
    let high = cumulative.length - 1
    while (low < high) {
      const middle = (low + high) >>> 1
      if (cumulative[middle] < target) low = middle + 1
      else high = middle
    }
    const x = low % width
    const y = Math.floor(low / width)
    const index = low * 4
    let red = bytes[index] / 255
    let green = bytes[index + 1] / 255
    let blue = bytes[index + 2] / 255
    const alpha = bytes[index + 3] / 255
    let luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
    const offset = point * 3
    const baseX = ((x + random()) / width - 0.5) * worldWidth
    const baseY = (0.5 - (y + random()) / height) * worldHeight
    const flourish = random()
    const halo = flourish < 0.035 ? 2 : flourish < 0.10 ? 1 : 0
    if (halo === 2) {
      const accent = accentColors[Math.floor(random() * accentColors.length)]
      if (accent) {
        [red, green, blue] = accent
        luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
      }
      const angle = random() * Math.PI * 2
      const track = random()
      positions[offset] = Math.cos(angle) * (1.5 + track * 1.13)
      positions[offset + 1] = Math.sin(angle) * (0.53 + track * 0.98) + Math.sin(angle * 3 + track) * 0.14
    } else {
      const spread = halo ? 1.14 + random() * 0.42 : 1
      const curl = halo ? (random() - 0.5) * 0.56 : 0
      positions[offset] = baseX * spread - baseY * curl
      positions[offset + 1] = baseY * spread + baseX * curl
    }
    positions[offset + 2] = (random() - 0.5) * (0.08 + luminance * 0.18)
    colors[offset] = red
    colors[offset + 1] = green
    colors[offset + 2] = blue
    const weightsForColor = behaviorWeights(red, green, blue)
    behavior.set(weightsForColor, point * 4)
    const sample = (sampleX: number, sampleY: number) => {
      const sampleIndex = (Math.max(0, Math.min(height - 1, sampleY)) * width + Math.max(0, Math.min(width - 1, sampleX))) * 4
      const sampleAlpha = bytes[sampleIndex + 3] / 255
      return sampleAlpha * (bytes[sampleIndex] * 0.2126 + bytes[sampleIndex + 1] * 0.7152 + bytes[sampleIndex + 2] * 0.0722) / 255
    }
    const gradientX = sample(x + 1, y) - sample(x - 1, y)
    const gradientY = sample(x, y + 1) - sample(x, y - 1)
    const gradientLength = Math.hypot(gradientX, gradientY)
    const fallbackAngle = random() * Math.PI * 2
    flow[offset] = gradientLength > 0.015 ? -gradientY / gradientLength : Math.cos(fallbackAngle)
    flow[offset + 1] = gradientLength > 0.015 ? -gradientX / gradientLength : Math.sin(fallbackAngle)
    flow[offset + 2] = Math.min(1, gradientLength * 3.2)
    const metaOffset = point * 4
    meta[metaOffset] = random()
    meta[metaOffset + 1] = Math.min(1, luminance * 1.45)
    meta[metaOffset + 2] = alpha * (halo === 2 ? 0.72 : halo ? 0.58 : 1)
    meta[metaOffset + 3] = halo
  }

  return { positions, colors, behavior, flow, meta, palette, count: MAX_POINTS, seed }
}
