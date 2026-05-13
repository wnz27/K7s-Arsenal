import { randomUUID } from "node:crypto";
import type { AskDecisionInput } from "../schemas.js";
import { AskDecisionInputSchema } from "../schemas.js";
import type {
  DecisionChannelName,
  DecisionRequest,
  DecisionSource,
  DecisionStatus,
  DecisionStore
} from "./types.js";
import type { DecisionChannel } from "../channels/types.js";

export class DecisionBroker {
  constructor(
    private readonly store: DecisionStore,
    private readonly channels: Partial<Record<DecisionChannelName, DecisionChannel>>
  ) {}

  async ask(input: AskDecisionInput): Promise<DecisionRequest> {
    const parsed = AskDecisionInputSchema.parse(input);
    const now = new Date();
    const decision: DecisionRequest = {
      request_id: `req_${randomUUID()}`,
      project: parsed.project,
      question: parsed.question,
      context: parsed.context,
      options: parsed.options,
      recommended_option_id: parsed.recommended_option_id,
      default_option_id: parsed.default_option_id,
      channel: parsed.channel,
      priority: parsed.priority,
      status: "pending",
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + parsed.timeout_minutes * 60_000).toISOString()
    };

    await this.store.save(decision);
    const channel = this.channels[parsed.channel];
    if (!channel) {
      throw new Error(`Channel is not configured: ${parsed.channel}`);
    }

    const sent = await channel.send(decision);
    if (sent.message_ref) {
      return this.store.update(decision.request_id, (current) => ({
        ...current,
        message_ref: sent.message_ref
      }));
    }

    return decision;
  }

  async get(requestId: string): Promise<DecisionRequest> {
    const decision = await this.store.get(requestId);
    if (!decision) {
      throw new Error(`Decision request not found: ${requestId}`);
    }

    if (decision.status === "pending" && Date.parse(decision.expires_at) <= Date.now()) {
      return this.store.update(requestId, (current) => ({
        ...current,
        status: "expired",
        selected_option_id: current.default_option_id,
        source: current.default_option_id ? "default" : current.source
      }));
    }

    return decision;
  }

  async wait(
    requestId: string,
    maxWaitSeconds = 30,
    pollIntervalSeconds = 2
  ): Promise<DecisionRequest> {
    const deadline = Date.now() + Math.min(maxWaitSeconds, 120) * 1000;
    let current = await this.get(requestId);

    while (current.status === "pending" && Date.now() < deadline) {
      const nextPoll = Math.min(pollIntervalSeconds * 1000, Math.max(0, deadline - Date.now()));
      if (nextPoll <= 0) break;
      await sleep(nextPoll);
      current = await this.get(requestId);
    }

    return current;
  }

  async answer(
    requestId: string,
    optionId: string,
    note: string | undefined,
    source: DecisionSource
  ): Promise<DecisionRequest> {
    const current = await this.get(requestId);
    if (current.status !== "pending") {
      throw new Error(`Decision request is not pending: ${requestId}`);
    }
    if (!current.options.some((option) => option.id === optionId)) {
      throw new Error(`Unknown option id for ${requestId}: ${optionId}`);
    }

    return this.store.update(requestId, (decision) => ({
      ...decision,
      status: "answered",
      selected_option_id: optionId,
      note,
      answered_at: new Date().toISOString(),
      source
    }));
  }

  async cancel(requestId: string, reason: string): Promise<DecisionRequest> {
    const current = await this.get(requestId);
    if (current.status !== "pending") {
      throw new Error(`Decision request is not pending: ${requestId}`);
    }

    return this.store.update(requestId, (decision) => ({
      ...decision,
      status: "cancelled",
      note: reason,
      cancelled_at: new Date().toISOString()
    }));
  }

  async list(filter: { status?: DecisionStatus; limit?: number } = {}): Promise<DecisionRequest[]> {
    const decisions = await this.store.list(filter);
    return Promise.all(decisions.map((decision) => this.get(decision.request_id)));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
