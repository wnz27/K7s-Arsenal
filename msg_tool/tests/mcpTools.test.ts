import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DecisionBroker } from "../src/broker/broker.js";
import { JsonDecisionStore } from "../src/broker/store.js";
import { FakeDecisionChannel } from "../src/channels/fake.js";
import { createToolHandlers } from "../src/mcp/tools.js";

describe("MCP tool handlers", () => {
  let dir: string;
  let broker: DecisionBroker;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "msg-tool-mcp-"));
    broker = new DecisionBroker(new JsonDecisionStore(join(dir, "decisions.json")), {
      console: new FakeDecisionChannel("console")
    });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates and reads a decision with structured content", async () => {
    const tools = createToolHandlers(broker);
    const ask = await tools.ask({
      project: "K7s Arsenal",
      question: "Pick?",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" }
      ]
    });

    expect(ask.structuredContent.status).toBe("pending");
    expect(ask.content[0].type).toBe("text");

    const get = await tools.get({ request_id: ask.structuredContent.request_id });
    expect(get.structuredContent.status).toBe("pending");
  });

  it("cancels a decision", async () => {
    const tools = createToolHandlers(broker);
    const ask = await tools.ask({
      project: "K7s Arsenal",
      question: "Pick?",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" }
      ]
    });

    const cancelled = await tools.cancel({
      request_id: ask.structuredContent.request_id,
      reason: "No longer needed"
    });

    expect(cancelled.structuredContent.status).toBe("cancelled");
  });
});
