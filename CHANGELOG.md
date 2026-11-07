# Changelog

All notable changes to `canvas-lms-mcp-local`. The tools are shared with the Remote Edition
([canvas-lms-mcp-remote](https://github.com/Fireiscoolsolo/canvas-lms-mcp-server)), so most tool changes appear in both changelogs.

## Unreleased

### Security
- **Your Canvas token only goes to Canvas.** Every request now passes one check, so no tool can send the token to another address, whether that address came from the model, a next-page link, a file record or an upload. Files stored on another host are fetched without it. `download_submission_attachment` only takes addresses on your Canvas. If your school uses a second address for Canvas, use that one in `CANVAS_BASE_URL`.
- **The quiz block can't be spelled around.** It now runs on the final address, for every tool and every write method.
- **Requests stay inside the Canvas API.** A path can't climb out of `/api/v1`, and endpoints that hand out sign-in links or tokens, or add a contact method to your account, are refused.
- **An ID can only be an ID.** A value with `/`, `\`, `?`, `#` or `%` in it is refused, so it can't turn a harmless tool into a request to a different endpoint. Canvas's own forms such as `self` and `sis_course_id:BIO-101` still work.
- **Settings that restrict the server can't fail open.** `CANVAS_ALLOW_WRITES` now understands `false`, `0`, `no` and `off` in any case, and `CANVAS_PROFILE` ignores stray spaces. A value it can't read now means the safe choice, and every Canvas tool says what to fix instead of carrying on with everything switched on.
- A name in `CANVAS_TOOLS` or `CANVAS_DISABLE_TOOLS` that matches nothing is now reported in the log and in `get_server_config`.

## 1.2.1

### Fixed
- **A slow DNS lookup no longer breaks new connections.** On some computers the system's lookup takes longer than the 10 seconds Node allows for a new connection, every time. If it hasn't answered within a second, the server now asks the DNS server directly too and uses the first answer.
- **A lost connection no longer fails a submission or upload.** When a connection never opened, nothing reached Canvas, so every request is now tried again, not only reads. Requests that may have reached Canvas are still never repeated, so nothing is submitted twice.
- **Uploads and downloads retry.** The upload slot request, the storage upload and file downloads now retry lost connections. The storage upload also has a time limit now.
- **Errors say what failed.** Upload errors name the step, the host and the error code, and the school-address hint only appears for the school's own address. Signed upload addresses are never shown.
- **Tool failures are logged**, with the time, tool, step, host and error code, so they can be traced afterwards. The token and signed addresses are left out.
- A missing file's error names the computer running the server. If a submission fails after its upload, the error says to check `get_my_submission` first.

### New
- `doctor` has a **Network** section: how long DNS takes, and whether a new secure connection opens to each of the school's addresses.
- `CANVAS_IP_FAMILY=4` (or `6`) uses only that kind of address.

## 1.2.0

### New tools (237 in total, up from 211)
- **Planner:** `list_planner_items`, `list_planner_notes`, `create_planner_note`, `update_planner_note`, `delete_planner_note`,
  `mark_planner_item_done` and `dismiss_planner_item`, which check items off your Canvas To Do list.
- **Calendars:** `get_calendar_feed_url` (subscribe in Google, Apple or Outlook) and `export_deadlines_ics` (an .ics file of deadlines with reminders).
- **Daily briefing:** `daily_briefing`: today's classes, what's due today and tomorrow, missing work, new grades, unread announcements and messages.
- **Study plans:** `study_plan` proposes study blocks before each deadline around your calendar; `schedule_study_plan` adds them to your Canvas calendar or planner.
- **Assignments and grades:** `assignment_brief` (instructions, rubric, late policy, linked files and status in one call) and
  `final_grade_scenarios` (projected final grade and the average you need for each letter, with group weights and the course's own cutoffs).
- **Courses:** `course_contacts` (teachers and TAs, office hours from the syllabus, sign-up slots).
- **End of term:** `semester_wrap_up` and `export_all_courses`.
- **Canvas features:** `list_global_announcements`, `dismiss_global_announcement`, `mark_announcement_read`, `mark_all_announcements_read`,
  `list_notification_categories`, `update_notification_preference`, `list_eportfolios`, `get_eportfolio_pages` and `submit_annotation_assignment`.
- `list_announcements` can show only unread ones.
- `diff_since_last_check` remembers when you last asked, so "what's new?" works without a date.

### Better answers
- Canvas pages, assignment instructions and announcements come back as clean text that keeps headings, links, lists and tables.
- Dates read like "Fri, Nov 7, 11:59 PM (in 2 days)" in your time zone.
- Long lists come one page at a time (`limit` and `page`) and say when there is more; very long answers are trimmed with a note.
- Canvas errors are explained in plain English with the fix, for example an expired token versus a feature your school turned off.
- In the token's last week, answers carry a heads-up so the assistant can tell you before Canvas stops working.
- The client slows down as Canvas's rate limit runs low, retries safely (writes are never sent twice), and gives up after 60 seconds instead of hanging.

### Works better with AI apps
- Apps that support it ask you directly before anything is posted, submitted or sent. Others still get the dry run, then `confirm=true`.
- Long tools (bulk downloads, course exports, the semester snapshot, searching every course) report progress.
- `get_all_grades`, `list_upcoming_assignments` and `daily_briefing` return structured data as well as text.
- Downloaded files come back as links the app can open.
- Tool hints were reviewed for every tool (read-only, destructive, repeatable).
- Six new prompts: Daily briefing, Plan my study blocks, Start this assignment, Am I on track to pass?, Draft an email to my professor, and Semester wrap-up.
- `CANVAS_TOOLS` and `CANVAS_DISABLE_TOOLS` pick which tool groups or tools are served, for apps that struggle with many tools.

### Setup
- **One-click Claude Desktop extension** (`canvas-lms.mcpb` on the releases page): open it, then enter your school address and token.
- **`npx canvas-lms-mcp-local setup`** sets Canvas up in Claude Desktop, the ChatGPT desktop app, Claude Code, Cursor, VS Code, Windsurf,
  Gemini CLI and LM Studio, on Windows, macOS and Linux. Old settings are backed up first.
- **`npx canvas-lms-mcp-local doctor`** checks Node, each app's settings and the token, and says how to fix problems.
- **`npx canvas-lms-mcp-local print-config <app>`** prints a snippet to paste.
- The token can live in Windows Credential Manager, the macOS Keychain or the Linux keyring (`CANVAS_TOKEN_STORE=keychain`),
  or in a file (`CANVAS_API_TOKEN_FILE`), instead of in each app's settings.
- `--version` and `--help`.
- Downloads now go to Downloads/Canvas in your home folder instead of inside npx's cache.
- The PDF and Office readers load the first time a file needs them, so the server starts as quickly as before (about 0.2 s) despite 26 more tools.

### Safety
- File names from Canvas are cleaned before saving, so a file can never be written outside the download folder.
- Submission comments, rubric comments, profile bios and inbox previews are fenced as text other people wrote.
- Tokens and other secrets are removed from log lines.

### For maintainers
- The tools live in `core/`, shared with the Remote Edition through `npm run sync-core`.
- Tests run every tool against a fake Canvas, with no token needed, on Windows and Linux with Node 18 to 24, plus a dependency audit.
- `.github/workflows/publish.yml` can publish to npm with provenance and to the MCP Registry from GitHub Actions.

## 1.1.3
- README: setting up the ChatGPT desktop app.

## 1.1.2
- README links the Remote Edition website.

## 1.1.1
- Points Windows users to the free setup app; website link in the MCP Registry entry.

## 1.1.0
- Read course files (PDF, Word, PowerPoint, text), GPA calculator, prompts and attachable Canvas items.

## 1.0.0 to 1.0.3
- First releases: 211 student tools over stdio.
