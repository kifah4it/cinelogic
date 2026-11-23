// Only video requests invoke this worker; pages retain native static-asset routing.
export default {
  async fetch(request, env) {
    const fullRequest = new Request(request);
    fullRequest.headers.delete('Range');
    fullRequest.headers.delete('If-Range');
    const response = await env.ASSETS.fetch(fullRequest);
    if (response.status !== 200 || !new URL(request.url).pathname.startsWith('/assets/videos/')) return response;
    const headers = new Headers(response.headers);
    headers.set('Accept-Ranges', 'bytes');
    const full = () => new Response(response.body, {status: 200, headers});
    if (request.method !== 'GET') return full();
    const range = request.headers.get('Range');
    if (!range) return full();
    const validator = request.headers.get('If-Range');
    if (validator) {
      const etag = headers.get('ETag');
      const modified = Date.parse(headers.get('Last-Modified'));
      const matches = validator.startsWith('"') ? validator === etag : !validator.startsWith('W/') && Number.isFinite(modified) && modified <= Date.parse(validator);
      if (!matches) return full();
    }
    // Multiple or malformed ranges are ignored, as permitted by HTTP semantics.
    const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
    if (!match || (!match[1] && !match[2])) return full();
    const bytes = await response.arrayBuffer();
    const size = bytes.byteLength;
    const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start || (!match[1] && Number(match[2]) === 0)) {
      headers.set('Content-Range', `bytes */${size}`);
      headers.set('Content-Length', '0');
      return new Response(null, {status: 416, headers});
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(bytes.slice(start, end + 1), {status: 206, headers});
  }
};
