# Decision Handoff Snippet

Use `msg_tool_ask_user_decision` only when work is blocked by a human decision.

Rules:

- Keep options concrete and mutually exclusive.
- Include a recommendation when evidence supports one.
- Include risk and impact, not secrets or full source files.
- Continue non-conflicting work while the request is pending.
- Call `msg_tool_wait_for_decision` only with a bounded wait.
- If expired and a default option exists, continue with the default and report it.
- If expired without a default, stop and ask in chat.
