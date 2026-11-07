# Security

## Keep these private
| File | Contains |
|---|---|
| `.env` | Your Canvas access token |
| Your MCP client's config file | Your Canvas token too, if you put it there instead of in `.env` |

`.env` is listed in `.gitignore`. If your token is ever exposed, delete it in *Canvas → Account → Settings → Approved Integrations*, then create a new one and put it in `.env`.

## What this edition does *not* do
- It doesn't listen on any network port. Your AI app starts it as a child process and talks to it through a private pipe (stdio).
- It doesn't send your token anywhere except the Canvas address in `CANVAS_BASE_URL`. Every request is checked first, and files stored on other hosts are fetched without it.
- It doesn't save downloads outside `CANVAS_DOWNLOAD_DIR`, or upload `.env` files, keys and sign-in files.

## What confirmation does and doesn't do
Text in Canvas is written by other people and reaches your AI app, so a post or file could try to talk the AI into doing something. This server limits what the AI can do either way: the checks above always apply, and it can't reach quiz-taking endpoints.

If your AI app can ask you directly, this server always makes it ask. If it can't, the AI gets a preview and a one-time token. That token stops a stale or changed request, but the AI receives it, so it can't prove you said yes. For those apps, your app's own "ask before running" setting is what keeps you in control, so leave it on for tools that send, submit, upload or delete.

## Reporting a vulnerability
Please open a private [security advisory](../../security/advisories/new) rather than a public issue.
