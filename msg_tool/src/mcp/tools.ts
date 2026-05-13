import type { DecisionBroker } from "../broker/broker.js";
import type { DecisionRequest } from "../broker/types.js";
import {
  AskDecisionInputSchema,
  CancelDecisionInputSchema,
  GetDecisionInputSchema,
  ListDecisionsInputSchema,
  WaitDecisionInputSchema
} from "../schemas.js";

export interface StructuredToolResult<T extends Record<string, unknown>>
  extends Record<string, unknown> {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: T;
}

export function createToolHandlers(broker: DecisionBroker) {
  return {
    ask: async (input: unknown) => {
      const decision = await broker.ask(AskDecisionInputSchema.parse(input));
      return toToolResult(toAskResult(decision));
    },
    get: async (input: unknown) => {
      const parsed = GetDecisionInputSchema.parse(input);
      const decision = await broker.get(parsed.request_id);
      return toToolResult(toDecisionResult(decision));
    },
    wait: async (input: unknown) => {
      const parsed = WaitDecisionInputSchema.parse(input);
      const decision = await broker.wait(
        parsed.request_id,
        parsed.max_wait_seconds,
        parsed.poll_interval_seconds
      );
      return toToolResult(toDecisionResult(decision));
    },
    cancel: async (input: unknown) => {
      const parsed = CancelDecisionInputSchema.parse(input);
      const decision = await broker.cancel(parsed.request_id, parsed.reason);
      return toToolResult({
        request_id: decision.request_id,
        status: decision.status,
        cancelled_at: decision.cancelled_at
      });
    },
    list: async (input: unknown) => {
      const parsed = ListDecisionsInputSchema.parse(input ?? {});
      const decisions = await broker.list(parsed);
      return toToolResult({
        decisions: decisions.map((decision) => ({
          request_id: decision.request_id,
          project: decision.project,
          question: decision.question,
          status: decision.status,
          created_at: decision.created_at,
          expires_at: decision.expires_at
        }))
      });
    }
  };
}

function toAskResult(decision: DecisionRequest): Record<string, unknown> {
  return {
    request_id: decision.request_id,
    status: decision.status,
    expires_at: decision.expires_at,
    poll_after_seconds: 5,
    channel: decision.channel,
    message_ref: decision.message_ref
  };
}

function toDecisionResult(decision: DecisionRequest): Record<string, unknown> {
  const answer = decision.selected_option_id
    ? decision.options.find((option) => option.id === decision.selected_option_id)
    : undefined;

  return {
    request_id: decision.request_id,
    status: decision.status,
    selected_option_id: decision.selected_option_id,
    answer_label: answer?.label,
    note: decision.note,
    answered_at: decision.answered_at,
    expires_at: decision.expires_at,
    source: decision.source
  };
}

function toToolResult<T extends Record<string, unknown>>(result: T): StructuredToolResult<T> {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result
  };
}
