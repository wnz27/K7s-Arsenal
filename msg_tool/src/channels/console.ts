import type { DecisionRequest } from "../broker/types.js";
import type { DecisionChannel } from "./types.js";

export class ConsoleDecisionChannel implements DecisionChannel {
  readonly name = "console" as const;

  async send(decision: DecisionRequest): Promise<{ message_ref?: string }> {
    const lines = [
      `[msg-tool] Decision required: ${decision.question}`,
      `[msg-tool] Project: ${decision.project}`,
      `[msg-tool] Request ID: ${decision.request_id}`,
      "[msg-tool] Options:",
      ...decision.options.map((option) => `  - ${option.id}: ${option.label}`),
      "[msg-tool] Submit:",
      `  msg-tool answer ${decision.request_id} <option_id> --note "reason"`
    ];

    process.stderr.write(`${lines.join("\n")}\n`);
    return { message_ref: `console:${decision.request_id}` };
  }
}
