import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DecisionBroker } from "../src/broker/broker.js";
import { JsonDecisionStore } from "../src/broker/store.js";
import { FakeDecisionChannel } from "../src/channels/fake.js";
import { FeishuDecisionChannel } from "../src/channels/feishu.js";
import { createCallbackServer } from "../src/http/callbackServer.js";
import { signActionToken, verifyActionToken } from "../src/security/actionToken.js";
import { redactSecrets } from "../src/security/redact.js";

describe("Feishu callback and security helpers", () => {
  let dir: string;
  let store: JsonDecisionStore;
  let broker: DecisionBroker;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "msg-tool-feishu-"));
    store = new JsonDecisionStore(join(dir, "decisions.json"));
    broker = new DecisionBroker(store, { console: new FakeDecisionChannel("console") });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("signs and verifies action tokens", () => {
    const token = signActionToken(
      { request_id: "req_1", option_id: "a", expires_at: futureIso() },
      "secret"
    );

    expect(verifyActionToken(token, "secret")).toMatchObject({
      request_id: "req_1",
      option_id: "a"
    });
    expect(() => verifyActionToken(token, "wrong")).toThrow(/Invalid action token signature/);
  });

  it("rejects expired action tokens", () => {
    const token = signActionToken(
      { request_id: "req_1", option_id: "a", expires_at: "2020-01-01T00:00:00.000Z" },
      "secret"
    );

    expect(() => verifyActionToken(token, "secret")).toThrow(/expired/);
  });

  it("redacts secrets from strings", () => {
    const input = "FEISHU_APP_SECRET=abc MSG_TOOL_SHARED_SECRET=def Authorization: Bearer token123";

    expect(redactSecrets(input)).toContain("FEISHU_APP_SECRET=[REDACTED]");
    expect(redactSecrets(input)).toContain("MSG_TOOL_SHARED_SECRET=[REDACTED]");
    expect(redactSecrets(input)).toContain("Authorization: Bearer [REDACTED]");
  });

  it("answers a decision from a valid Feishu button event", async () => {
    const request = await broker.ask({
      project: "K7s Arsenal",
      question: "Pick one",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" }
      ],
      channel: "console"
    });
    const token = signActionToken(
      { request_id: request.request_id, option_id: "b", expires_at: futureIso() },
      "secret"
    );
    const app = createCallbackServer({
      broker,
      sharedSecret: "secret",
      verificationToken: "verify"
    });

    const response = await app.inject({
      method: "POST",
      url: "/callbacks/feishu",
      payload: {
        token: "verify",
        type: "card.action.trigger",
        action: { value: { action_token: token }, option: "note text" }
      }
    });

    expect(response.statusCode).toBe(200);
    await expect(broker.get(request.request_id)).resolves.toMatchObject({
      status: "answered",
      selected_option_id: "b",
      source: "human"
    });
  });

  it("rejects a Feishu callback with an invalid action token", async () => {
    const app = createCallbackServer({
      broker,
      sharedSecret: "secret",
      verificationToken: "verify"
    });

    const response = await app.inject({
      method: "POST",
      url: "/callbacks/feishu",
      payload: {
        token: "verify",
        type: "card.action.trigger",
        action: { value: { action_token: "bad-token" } }
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("caches tenant token and posts an interactive message", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("tenant_access_token")) {
        return new Response(
          JSON.stringify({ code: 0, tenant_access_token: "tenant-token", expire: 7200 }),
          { status: 200 }
        );
      }

      expect(url).toContain("receive_id_type=open_id");
      expect(init?.headers).toMatchObject({ Authorization: "Bearer tenant-token" });
      const body = JSON.parse(String(init?.body));
      expect(body.msg_type).toBe("interactive");
      expect(JSON.parse(body.content).header.title.content).toContain("Decision required");
      return new Response(JSON.stringify({ code: 0, data: { message_id: "om_123" } }), {
        status: 200
      });
    });

    const channel = new FeishuDecisionChannel({
      appId: "app",
      appSecret: "secret",
      receiveIdType: "open_id",
      receiveId: "ou_1",
      sharedSecret: "shared",
      fetchImpl: fetchMock as typeof fetch
    });

    const result = await channel.send({
      request_id: "req_1",
      project: "K7s Arsenal",
      question: "Pick?",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" }
      ],
      channel: "feishu",
      priority: "normal",
      status: "pending",
      created_at: new Date().toISOString(),
      expires_at: futureIso()
    });

    expect(result.message_ref).toBe("om_123");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

function futureIso(): string {
  return new Date(Date.now() + 60_000).toISOString();
}
