const SECURITY_HEADERS = {
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
};

const encoder = new TextEncoder();

function splitCsv(value = "") {
  return new Set(value.split(",").map((item) => item.trim()).filter(Boolean));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index++) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function hmacHex(secret, bytes) {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, bytes);
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin");
  if (!origin || !splitCsv(env.ALLOWED_ORIGINS).has(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,idempotency-key",
    "access-control-max-age": "86400",
    "vary": "origin"
  };
}

function json(body, init = {}, headers = {}) {
  const responseHeaders = new Headers(init.headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) responseHeaders.set(key, value);
  for (const [key, value] of Object.entries(headers)) responseHeaders.set(key, value);
  return new Response(JSON.stringify(body), { ...init, headers: responseHeaders });
}

async function metaWebhook(request, env, requestId) {
  const url = new URL(request.url);
  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && constantTimeEqual(token, env.META_VERIFY_TOKEN || "")) {
      return new Response(challenge || "", { status: 200 });
    }
    return json({ error: "verification failed", requestId }, { status: 403 });
  }

  const bytes = await request.arrayBuffer();
  const supplied = request.headers.get("x-hub-signature-256") || "";
  const expected = `sha256=${await hmacHex(env.META_APP_SECRET || "", bytes)}`;
  if (!constantTimeEqual(supplied, expected)) {
    return json({ error: "invalid Meta signature", requestId }, { status: 401 });
  }
  if (env.PROVIDER_WEBHOOKS) {
    await env.PROVIDER_WEBHOOKS.send({
      provider: "meta_facebook_page",
      requestId,
      receivedAt: new Date().toISOString(),
      payload: JSON.parse(new TextDecoder().decode(bytes))
    });
  }
  return json({ accepted: true, requestId }, { status: 202 });
}

async function eventbriteWebhook(request, env, requestId) {
  const payload = await request.json();
  // Eventbrite webhook endpoint ownership is established through the organizer/app
  // configuration. A deployment may additionally enforce a per-endpoint secret.
  const configured = env.EVENTBRITE_WEBHOOK_SECRET;
  if (configured) {
    const supplied = request.headers.get("x-evgl-webhook-secret") || "";
    if (!constantTimeEqual(supplied, configured)) {
      return json({ error: "invalid Eventbrite webhook secret", requestId }, { status: 401 });
    }
  }
  if (env.PROVIDER_WEBHOOKS) {
    await env.PROVIDER_WEBHOOKS.send({
      provider: "eventbrite",
      requestId,
      receivedAt: new Date().toISOString(),
      payload
    });
  }
  return json({ accepted: true, requestId }, { status: 202 });
}

async function proxy(request, env, requestId, cors) {
  const incoming = new URL(request.url);
  const upstream = new URL(env.UPSTREAM_BASE_URL);
  if (!splitCsv(env.ALLOWED_UPSTREAM_HOSTS).has(upstream.hostname)) {
    return json({ error: "upstream host is not allowlisted", requestId }, { status: 500 }, cors);
  }
  upstream.pathname = incoming.pathname;
  upstream.search = incoming.search;
  const headers = new Headers(request.headers);
  headers.delete("cf-connecting-ip");
  headers.delete("x-forwarded-for");
  headers.set("x-request-id", requestId);
  const response = await fetch(new Request(upstream, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual"
  }));
  const resultHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) resultHeaders.set(key, value);
  for (const [key, value] of Object.entries(cors)) resultHeaders.set(key, value);
  resultHeaders.set("x-request-id", requestId);
  return new Response(response.body, { status: response.status, headers: resultHeaders });
}

export function createWorker() {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
      const cors = corsHeaders(request, env);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
      if (url.pathname === "/healthz") {
        return json({ status: "ok", service: env.SERVICE_NAME, release: env.RELEASE }, {}, { ...cors, "x-request-id": requestId });
      }
      if (url.pathname === "/readyz") return new Response(null, { status: 204, headers: { ...cors, "x-request-id": requestId } });
      if (url.pathname === "/version") return json({ release: env.RELEASE }, {}, { ...cors, "x-request-id": requestId });
      if (url.pathname === "/webhooks/meta") return metaWebhook(request, env, requestId);
      if (url.pathname === "/webhooks/eventbrite" && request.method === "POST") {
        return eventbriteWebhook(request, env, requestId);
      }
      return proxy(request, env, requestId, cors);
    }
  };
}

export default createWorker();
