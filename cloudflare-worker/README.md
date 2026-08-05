# evgl Cloudflare Worker

Edge webhook verification, provider callbacks, event ingestion, and cross-post dispatch.

## Routes

- `GET /healthz`
- `GET /readyz`
- `GET /api/config`
- `GET /api/openapi.json`
- `POST /api/events`
- `POST /api/alerts`
- `POST /api/webhooks/:provider`

Webhook HMAC verification is enabled when `WEBHOOK_SECRET` is configured. `STATE_KV`, `EVENT_QUEUE`, and `ALERT_QUEUE` are optional bindings; requests still receive deterministic responses when bindings are omitted in local tests.

```bash
npm test
npm install
npm run dev
```
