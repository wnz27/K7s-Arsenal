import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DecisionBroker } from "../src/broker/broker.js";
import { JsonDecisionStore } from "../src/broker/store.js";
import type { DecisionRequest } from "../src/broker/types.js";
import { FakeDecisionChannel } from "../src/channels/fake.js";

describe("JsonDecisionStore and DecisionBroker", () => {
  let dir: string;
  let store: JsonDecisionStore;
  let fakeChannel: FakeDecisionChannel;
  let broker: DecisionBroker;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "msg-tool-"));
    store = new JsonDecisionStore(join(dir, "decisions.json"));
    fakeChannel = new FakeDecisionChannel("console");
    broker = new DecisionBroker(store, { console: fakeChannel });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates an empty state when no file exists", async () => {
    await expect(store.list()).resolves.toEqual([]);
  });

  it("writes a decision and reads it back without exposing mutable store state", async () => {
    const decision = makeDecision({ request_id: "req_1" });

    await store.save(decision);
    const loaded = await store.get("req_1");
    expect(loaded).toEqual(decision);

    loaded!.status = "answered";
    await expect(store.get("req_1")).resolves.toEqual(decision);
  });

  it("updates a decision atomically", async () => {
    await store.save(makeDecision({ request_id: "req_2" }));

    const updated = await store.update("req_2", (current) => ({
      ...current,
      status: "answered",
      selected_option_id: "console",
      source: "human"
    }));

    expect(updated.status).toBe("answered");
    await expect(store.get("req_2")).resolves.toMatchObject({
      status: "answered",
      selected_option_id: "console",
      source: "human"
    });
  });

  it("sends and answers a decision through an injected channel", async () => {
    const request = await broker.ask({
      project: "K7s Arsenal",
      question: "Pick channel",
      options: [
        { id: "console", label: "Console" },
        { id: "feishu", label: "Feishu" }
      ],
      channel: "console"
    });

    expect(fakeChannel.sent).toHaveLength(1);
    await broker.answer(request.request_id, "console", "Ship MVP first", "human");
    const decision = await broker.get(request.request_id);

    expect(decision.status).toBe("answered");
    expect(decision.selected_option_id).toBe("console");
    expect(decision.note).toBe("Ship MVP first");
  });

  it("expires pending decisions in the broker and applies a default option", async () => {
    const request = await broker.ask({
      project: "K7s Arsenal",
      question: "Continue after timeout?",
      options: [
        { id: "stop", label: "Stop" },
        { id: "continue", label: "Continue" }
      ],
      default_option_id: "stop",
      timeout_minutes: 5,
      channel: "console"
    });

    await store.update(request.request_id, (current) => ({
      ...current,
      expires_at: new Date(Date.now() - 1000).toISOString()
    }));

    const decision = await broker.get(request.request_id);
    expect(decision.status).toBe("expired");
    expect(decision.source).toBe("default");
    expect(decision.selected_option_id).toBe("stop");
  });

  it("waits briefly for a decision answer", async () => {
    const request = await broker.ask({
      project: "K7s Arsenal",
      question: "Pick quickly",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" }
      ],
      channel: "console"
    });

    setTimeout(() => {
      void broker.answer(request.request_id, "b", undefined, "human");
    }, 10);

    const decision = await broker.wait(request.request_id, 1, 1);
    expect(decision.status).toBe("answered");
    expect(decision.selected_option_id).toBe("b");
  });
});

function makeDecision(overrides: Partial<DecisionRequest> = {}): DecisionRequest {
  return {
    request_id: "req_test",
    project: "K7s Arsenal",
    question: "Pick one",
    options: [
      { id: "console", label: "Console" },
      { id: "feishu", label: "Feishu" }
    ],
    channel: "console",
    priority: "normal",
    status: "pending",
    created_at: "2026-05-12T00:00:00.000Z",
    expires_at: "2026-05-12T01:00:00.000Z",
    ...overrides
  };
}
