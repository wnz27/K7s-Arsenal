import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DecisionBroker } from "../broker/broker.js";
import {
  AskDecisionInputSchema,
  AskDecisionInputObjectSchema,
  CancelDecisionInputSchema,
  GetDecisionInputSchema,
  ListDecisionsInputSchema,
  WaitDecisionInputSchema
} from "../schemas.js";
import { createToolHandlers } from "./tools.js";

export function createMcpServer(broker: DecisionBroker): McpServer {
  const server = new McpServer({
    name: "msg-tool",
    version: "0.1.0"
  });
  const handlers = createToolHandlers(broker);

  server.registerTool(
    "msg_tool_ask_user_decision",
    {
      title: "Ask user decision",
      description: "Create a blocking human decision request and send it through console or Feishu.",
      inputSchema: AskDecisionInputObjectSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    handlers.ask
  );

  server.registerTool(
    "msg_tool_get_decision",
    {
      title: "Get decision",
      description: "Read current status of a human decision request.",
      inputSchema: GetDecisionInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    handlers.get
  );

  server.registerTool(
    "msg_tool_wait_for_decision",
    {
      title: "Wait for decision",
      description: "Poll a decision request for a short bounded time.",
      inputSchema: WaitDecisionInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    handlers.wait
  );

  server.registerTool(
    "msg_tool_cancel_decision",
    {
      title: "Cancel decision",
      description: "Cancel a pending decision request that is no longer needed.",
      inputSchema: CancelDecisionInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    handlers.cancel
  );

  server.registerTool(
    "msg_tool_list_decisions",
    {
      title: "List decisions",
      description: "List recent decision requests for recovery and debugging.",
      inputSchema: ListDecisionsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    handlers.list
  );

  return server;
}
