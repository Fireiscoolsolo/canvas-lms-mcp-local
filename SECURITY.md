# Security

## Supported versions
Security fixes go into the newest release only, so keep it up to date. On Windows, the [Canvas MCP Installer Assistant](https://fireiscoolsolo.github.io/canvas-lms-mcp-local/app/) updates it for you.

| Version | Gets security fixes |
|---|---|
| The newest release | Yes |
| Anything older | No. Update first |

It needs Node.js 18 or newer. Every change is tested on Node 18, 20, 22 and 24, on Windows and Linux.

## Threat model

### What it protects
- **Your Canvas token.** It can do anything you can do in Canvas, so keeping it safe matters most.
- **Your Canvas account**, from changes you didn't ask for: submissions, posts, messages and deletes.
- **Files on your computer**: where downloads go, and what can be uploaded.

### Who it defends against
| Who | What they could try | What stops them |
|---|---|---|
| **Anyone who can write in your Canvas**: teachers, classmates and other users | Hide instructions in a post, page, message, file or name, hoping your AI follows them | Limits that hold whatever the AI is told. The token only goes to your Canvas. Quiz-taking, sign-in and token endpoints are refused. An ID can't change which endpoint a tool calls. Downloads stay in your download folder. Private files can't be uploaded. Changes ask first. Their text is also fenced and labelled as untrusted, which helps the AI but is advice, not a wall |
| **Mistakes** | A typo that leaves writes on when you meant them off, or a download that replaces a file | A setting the server can't read means the safe choice, and the tools say what to fix. A download never replaces a file |

### What it can't protect against
- **Your AI app and the company that runs it.** They see everything the tools return, and can call any tool that is switched on. A confirmation token shows the request didn't change after the preview, not that you said yes. Keep your app's "ask before running" setting on for tools that send, submit, upload or delete. To switch tools off, use `CANVAS_DISABLE_TOOLS`, or `CANVAS_ALLOW_WRITES=false` for read-only.
- **Anyone or anything using your computer account.** Malware, or another person signed in as you, can read `.env` and your AI app's settings.
- **Canvas, your school and Instructure's file storage.** They already hold your data.

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
