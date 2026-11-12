globalThis.GTR = globalThis.GTR || {};

(() => {
  const API_HOST = 'personal-kd-njs.yun.139.com';
  const SAFE_HEADERS = new Set([
    'accept', 'authorization', 'content-type', 'cms-device', 'mcloud-channel', 'mcloud-client',
    'mcloud-route', 'mcloud-sign', 'mcloud-version', 'x-deviceinfo', 'x-inner-ntwk',
    'x-m4c-caller', 'x-m4c-src', 'x-svctype', 'x-yun-api-version', 'x-yun-app-channel',
    'x-yun-channel-source', 'x-yun-client-info', 'x-yun-module-type', 'x-yun-svc-type'
  ]);

  function parseBody(body) {
    if (!body) return null;
    if (typeof body === 'string') { try { return JSON.parse(body); } catch { return null; } }
    if (typeof body === 'object' && !(body instanceof ArrayBuffer)) return body;
    return null;
  }

  function sanitizeObservedHeaders(headersLike) {
    const output = {};
    if (!headersLike) return output;
    try {
      const headers = new Headers(headersLike);
      headers.forEach((value, key) => { if (SAFE_HEADERS.has(key.toLowerCase())) output[key.toLowerCase()] = value; });
    } catch {
      for (const [key, value] of Object.entries(headersLike || {})) if (SAFE_HEADERS.has(key.toLowerCase())) output[key.toLowerCase()] = String(value);
    }
    return output;
  }

  function classifyRequest(url) {
    const value = String(url || '');
    if (!value.includes(API_HOST)) return null;
    if (/\/hcy\/file\/list(?:\?|$)/.test(value)) return 'list';
    if (/\/hcy\/file\/update(?:\?|$)/.test(value)) return 'rename';
    return null;
  }

  function createCapture(url, method, headers, body) {
    const kind = classifyRequest(url);
    if (!kind) return null;
    return { kind, url: String(url), method: String(method || 'GET').toUpperCase(), headers: sanitizeObservedHeaders(headers), body: parseBody(body), capturedAt: Date.now() };
  }

  function install139RequestObserver(pageWindow, onCapture) {
    if (!pageWindow || typeof onCapture !== 'function') return () => {};
    const restores = [];
    if (typeof pageWindow.fetch === 'function') {
      const originalFetch = pageWindow.fetch;
      pageWindow.fetch = function observedFetch(input, init = {}) {
        const capture = createCapture(typeof input === 'string' ? input : input?.url, init.method || input?.method, init.headers || input?.headers, init.body);
        if (capture) onCapture(capture);
        return originalFetch.apply(this, arguments);
      };
      restores.push(() => { pageWindow.fetch = originalFetch; });
    }
    const proto = pageWindow.XMLHttpRequest?.prototype;
    if (proto) {
      const originalOpen = proto.open; const originalSend = proto.send; const originalSetHeader = proto.setRequestHeader;
      proto.open = function observedOpen(method, url) { this.__tmdb139Request = { method, url, headers: {} }; return originalOpen.apply(this, arguments); };
      proto.setRequestHeader = function observedSetHeader(key, value) { if (this.__tmdb139Request) this.__tmdb139Request.headers[key] = value; return originalSetHeader.apply(this, arguments); };
      proto.send = function observedSend(body) { const req = this.__tmdb139Request; if (req) { const capture = createCapture(req.url, req.method, req.headers, body); if (capture) onCapture(capture); } return originalSend.apply(this, arguments); };
      restores.push(() => { proto.open = originalOpen; proto.send = originalSend; proto.setRequestHeader = originalSetHeader; });
    }
    return () => restores.reverse().forEach((restore) => restore());
  }

  function contextFromCaptures(captures) {
    const list = captures?.list; const rename = captures?.rename; const source = rename || list;
    if (!source?.headers?.authorization || !list?.body?.parentFileId) return null;
    return { headers: source.headers, listUrl: list.url, renameUrl: rename?.url || list.url.replace(/\/list(?:\?.*)?$/, '/update'), listBody: list.body || {}, renameBody: rename?.body || {} };
  }

  Object.assign(globalThis.GTR, { API_HOST, SAFE_HEADERS, parseBody, sanitizeObservedHeaders, classifyRequest, createCapture, install139RequestObserver, contextFromCaptures });
})();
