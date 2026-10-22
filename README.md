> [!TIP]
> **Want it on your phone, on the web, or across several computers?** Go to the **[🌐 Remote Edition →](https://github.com/Fireiscoolsolo/canvas-lms-mcp-server)**. It has the same 209 tools, served over a password-protected ngrok tunnel with automatic failover between computers.

<div align="center">

# 💻 Canvas LMS MCP: Local Edition

**Use Canvas from your AI assistant on your own computer. No tunnel, no passwords, no background service.**

209 tools · One config file · Nothing exposed to the internet

[![npm](https://img.shields.io/npm/v/canvas-lms-mcp-local?logo=npm&color=CB3837)](https://www.npmjs.com/package/canvas-lms-mcp-local)
[![npm downloads](https://img.shields.io/npm/dt/canvas-lms-mcp-local?label=npm%20downloads&logo=npm&color=CB3837)](https://www.npmjs.com/package/canvas-lms-mcp-local)
[![npm downloads per month](https://img.shields.io/npm/dm/canvas-lms-mcp-local?label=npm%2Fmonth&color=CB3837)](https://npm-stat.com/charts.html?package=canvas-lms-mcp-local)
[![Release downloads](https://img.shields.io/github/downloads/Fireiscoolsolo/canvas-lms-mcp-local/total?label=release%20downloads&logo=github)](https://github.com/Fireiscoolsolo/canvas-lms-mcp-local/releases)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-stdio-2563EB)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Website](https://img.shields.io/badge/docs-website-0EA5E9)](https://fireiscoolsolo.github.io/canvas-lms-mcp-local/)

[Website](https://fireiscoolsolo.github.io/canvas-lms-mcp-local/) · [Quick start](#-quick-start) · [Configuration](#%EF%B8%8F-configuration) · [Tools](#-tools) · [Troubleshooting](#-troubleshooting)

</div>

<p align="center"><img src="https://fireiscoolsolo.github.io/canvas-lms-mcp-local/demo.svg" width="760" alt="Example chat: asking what score is needed on the final and what's due this week (sample data)"></p>

---

## 🤔 Local or Remote?

| | 💻 **Local** (this repo) | 🌐 [**Remote**](https://github.com/Fireiscoolsolo/canvas-lms-mcp-server) |
|---|---|---|
| Works with | Desktop and command-line MCP clients **on this computer** | Any MCP client that supports remote servers, **on any device** |
| When it runs | Only while your AI app is open, because the app starts it | Always on, in the background |
| You need | Node.js and a Canvas token | Node.js, a Canvas token, an ngrok account and a password |
| Internet exposure | **None**: no port is opened | Public HTTPS address, password-protected |
| Multiple computers | Install it separately on each one | Built-in automatic failover between computers |
| Setup time | About 5 minutes | About 15 minutes, plus about 5 per extra computer |

## ✨ Highlights

- **📊 Grade intelligence**: `what_if_grade`, `compute_needed_score`, `grade_impact_ranking`, full weighted breakdowns
- **📅 Planning**: `get_week_ahead`, `semester_snapshot`, `study_priority_ranking`, cross-course missing work in one call
- **📝 Submissions**: submit text, URLs and files, with a dry-run preview first
- **💬 Discussions & inbox**: read whole threads in one request and message instructors
- **📁 Content**: files, pages, modules, lecture captions and full `.imscc` course export

## 🧭 How it works

```
 Your AI app (MCP client)      ──stdio──►  node index.js  ──HTTPS──►  your school's Canvas API
        (starts the server)              (209 tools, runs only
                                          while your app is open)
```

No web server, no ports, nothing to keep running. Your AI app starts the server when it opens and stops it when it closes.

## 🚀 Quick start

**You need:** [Node.js 18+](https://nodejs.org) and a Canvas account. There's nothing to download yourself: your AI app fetches the server with `npx`.

### 1. Create a Canvas access token
In Canvas, go to **Account → Settings → Approved Integrations → + New Access Token**. Canvas only shows the token once, so copy it right away. Student tokens usually expire after 30–120 days.

### 2. Add it to your AI app

<details open>
<summary><b>Desktop apps</b></summary>

1. Open your app's MCP config file. It's usually under **Settings → Developer** or **Settings → MCP servers**, and most apps use an `mcpServers` JSON block.
2. Add this `canvas` entry with your token and school address (also in [`mcp_config.example.json`](mcp_config.example.json)):

   ```json
   {
     "mcpServers": {
       "canvas": {
         "command": "npx",
         "args": ["-y", "canvas-lms-mcp-local"],
         "env": {
           "CANVAS_API_TOKEN": "your_token_here",
           "CANVAS_BASE_URL": "https://yourschool.instructure.com"
         }
       }
     }
   }
   ```

3. **Fully quit the app**: on Windows, right-click the tray icon and choose **Quit**; on macOS, press ⌘Q. Then reopen it. Closing the window isn't enough.
</details>

<details>
<summary><b>Command-line clients</b></summary>

Register this command as a **stdio** MCP server named `canvas`, with `CANVAS_API_TOKEN` and `CANVAS_BASE_URL` set in its environment:

```bash
npx -y canvas-lms-mcp-local
```

Then check your client's MCP status to confirm it's connected.
</details>

### 3. Try it
Ask your assistant: **"Run test_connection."** It checks your identity, courses, planner, inbox and missing submissions, and reports any features your school has disabled.

Then try: *"What's due this week?"*, *"What do I need on the final to get a B?"* or *"Which missing assignments hurt my grade the most?"*

<details>
<summary><b>Prefer running from source?</b></summary>

```bash
git clone https://github.com/Fireiscoolsolo/canvas-lms-mcp-local.git
cd canvas-lms-mcp-local
npm install
```

Copy `.env.example` to `.env` **in the same folder as `index.js`**, fill in your token and school address, then point your config at the file instead of npx:

```json
{ "mcpServers": { "canvas": { "command": "node", "args": ["C:/Users/YOUR-NAME/Documents/canvas-lms-mcp-local/index.js"] } } }
```

Forward slashes work on Windows. On macOS, the path looks like `/Users/you/canvas-lms-mcp-local/index.js`. On Windows, make sure the file is named `.env`, not `.env.txt`. To check, turn on *View → File name extensions* in File Explorer.
</details>

## ⚙️ Configuration

Put settings in the `env` block of your config, as in step 2. If you run from source, you can use `.env` next to `index.js` instead.

| Variable | Required | Default | Description |
|---|:-:|---|---|
| `CANVAS_API_TOKEN` | ✅ | — | Your Canvas personal access token |
| `CANVAS_BASE_URL` | ✅ | — | e.g. `https://yourschool.instructure.com` |
| `CANVAS_ALLOW_WRITES` | | `true` | `false` = read-only mode |
| `CANVAS_PROFILE` | | `full` | `core` = curated subset of tools |
| `CANVAS_CACHE_TTL` | | `60` | Response cache time in seconds |
| `CANVAS_TIMEZONE` | | system | IANA time zone for due-date math |
| `CANVAS_DOWNLOAD_DIR` | | `canvas-downloads` next to `index.js` | Where download tools save files |

## 🧰 Tools

| Group | Count | Highlights |
|---|:-:|---|
| Identity | 24 | `check_token_expiry`, `get_rate_limit_status`, custom-data storage |
| Courses | 16 | permissions, nicknames, favorites |
| Assignments | 12 | `list_missing_submissions`, `get_late_policy` |
| Submissions | 16 | text, URL and file submission, comments, rubric assessments |
| Grades | 13 | `what_if_grade`, `compute_needed_score`, `grade_impact_ranking` |
| Quizzes | 12 | read-only: dates, attempts, reviews |
| Discussions | 17 | `get_full_topic_view`, replies, ratings |
| Inbox | 14 | messaging, `find_recipients`, threads |
| Calendar | 11 | events, office-hours booking |
| Content | 33 | files, pages, modules, captions, `.imscc` export |
| Groups | 11 | group workspaces |
| Rubrics | 11 | peer reviews |
| Search | 3 | `smart_search` with keyword fallback |
| Planning | 11 | `get_week_ahead`, `semester_snapshot`, `study_priority_ranking` |
| Meta | 4 | `raw_canvas_request` for any endpoint not listed above |

## 🔐 Security

- **Nothing is exposed:** the server doesn't listen on any port. Only the app that started it can talk to it, through a private pipe.
- **Confirmation gate:** tools that send, submit, post or delete return a preview first and only act when called with `confirm: true`.
- **Prompt-injection fencing:** text other people wrote is wrapped in `<<<CANVAS_CONTENT>>>` markers and labelled as untrusted.
- **No quiz-taking:** quiz attempt endpoints are deliberately not included.

> **Never commit** `.env`. It's already listed in `.gitignore`. See [SECURITY.md](SECURITY.md).

## 🎓 Responsible use

This is a study and organization tool. It helps you see deadlines, understand your grades and plan your week. It never takes quizzes, and nothing is sent or submitted until you've seen a preview and confirmed it.

- Follow your school's academic integrity and acceptable-use policies. Some schools restrict personal API tokens or third-party tools.
- Want zero risk of accidental changes? Set `CANVAS_ALLOW_WRITES=false` for read-only mode.

## 🛠️ Troubleshooting

| Symptom | Fix |
|---|---|
| Canvas tools don't appear in your app | Check that the config is valid JSON and the path to `index.js` is absolute, then **fully quit** and reopen the app |
| `spawn npx ENOENT` / "npx" not found | Install [Node.js](https://nodejs.org), then restart the app. If it still fails, use the full path as `command`, e.g. `"C:/Program Files/nodejs/npx.cmd"` |
| The first start is slow | `npx` downloads the package the first time. Later starts are fast |
| "CANVAS_API_TOKEN is not set" | Add it to the `env` block of the `canvas` entry in your config. If you run from source, check that `.env` sits next to `index.js` and isn't named `.env.txt` |
| Canvas returns 401 | Your token expired. Create a new one (step 2) |
| Changes to `index.js` don't take effect | Restart your AI app, because tool lists are loaded when it connects |
| Where are the logs? | In your AI app's MCP log folder. Every line from this server starts with `[canvas-mcp]` |

**Known limits:** a student token can't reach admin endpoints, gradebook history, course analytics or quiz statistics. `smart_search` is a Canvas beta feature and often returns 404.

## 📄 License

[MIT](LICENSE). This project isn't affiliated with Instructure.
