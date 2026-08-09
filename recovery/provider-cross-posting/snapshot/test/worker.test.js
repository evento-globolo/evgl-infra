import test from "node:test";
import assert from "node:assert/strict";
import { createWorker } from "../src/index.js";

const env = {
  SERVICE_NAME: "evgl-edge",
  RELEASE: "test",
  ALLOWED_ORIGINS: "https://app.example.test",
  ALLOWED_UPSTREAM_HOSTS: "api.example.test",
  UPSTREAM_BASE_URL: "https://api.example.test",
  META_VERIFY_TOKEN: "verify-me",
  META_APP_SECRET: "secret"
};

test("health is available without upstream", async () => {
  const response = await createWorker().fetch(
    new Request("https://edge.example.test/healthz"), env
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("Meta verification challenge requires exact token", async () => {
  const response = await createWorker().fetch(new Request(
    "https://edge.example.test/webhooks/meta?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc"
  ), env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "abc");
});

test("Meta deliveries reject missing signatures", async () => {
  const response = await createWorker().fetch(new Request(
    "https://edge.example.test/webhooks/meta",
    { method: "POST", body: JSON.stringify({ object: "page" }) }
  ), env);
  assert.equal(response.status, 401);
});
