import { z } from "zod";

export const DecisionOptionSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  label: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  impact: z.string().max(1000).optional()
});

export const AskDecisionInputObjectSchema = z.object({
    project: z.string().min(1).max(120),
    question: z.string().min(1).max(2000),
    context: z.string().max(4000).optional(),
    options: z.array(DecisionOptionSchema).min(2).max(8),
    recommended_option_id: z.string().optional(),
    default_option_id: z.string().optional(),
    timeout_minutes: z.number().int().min(5).max(1440).default(60),
    channel: z.enum(["console", "feishu"]).default("console"),
    priority: z.enum(["normal", "urgent"]).default("normal")
  })

export const AskDecisionInputSchema = AskDecisionInputObjectSchema
  .superRefine((value, ctx) => {
    const ids = new Set<string>();
    for (const option of value.options) {
      if (ids.has(option.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: `duplicate option id: ${option.id}`
        });
      }
      ids.add(option.id);
    }

    for (const key of ["recommended_option_id", "default_option_id"] as const) {
      const selected = value[key];
      if (selected && !ids.has(selected)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must match one option id`
        });
      }
    }
  });

export const GetDecisionInputSchema = z.object({
  request_id: z.string().min(1).max(128)
});

export const WaitDecisionInputSchema = z.object({
  request_id: z.string().min(1).max(128),
  max_wait_seconds: z.number().int().min(1).max(120).default(30),
  poll_interval_seconds: z.number().int().min(1).max(10).default(2)
});

export const CancelDecisionInputSchema = z.object({
  request_id: z.string().min(1).max(128),
  reason: z.string().min(1).max(1000)
});

export const ListDecisionsInputSchema = z.object({
  status: z.enum(["pending", "answered", "expired", "cancelled"]).optional(),
  limit: z.number().int().min(1).max(100).default(20)
});

export type AskDecisionInput = z.input<typeof AskDecisionInputSchema>;
export type GetDecisionInput = z.infer<typeof GetDecisionInputSchema>;
export type WaitDecisionInput = z.infer<typeof WaitDecisionInputSchema>;
export type CancelDecisionInput = z.infer<typeof CancelDecisionInputSchema>;
export type ListDecisionsInput = z.infer<typeof ListDecisionsInputSchema>;
