#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DecisionBroker } from "./broker/broker.js";
import { JsonDecisionStore } from "./broker/store.js";
import type { DecisionChannel } from "./channels/types.js";
import { ConsoleDecisionChannel } from "./channels/console.js";
import { FeishuDecisionChannel } from "./channels/feishu.js";
import { loadConfig } from "./config.js";
import { createMcpServer } from "./mcp/server.js";
import type { DecisionChannelName } from "./broker/types.js";

async function main(): Promise<void> {
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
  const server = createMcpServer(broker);
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  process.stderr.write(`[msg-tool] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
