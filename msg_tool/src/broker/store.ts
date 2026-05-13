import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { DecisionRequest, DecisionStatus, DecisionStore } from "./types.js";

interface StoreState {
  decisions: DecisionRequest[];
}

export class JsonDecisionStore implements DecisionStore {
  constructor(private readonly filePath = "msg_tool/.state/decisions.json") {}

  async list(filter: { status?: DecisionStatus; limit?: number } = {}): Promise<DecisionRequest[]> {
    const state = await this.readState();
    const decisions = state.decisions
      .filter((decision) => !filter.status || decision.status === filter.status)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    return clone(decisions.slice(0, filter.limit ?? decisions.length));
  }

  async get(requestId: string): Promise<DecisionRequest | undefined> {
    const state = await this.readState();
    const decision = state.decisions.find((item) => item.request_id === requestId);
    return decision ? clone(decision) : undefined;
  }

  async save(decision: DecisionRequest): Promise<void> {
    const state = await this.readState();
    const index = state.decisions.findIndex((item) => item.request_id === decision.request_id);
    if (index >= 0) {
      state.decisions[index] = clone(decision);
    } else {
      state.decisions.push(clone(decision));
    }
    await this.writeState(state);
  }

  async update(
    requestId: string,
    updater: (current: DecisionRequest) => DecisionRequest
  ): Promise<DecisionRequest> {
    const state = await this.readState();
    const index = state.decisions.findIndex((item) => item.request_id === requestId);
    if (index < 0) {
      throw new Error(`Decision request not found: ${requestId}`);
    }

    const updated = updater(clone(state.decisions[index]));
    state.decisions[index] = clone(updated);
    await this.writeState(state);
    return clone(updated);
  }

  private async readState(): Promise<StoreState> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as StoreState;
      return { decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [] };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { decisions: [] };
      }
      throw error;
    }
  }

  private async writeState(state: StoreState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(tmp, this.filePath);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
