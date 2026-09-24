import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { StaticRouter } from 'react-router-dom';
import App from './App';

export function render(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = new PassThrough();
    let html = '';
    stream.setEncoding('utf8');
    stream.on('data', chunk => { html += chunk; });
    stream.on('end', () => resolve(html));
    stream.on('error', reject);

    const { pipe } = renderToPipeableStream(
      <StaticRouter location={url}><App /></StaticRouter>,
      {
        onAllReady() { pipe(stream); },
        onShellError(error) { reject(error); },
        onError(error) { reject(error); }
      }
    );
  });
}
