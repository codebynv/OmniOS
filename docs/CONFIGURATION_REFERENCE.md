# Configuration Reference

Maintain a reference for each runtime setting.

| Field | What to document |
|---|---|
| Name | Exact environment variable or setting |
| Purpose | Behavior it controls |
| Required | Whether startup depends on it |
| Example | Safe placeholder value |
| Default | Actual default, if one exists |
| Sensitive | Whether it contains a secret |

Keep this table aligned with the implementation. Never publish production credentials or invent defaults that the application does not use.