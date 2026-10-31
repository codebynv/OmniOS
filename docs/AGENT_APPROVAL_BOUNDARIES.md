# Agent Approval Boundaries

Classify agent operations by impact before enabling execution.

- Read-only retrieval may run under the user's existing access.
- Reversible edits should show the proposed change and target.
- External messages and financial or destructive actions require explicit approval.
- Approval must be tied to the exact action and parameters.
- Revalidate permissions immediately before execution.
- Report partial completion and failures honestly.

A prior approval must not silently authorize a materially different action.