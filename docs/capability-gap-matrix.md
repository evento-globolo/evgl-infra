# Worker capability gap matrix

Status: implementation plan for issue #6. The rows below distinguish what the
current pinned Worker contract proves from what still requires code and a
dedicated test environment. A plan row is never a production capability.

| capability | current evidence | next executable slice | safe exit evidence |
| --- | --- | --- | --- |
| rate limiting | not exposed by the pinned Worker | inject a storage-backed counter with a key of `provider + tenant + client`, a fixed quota/window, deterministic `429`, and `Retry-After` | concurrent unit test proves one window admits exactly the quota, rejects the next request, and resets at the boundary |
| origin failover | not exposed by the pinned Worker | add a primary/secondary planner with bounded timeout and an explicit idempotent-method allowlist | deterministic timeout/5xx/recovery tests prove `GET`/`HEAD` may fail over while unsafe writes do not replay |
| deployment smoke | no PR-safe target | create a dedicated non-production Worker route with synthetic fixtures and least-privilege bindings outside PR jobs | exact source/image/config digests plus health, signed ingestion, binding, redaction, and log receipts |
| rollback | no versioned receipt lane | record previous-known-good and candidate versions, then probe the restored version | exact deployment and rollback receipts, with the same smoke probes green after rollback |
| Terraform requirement | this repository has no Terraform configuration | update the fleet capability source to mark Terraform inapplicable, or add a reviewed Terraform surface and validation | capability ledger and generated profile agree with the repository contents |

## Rate-limit contract

The counter binding must be injectable so unit tests do not pretend that a
process-local `Map` is a distributed quota. The production binding owns
atomicity; the Worker owns key derivation, quota selection, and response shape.

```json
{
  "key": "provider:tenant:client",
  "quota": 60,
  "windowSeconds": 60,
  "decision": "allow|deny",
  "remaining": 0,
  "resetAtUnixSeconds": 1735689660
}
```

The key must be derived from a verified provider/tenant identity where one is
available and from the platform client identity for pre-verification abuse
control. Never use an unverified body field as the sole tenant boundary. A
denial is a JSON `429` with `Retry-After` equal to the remaining whole seconds
until `resetAtUnixSeconds`; it does not disclose another tenant's existence.

The unit contract must cover: quota-1, quota, quota+1; two clients with
independent keys; two tenants with independent keys; exact reset-boundary
behavior; malformed/negative binding results; and concurrent calls against an
atomic fake. Missing production counter configuration is `503 service not
configured`, not an unlimited fallback.

## Failover contract

Failover is a planner decision, not a retry loop hidden inside the transport:

1. Try the primary once with a bounded deadline.
2. Fail over only for timeout or a retryable upstream `5xx`.
3. Permit replay only for explicitly idempotent methods (`GET`, `HEAD`, and a
   signed operation with an idempotency key whose server-side effect is known
   to be deduplicated).
4. Return a typed `upstream_unavailable` result when the method is unsafe or
   the secondary is also unavailable.
5. Include one request ID across both attempts and record only redacted
   outcome/duration metadata.

## Release gate

Keep the production capability ledger open until every implemented row has a
green test-org receipt. No Cloudflare token, R2 key, webhook secret, tenant
payload, production route, or customer data belongs in pull-request jobs.
