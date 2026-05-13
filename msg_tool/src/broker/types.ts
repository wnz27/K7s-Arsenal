export type DecisionStatus = "pending" | "answered" | "expired" | "cancelled";
export type DecisionChannelName = "console" | "feishu";
export type DecisionPriority = "normal" | "urgent";
export type DecisionSource = "human" | "default";

export interface DecisionOption {
  id: string;
  label: string;
  description?: string;
  impact?: string;
}

export interface DecisionRequest {
  request_id: string;
  project: string;
  question: string;
  context?: string;
  options: DecisionOption[];
  recommended_option_id?: string;
  default_option_id?: string;
  channel: DecisionChannelName;
  priority: DecisionPriority;
  status: DecisionStatus;
  created_at: string;
  expires_at: string;
  selected_option_id?: string;
  note?: string;
  answered_at?: string;
  cancelled_at?: string;
  source?: DecisionSource;
  message_ref?: string;
}

export interface DecisionStore {
  list(filter?: { status?: DecisionStatus; limit?: number }): Promise<DecisionRequest[]>;
  get(requestId: string): Promise<DecisionRequest | undefined>;
  save(decision: DecisionRequest): Promise<void>;
  update(
    requestId: string,
    updater: (current: DecisionRequest) => DecisionRequest
  ): Promise<DecisionRequest>;
}
