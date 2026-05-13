import type { DecisionRequest, DecisionChannelName } from "../broker/types.js";
import type { DecisionChannel } from "./types.js";

export class FakeDecisionChannel implements DecisionChannel {
  readonly sent: DecisionRequest[] = [];

  constructor(public readonly name: DecisionChannelName) {}

  async send(decision: DecisionRequest): Promise<{ message_ref?: string }> {
    this.sent.push(JSON.parse(JSON.stringify(decision)) as DecisionRequest);
    return { message_ref: `fake:${decision.request_id}` };
  }
}
