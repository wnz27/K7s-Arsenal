import { describe, expect, it } from "vitest";
import { AskDecisionInputSchema, WaitDecisionInputSchema } from "../src/schemas.js";

describe("decision input schemas", () => {
  it("accepts a valid decision request and applies defaults", () => {
    const parsed = AskDecisionInputSchema.parse({
      project: "K7s Arsenal",
      question: "Use Feishu callback app or console fallback first?",
      options: [
        { id: "feishu", label: "Feishu first" },
        { id: "console", label: "Console first" }
      ],
      recommended_option_id: "console",
      timeout_minutes: 30
    });

    expect(parsed.channel).toBe("console");
    expect(parsed.priority).toBe("normal");
  });

  it("rejects an unknown recommended option", () => {
    expect(() =>
      AskDecisionInputSchema.parse({
        project: "K7s Arsenal",
        question: "Pick one",
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" }
        ],
        recommended_option_id: "c"
      })
    ).toThrow(/recommended_option_id/);
  });

  it("rejects duplicate option ids", () => {
    expect(() =>
      AskDecisionInputSchema.parse({
        project: "K7s Arsenal",
        question: "Pick one",
        options: [
          { id: "a", label: "A" },
          { id: "a", label: "A again" }
        ]
      })
    ).toThrow(/duplicate option id/);
  });

  it("caps wait duration", () => {
    expect(() =>
      WaitDecisionInputSchema.parse({
        request_id: "req_abc",
        max_wait_seconds: 121
      })
    ).toThrow(/max_wait_seconds/);
  });
});
