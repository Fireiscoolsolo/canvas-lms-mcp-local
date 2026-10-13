# Security

## Keep these private
| File | Contains |
|---|---|
| `.env` | Your Canvas access token |
| Your MCP client's config file | Your Canvas token too, if you put it there instead of in `.env` |

`.env` is listed in `.gitignore`. If your token is ever exposed, delete it in *Canvas → Account → Settings → Approved Integrations*, then create a new one and put it in `.env`.

## What this edition does *not* do
- It doesn't listen on any network port. Your AI app starts it as a child process and talks to it through a private pipe (stdio).
- It doesn't send your token anywhere except your school's Canvas server, over HTTPS.

## Reporting a vulnerability
Please open a private [security advisory](../../security/advisories/new) rather than a public issue.
