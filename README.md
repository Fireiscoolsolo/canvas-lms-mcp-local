> [!TIP]
> **Want it on your phone, on the web, or across several computers?** Go to the **[Remote Edition →](https://github.com/Fireiscoolsolo/canvas-lms-mcp-server)** ([website](https://fireiscoolsolo.github.io/canvas-lms-mcp-server/)). It has the same 242 tools, served over a password-protected tunnel with a status page, phone alerts and automatic failover between computers.

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://fireiscoolsolo.github.io/canvas-lms-mcp-local/logo-dark.png">
  <img src="https://fireiscoolsolo.github.io/canvas-lms-mcp-local/logo.png" width="128" alt="Canvas LMS MCP: Local Edition logo">
</picture>

# Canvas LMS MCP: Local Edition

**Use Canvas from your AI assistant on your own computer. No tunnel, no passwords, no background service.**

242 tools · One-command setup · Nothing exposed to the internet

[![npm](https://img.shields.io/npm/v/canvas-lms-mcp-local?logo=npm&color=CB3837)](https://www.npmjs.com/package/canvas-lms-mcp-local)
[![npm downloads](https://img.shields.io/npm/dt/canvas-lms-mcp-local?label=npm%20downloads&logo=npm&color=CB3837)](https://www.npmjs.com/package/canvas-lms-mcp-local)
[![npm downloads per month](https://img.shields.io/npm/dm/canvas-lms-mcp-local?label=npm%2Fmonth&color=CB3837)](https://npm-stat.com/charts.html?package=canvas-lms-mcp-local)
[![Release downloads](https://img.shields.io/github/downloads/Fireiscoolsolo/canvas-lms-mcp-local/total?label=release%20downloads&logo=github)](https://github.com/Fireiscoolsolo/canvas-lms-mcp-local/releases)
[![Tests](https://github.com/Fireiscoolsolo/canvas-lms-mcp-local/actions/workflows/test.yml/badge.svg)](https://github.com/Fireiscoolsolo/canvas-lms-mcp-local/actions/workflows/test.yml)
[![Windows app](https://img.shields.io/badge/Windows%20app-free-5B4BDB?logo=windows&logoColor=white)](https://fireiscoolsolo.github.io/canvas-lms-mcp-local/app/)
[![Glama score](https://glama.ai/mcp/servers/Fireiscoolsolo/canvas-lms-mcp-local/badges/score.svg)](https://glama.ai/mcp/servers/Fireiscoolsolo/canvas-lms-mcp-local)
[![GitHub stars](https://img.shields.io/github/stars/Fireiscoolsolo/canvas-lms-mcp-local?logo=github)](https://github.com/Fireiscoolsolo/canvas-lms-mcp-local/stargazers)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-stdio-2563EB)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Website](https://img.shields.io/badge/docs-website-0EA5E9)](https://fireiscoolsolo.github.io/canvas-lms-mcp-local/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/Fireiscoolsolo/canvas-lms-mcp-local/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

[Website](https://fireiscoolsolo.github.io/canvas-lms-mcp-local/) · [Quick start](#quick-start) · [Configuration](#configuration) · [Tools](#tools) · [Troubleshooting](#troubleshooting) · [Changelog](CHANGELOG.md)

</div>

> [!TIP]
> **On Windows? Skip the terminal.** The free **[Canvas MCP Installer Assistant](https://fireiscoolsolo.github.io/canvas-lms-mcp-local/app/)** sets this up in Claude Desktop, the ChatGPT desktop app and other AI apps with pictures and a check after every step, or does every step for you. **[Download for Windows](https://fireiscoolsolo.github.io/canvas-lms-mcp-local/download/)**

<p align="center"><img src="https://fireiscoolsolo.github.io/canvas-lms-mcp-local/demo.svg" width="760" alt="Example chat: asking what score is needed on the final and what's due this week (sample data)"></p>

---

## Local or Remote?

| | **Local** (this repo) | [**Remote**](https://github.com/Fireiscoolsolo/canvas-lms-mcp-server) |
|---|---|---|
| Works with | Claude Desktop, the ChatGPT desktop app, Claude Code, Cursor, VS Code and other MCP clients **on this computer** | Any MCP client that supports remote servers, **on any device** |
| When it runs | Only while your AI app is open, because the app starts it | Always on, in the background |
| You need | Node.js and a Canvas token | Node.js, a Canvas token, an ngrok or Cloudflare account and a password |
| Internet exposure | **None**: no port is opened | Public HTTPS address, password-protected |
| Multiple computers | Install it separately on each one | Built-in automatic failover between computers |
| Setup time | About 2 minutes with `setup`, or 5 by hand | About 15 minutes, plus about 5 per extra computer |

## Highlights

- **Your day and week**: `daily_briefing`, `get_week_ahead`, `semester_snapshot`, cross-course missing work in one call
- **Planner**: add your own to-do notes, check items off your Canvas To Do list, export deadlines to Google, Apple or Outlook calendars
- **Study plans**: `study_plan` spreads study time before each deadline around your calendar; `schedule_study_plan` puts it on your Canvas calendar
- **Grade intelligence**: `final_grade_scenarios` (what you need for each letter, with group weights), `what_if_grade`, `grade_impact_ranking`, `calculate_gpa`
- **Assignments**: `assignment_brief` gives the instructions, rubric, late policy and linked files in one call
- **Submissions, discussions and inbox**: submit, post and message, always after you confirm (apps that support it ask you directly)
- **Content**: read lecture PDFs, Word docs and slides with `read_course_file`, plus pages, modules, captions and full course export
- **Prompts and attachments**: one-click prompts like *Daily briefing*, *Start this assignment* and *Am I on track to pass?*, and attach a syllabus or assignment to a chat

## How it works

```
 Your AI app (MCP client)      ──stdio──►  node index.js  ──HTTPS──►  your school's Canvas API
        (starts the server)              (242 tools, runs only
                                          while your app is open)
```

No web server, no ports, nothing to keep running. Your AI app starts the server when it opens and stops it when it closes.

## Quick start

> [!NOTE]
> **Rather click than type?** Download the **[Canvas MCP Installer Assistant for Windows](https://fireiscoolsolo.github.io/canvas-lms-mcp-local/download/)**. It walks you through these steps with pictures and checks each one as you go, for both the Local and Remote editions. [See screenshots](https://fireiscoolsolo.github.io/canvas-lms-mcp-local/app/).
>
> Windows may show "Windows protected your PC" because the app isn't code-signed yet. Click **More info**, then **Run anyway**.

**You need:** [Node.js 18+](https://nodejs.org) (22+ to read PDFs) and a Canvas account.

### 1. Create a Canvas access token
In Canvas, go to **Account → Settings → Approved Integrations → + New Access Token**. Canvas only shows the token once, so copy it right away. Student tokens usually expire after 30–120 days.

### 2. Add it to your AI app

<details open>
<summary><b>Easiest: one command (Windows, macOS and Linux)</b></summary>

```bash
npx canvas-lms-mcp-local setup
```

It asks for your school's Canvas address and your token, checks they work, then adds Canvas to the apps you pick: **Claude Desktop, the ChatGPT desktop app, Claude Code, Cursor, VS Code, Windsurf, Gemini CLI and LM Studio**. Your old settings are backed up first. It can also keep the token in Windows Credential Manager, the macOS Keychain or the Linux keyring instead of in each app's settings file.

Afterwards, fully quit and reopen your app (the command tells you how for each one).
</details>

<details>
<summary><b>Claude Desktop: one-click extension</b></summary>

1. Download **`canvas-lms.mcpb`** from the [latest release](https://github.com/Fireiscoolsolo/canvas-lms-mcp-local/releases/latest).
2. Open it (double-click, or drag it into Claude Desktop's **Settings → Extensions**).
3. Click **Install**, then enter your school's Canvas address and your token when Claude asks.

The extension includes everything it needs, so you don't have to install Node.js for it.
</details>

<details>
<summary><b>Desktop apps, by hand</b></summary>

1. Open your app's MCP config file. It's usually under **Settings → Developer** or **Settings → MCP servers**, and most apps use an `mcpServers` JSON block. `npx canvas-lms-mcp-local print-config <app>` prints the exact snippet for each app.
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

   **On a Mac**, an app opened from the Dock may not find `npx`. Open Terminal and run `which npx`. Use what it prints as `"command"` (for example `"/opt/homebrew/bin/npx"`), and add `"PATH": "/opt/homebrew/bin:/usr/bin:/bin"` inside `"env"`, with the folder from `which npx` first. `setup` and `print-config` do this for you.

3. **Fully quit the app**: on Windows, right-click the tray icon and choose **Quit**; on macOS, press ⌘Q. Then reopen it. Closing the window isn't enough.
</details>

<details>
<summary><b>ChatGPT desktop app, by hand</b></summary>

1. Open **Settings → Plugins**, go to the **MCPs** tab, then click **Add → Add MCP server**.
2. Choose **STDIO** and fill in the form. On Windows, each argument goes in its own box:

   | Field | Value |
   |---|---|
   | Name | `canvas` |
   | Command to launch | `cmd` |
   | Arguments | `/c`, `npx`, `-y`, `canvas-lms-mcp-local` |
   | Environment variables | `CANVAS_API_TOKEN` = your token<br>`CANVAS_BASE_URL` = `https://yourschool.instructure.com` |

3. Click **Save**, then start a **new chat**. Chats that were already open don't pick up new tools.
</details>

<details>
<summary><b>Command-line clients</b></summary>

Register this command as a **stdio** MCP server named `canvas`, with `CANVAS_API_TOKEN` and `CANVAS_BASE_URL` set in its environment:

```bash
npx -y canvas-lms-mcp-local
```

For Claude Code, `npx canvas-lms-mcp-local setup --apps claude-code` does it for you. Then check your client's MCP status to confirm it's connected.
</details>

### 3. Try it
Ask your assistant: **"Run test_connection."** It checks your identity, courses, planner, inbox and missing submissions, and reports any features your school has disabled.

Then try: *"Give me my daily briefing"*, *"What do I need on the rest of Biology to get a B?"*, *"Plan my study time for the next two weeks"* or *"Explain the Lab 4 assignment and its rubric."*

If something isn't working, run **`npx canvas-lms-mcp-local doctor`**. It checks Node, each app's settings and your token, and says how to fix what it finds.

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

The tools live in `core/`, which is shared with the Remote Edition: change them here, then run `npm run sync-core` to copy them across. `npm test` runs every tool against a fake Canvas, so no token is needed.
</details>

## Configuration

Put settings in the `env` block of your config, as in step 2. If you run from source, you can use `.env` next to `index.js` instead.

| Variable | Required | Default | Description |
|---|:-:|---|---|
| `CANVAS_API_TOKEN` | Yes* | — | Your Canvas personal access token |
| `CANVAS_API_TOKEN_FILE` | | — | *Or* the path of a file that holds only the token |
| `CANVAS_TOKEN_STORE` | | — | *Or* `keychain`: read the token from Windows Credential Manager, the macOS Keychain or the Linux keyring (`setup` saves it there) |
| `CANVAS_BASE_URL` | Yes | — | e.g. `https://yourschool.instructure.com` |
| `CANVAS_ALLOW_WRITES` | | `true` | `false` (or `0`, `no`, `off`) = nothing in Canvas can change. A value it can't read counts as `false`, and tools say so |
| `CANVAS_PROFILE` | | `full` | Which tools to turn on, by name or number: see [Tool profiles](#tool-profiles). A value it can't read counts as `core`, and tools say what to fix |
| `CANVAS_TOOLS` | | all | Only these tool groups or tools, e.g. `grades,planner,whoami` (for apps that struggle with many tools) |
| `CANVAS_DISABLE_TOOLS` | | — | Leave out these tool groups or tools, e.g. `inbox,groups` |
| `CANVAS_CACHE_TTL` | | `60` | Response cache time in seconds |
| `CANVAS_TIMEZONE` | | system | IANA time zone for dates |
| `CANVAS_DOWNLOAD_DIR` | | `Downloads/Canvas` in your home folder | Where download tools save files. They can't save anywhere outside it |
| `CANVAS_MAX_RESPONSE_CHARS` | | `100000` | Longest answer before it is trimmed |
| `CANVAS_CHANGE_LOG` | | `on` | `off` stops keeping the list of what the server changed in Canvas (`get_change_log`). It keeps IDs only, never what you wrote |
| `CANVAS_IP_FAMILY` | | both | `4` or `6` uses only that kind of address. Worth trying if new connections time out |

\* One of `CANVAS_API_TOKEN`, `CANVAS_API_TOKEN_FILE` or `CANVAS_TOKEN_STORE`.

### Tool profiles

Some AI apps can only handle so many tools, and small local models do better with fewer. A profile turns on just the tools for one kind of work. Put its name or number in the `env` block, such as `"CANVAS_PROFILE": "study"` or `"CANVAS_PROFILE": "3"`, then restart your AI app. `setup --profile study` does it for you.

<!-- profiles:start -->
| Number | Name | What it's for | Tools |
|:-:|---|---|:-:|
| 1 | `essentials` | The daily basics: what's due, your grades, announcements and reading an assignment. Nothing here changes Canvas. Best for small local models. | 24 |
| 2 | `core` | A bit of everything, including turning in work and sending messages. | 49 |
| 3 | `study` | Planning your week and studying: planner, calendar, study plans, course files and pages. | 38 |
| 4 | `grades` | Grades and feedback: scores, what-if, what you need on the final, rubrics and comments. | 31 |
| 5 | `readonly` | Everything that only looks. Nothing in Canvas can change. | 177 |
| 6 | `full` | Every tool. The default. | 242 |
<!-- profiles:end -->

- Not set means `full`: every tool, as before.
- `CANVAS_TOOLS` and `CANVAS_DISABLE_TOOLS` narrow any profile further. They never add a tool the profile leaves out.
- `essentials` and `readonly` never change anything in Canvas, even with `CANVAS_ALLOW_WRITES=true`. `CANVAS_ALLOW_WRITES=false` turns changes off in every profile.
- Ask your AI app "which Canvas tools are switched off?": `search_tools` and `get_server_config` show the profile and how to switch.
- Names other than `full` and `core` need version 1.4.0 or newer. An older version can't read them, so its tools stop and say what to fix. `npx` can keep running an old saved copy: if a new name doesn't work, use **Auto update** in the Installer Assistant, or delete the `_npx` folder inside npm's cache folder (`npm config get cache` shows where), then restart your AI app.

**Which profile for which app.** These limits were checked in November 2026 and can change.

| AI app | Limit on tools | Suggested profile |
|---|---|---|
| VS Code with Copilot | 128 in one chat request ([VS Code docs](https://code.visualstudio.com/docs/agents/run/tools)) | `core` |
| Windsurf | 100 in total, as its docs have long said ([docs](https://docs.devin.ai/desktop/cascade/mcp)) | `core` |
| Cursor | Older docs said only the first 40 reach the agent ([forum](https://forum.cursor.com/t/tools-limited-to-40-total/67976)) | `essentials` |
| LM Studio | No number, but small local models run out of room with many tools ([LM Studio docs](https://lmstudio.ai/docs/app/mcp)) | `essentials` |
| Claude Code | No fixed limit: tool search loads tools only when needed ([docs](https://code.claude.com/docs/en/mcp)) | `full` |
| Claude Desktop, ChatGPT app, Gemini CLI | No documented limit | `full` |

## Tools

| Group | Count | Highlights |
|---|:-:|---|
| Identity | 28 | `list_recent_history`, `check_token_expiry`, notification preferences, custom-data storage |
| Courses | 17 | `course_contacts` (teachers, TAs, office hours), permissions, nicknames |
| Assignments | 13 | `assignment_brief`, `list_missing_submissions`, `get_late_policy` |
| Submissions | 18 | `recent_feedback`, text, URL, file and annotation submission, comments, rubric assessments |
| Grades | 15 | `final_grade_scenarios`, `what_if_grade`, `compute_needed_score`, `grade_impact_ranking`, `calculate_gpa` |
| Quizzes | 12 | read-only: dates, attempts, reviews |
| Discussions | 21 | `get_full_topic_view`, replies, school-wide announcements, mark announcements read |
| Inbox | 14 | messaging, `find_recipients`, threads |
| Calendar | 11 | events, office-hours booking |
| Content | 37 | `next_module_items`, files, pages, modules, captions, ePortfolios, `read_course_file` for PDF, Word and PowerPoint, course export |
| Groups | 11 | group workspaces |
| Rubrics | 11 | peer reviews |
| Search | 3 | `smart_search` with keyword fallback |
| Planner | 12 | `daily_briefing`, planner notes, `mark_planner_item_done`, `study_plan`, `export_deadlines_ics`, calendar feed |
| Planning | 14 | `find_exams`, `get_week_ahead`, `semester_snapshot`, `study_priority_ranking`, `semester_wrap_up`, `export_all_courses` |
| Meta | 5 | `get_change_log`, `raw_canvas_request` for any endpoint not listed above |

Long lists come one page at a time (`limit` and `page`), dates read like "Fri, Nov 7, 11:59 PM (in 2 days)", and Canvas errors are explained with the fix. In your token's last week, answers carry a heads-up so the assistant can remind you to renew it.

### Prompts and attachments

The server also adds these to your AI app's menus. They don't count as tools.

- **Prompts**: *Daily briefing*, *Plan my week*, *Plan my study blocks*, *What did I miss?*, *Start this assignment*, *Prep me for an exam*, *How are my grades?*, *Am I on track to pass?*, *Catch me up on a course*, *Draft an email to my professor*, *Semester wrap-up*, *Quiz me*, *Check my draft*, *Weekly review* and *What does my feedback say?* Each one tells the assistant which tools to use, and course names autocomplete. A prompt only shows up when the [tool profile](#tool-profiles) has every tool it uses.
- **Attachments**: attach a course syllabus, or an assignment due in the next 14 days, to a chat the same way you'd attach a file.

Apps that support MCP prompts and resources, such as Claude Desktop, show them in the **+** menu.

## Security

- **Nothing is exposed:** the server doesn't listen on any port. Only the app that started it can talk to it, through a private pipe.
- **Confirmation gate:** tools that send, submit, post, upload or delete need confirmation. Apps that can ask you directly always do, and nothing the AI sends can skip that. Other apps get a preview and a one-time token that only works for that exact request, for 5 minutes. The token can't prove you agreed, so keep your AI app's own "ask before running" setting on for these tools.
- **Prompt-injection fencing:** text other people wrote (posts, messages, comments, rubric notes) is wrapped in `<<<CANVAS_CONTENT>>>` markers and labelled as untrusted.
- **Your token stays private:** every request is checked, so it can only go to your school's Canvas. It's never written to logs, and can live in your system's password store instead of a config file.
- **Safe downloads:** files only go in your download folder, never replace another file, and have their names cleaned.
- **Private files stay private:** uploads refuse `.env` files, keys, sign-in files, and the folders where browsers and AI apps keep their data.
- **No quiz-taking:** quiz attempt endpoints are deliberately not included, and writes to them are refused for every tool, however the address is written.

> **Never commit** `.env`. It's already listed in `.gitignore`. See [SECURITY.md](SECURITY.md).

## Responsible use

This is a study and organization tool. It helps you see deadlines, understand your grades and plan your week. It never takes quizzes, and nothing is sent or submitted until you've confirmed it.

- Follow your school's academic integrity and acceptable-use policies. Some schools restrict personal API tokens or third-party tools.
- Want to be sure nothing in Canvas changes? Set `CANVAS_ALLOW_WRITES=false` for read-only mode. Downloads still work, into your download folder.

## Troubleshooting

Start with **`npx canvas-lms-mcp-local doctor`**: it checks everything below and says what to fix.

| Symptom | Fix |
|---|---|
| Canvas tools don't appear in your app | Check that the config is valid JSON, then **fully quit** and reopen the app. `setup` writes it for you |
| `spawn npx ENOENT` / "npx" not found | Install [Node.js](https://nodejs.org), then restart the app. On a Mac, run `npx canvas-lms-mcp-local setup` again: it writes the full path to `npx` and a `PATH` the app can use. If it still fails, use the full path as `command`, e.g. `"C:/Program Files/nodejs/npx.cmd"` on Windows or the output of `which npx` on a Mac, or use the Claude Desktop extension, which needs no Node.js |
| The first start is slow | `npx` downloads the package the first time. Later starts are fast |
| "CANVAS_API_TOKEN is not set" | Add it to the `env` block of the `canvas` entry in your config, or run `setup`. If you run from source, check that `.env` sits next to `index.js` and isn't named `.env.txt` |
| "Your Canvas token was rejected" | Your token expired. Create a new one (step 1) and run `setup` again |
| Your app struggles with so many tools | Pick a smaller [tool profile](#tool-profiles), e.g. `CANVAS_PROFILE=essentials` (or `1`). `CANVAS_TOOLS` narrows it further, e.g. `grades,planner,assignments` |
| Reading works but uploads or new connections time out | `doctor`'s Network section times DNS and tests every connection. The server works around a slow DNS lookup by itself, so if a connection still fails, look for a VPN, proxy or firewall |
| Changes to the code don't take effect | Restart your AI app, because tool lists are loaded when it connects |
| Where are the logs? | In your AI app's MCP log folder. Every line from this server starts with `[canvas-mcp]` |

**Known limits:** a student token can't reach admin endpoints, gradebook history, course analytics or quiz statistics. `smart_search` is a Canvas beta feature and often returns 404. Canvas doesn't let other apps add ePortfolio entries.

## License

[MIT](LICENSE). This project isn't affiliated with Instructure.
