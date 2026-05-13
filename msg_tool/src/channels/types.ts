import type { DecisionRequest, DecisionChannelName } from "../broker/types.js";

export interface DecisionChannel {
  name: DecisionChannelName;
  send(decision: DecisionRequest): Promise<{ message_ref?: string }>;
}
