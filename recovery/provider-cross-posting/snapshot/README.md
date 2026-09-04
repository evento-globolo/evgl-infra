# evgl-infra

Cloudflare edge entrypoint for Evento Globolo.

- hardens and proxies API traffic
- forwards OAuth callbacks to the Rust API
- verifies Meta webhook HMAC signatures
- handles Meta webhook verification challenges
- queues provider webhook deliveries for durable processing
- exposes `/healthz`, `/readyz`, and `/version`

Bind `PROVIDER_WEBHOOKS` as a Queue producer. Store `META_APP_SECRET` and
`META_VERIFY_TOKEN` with `wrangler secret put`.
