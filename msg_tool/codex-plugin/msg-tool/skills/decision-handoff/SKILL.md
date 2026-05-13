---
name: decision-handoff
description: Use when agent work is blocked by a user decision that can be summarized into concrete options.
---

# Decision Handoff

When work is blocked by human choice:

1. Decide if the question is truly blocking. If safe progress remains, continue that work first.
2. Summarize the decision in one concise question.
3. Provide 2-5 mutually exclusive options.
4. Mark one recommended option when evidence supports it.
5. Include impact and risk, not full source code or secrets.
6. Call `msg_tool_ask_user_decision`.
7. Store `request_id` in working notes.
8. Continue non-conflicting work while pending.
9. If blocked, call `msg_tool_wait_for_decision` with a bounded wait.
10. On answer, follow the selected option and mention it in the final response.
11. On expiry with a default option, follow the default and mention expiry.
12. On expiry without a default option, stop and ask in chat.
