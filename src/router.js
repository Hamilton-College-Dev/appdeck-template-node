// A very small router.
//
// You register a method and a path, and it hands you back the matching handler.
// That is all it does. If you have used Express before this will look familiar,
// minus a few thousand lines.

export class Router {
  #routes = [];

  add(method, path, handler) {
    this.#routes.push({ method, path, handler });
    return this;
  }

  get(path, handler) { return this.add('GET', path, handler); }
  post(path, handler) { return this.add('POST', path, handler); }

  /** Returns the handler for this request, or null if nothing matches. */
  match(method, path) {
    const route = this.#routes.find((r) => r.method === method && r.path === path);
    return route ? route.handler : null;
  }
}

/** Thrown by readBody when the request body is over the limit. */
export class BodyTooLargeError extends Error {
  constructor(limitBytes) {
    super(`Request body larger than ${limitBytes} bytes`);
    this.name = 'BodyTooLargeError';
  }
}

/**
 * Reads a request body, with a hard cap so a huge upload can't exhaust memory.
 * Past the cap it stops buffering but keeps draining the socket, so we can
 * still send a tidy 413 back instead of hanging up on the browser.
 */
export function readBody(req, limitBytes = 16 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let exceeded = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        exceeded = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (exceeded) reject(new BodyTooLargeError(limitBytes));
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

/** Parses "a=1&b=two" into { a: "1", b: "two" }. */
export function parseForm(body) {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

/** Makes text safe to drop into HTML. Always use this on anything a user typed. */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
