#!/usr/bin/env node
import { DecisionBroker } from "./broker/broker.js";
import { JsonDecisionStore } from "./broker/store.js";
import { ConsoleDecisionChannel } from "./channels/console.js";
import { FeishuDecisionChannel } from "./channels/feishu.js";
import type { DecisionChannel } from "./channels/types.js";
import { loadConfig } from "./config.js";
import { createCallbackServer } from "./http/callbackServer.js";
import type { DecisionChannelName } from "./broker/types.js";

async function main(argv: string[]): Promise<void> {
  const config = loadConfig();
  const store = new JsonDecisionStore(config.stateFile);
  const channels: Partial<Record<DecisionChannelName, DecisionChannel>> = {
    console: new ConsoleDecisionChannel()
  };

  if (
    config.feishu?.appId &&
    config.feishu.appSecret &&
    config.feishu.receiveId &&
    config.sharedSecret
  ) {
    channels.feishu = new FeishuDecisionChannel({
      appId: config.feishu.appId,
      appSecret: config.feishu.appSecret,
      receiveIdType: config.feishu.receiveIdType,
      receiveId: config.feishu.receiveId,
      sharedSecret: config.sharedSecret
    });
  }

  const broker = new DecisionBroker(store, channels);
  const [command, ...args] = argv;

  if (command === "answer") {
    const [requestId, optionId, ...rest] = args;
    const note = parseNote(rest);
    const decision = await broker.answer(required(requestId, "request_id"), required(optionId, "option_id"), note, "human");
    writeJson(decision);
    return;
  }

  if (command === "get") {
    const [requestId] = args;
    writeJson(await broker.get(required(requestId, "request_id")));
    return;
  }

  if (command === "list") {
    const statusIndex = args.indexOf("--status");
    const status = statusIndex >= 0 ? args[statusIndex + 1] : undefined;
    writeJson(await broker.list({ status: status as never }));
    return;
  }

  if (command === "callback") {
    if (!config.sharedSecret) {
      throw new Error("MSG_TOOL_SHARED_SECRET is required for callback server");
    }
    const app = createCallbackServer({
      broker,
      sharedSecret: config.sharedSecret,
      verificationToken: config.feishu?.verificationToken
    });
    await app.listen({ host: "127.0.0.1", port: config.brokerPort });
    process.stderr.write(`[msg-tool] callback server listening on 127.0.0.1:${config.brokerPort}\n`);
    return;
  }

  throw new Error("Usage: msg-tool answer|get|list|callback");
}

function parseNote(args: string[]): string | undefined {
  const index = args.indexOf("--note");
  return index >= 0 ? args[index + 1] : undefined;
}

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`[msg-tool] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
