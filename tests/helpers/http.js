// Minimal Vercel/Express-style request and response doubles for calling
// serverless handlers directly.

export function mockReq({ method = "POST", query = {}, body, headers = {}, params, remoteAddress } = {}) {
  return {
    method,
    query,
    body,
    params,
    headers: { host: "rtg.test", ...headers },
    socket: { remoteAddress },
  };
}

export function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    ended: false,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      res.ended = true;
      return res;
    },
    send(payload) {
      res.body = payload;
      res.ended = true;
      return res;
    },
    setHeader(name, value) {
      res.headers[name.toLowerCase()] = value;
      return res;
    },
    writeHead(code, headers = {}) {
      res.statusCode = code;
      for (const [k, v] of Object.entries(headers)) res.headers[k.toLowerCase()] = v;
      return res;
    },
    end() {
      res.ended = true;
      return res;
    },
  };
  return res;
}

// A fetch Response-like object.
export function jsonResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}
