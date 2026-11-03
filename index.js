#!/usr/bin/env node
/**
 * Canvas LMS MCP Server, Local Edition
 * ------------------------------------
 * A student-focused MCP server for the Canvas LMS REST API. The tools themselves live in core/ (shared with the
 * Remote Edition); this file runs them over stdio.
 *
 * Config: environment variables, or a .env next to this file. See core/config.js for the full list; the main ones:
 *   CANVAS_API_TOKEN     Personal access token (Canvas > Settings > New Access Token)
 *                        (or CANVAS_API_TOKEN_FILE, or CANVAS_TOKEN_STORE=keychain)
 *   CANVAS_BASE_URL      e.g. https://yourschool.instructure.com
 *   CANVAS_DOWNLOAD_DIR  Where download tools save files. Default: Downloads/Canvas in your home folder
 *
 * Design notes:
 *   - Local stdio transport: MCP clients (desktop apps, CLIs) launch this file directly and talk to it over
 *     stdin/stdout. Nothing listens on a port and nothing is reachable from the network. stdout carries protocol
 *     frames only, so all logging goes to stderr.
 *   - With arguments (setup, doctor, print-config, --version, --help) it is a command-line tool instead; see cli.js.
 *     MCP clients start it with no arguments.
 *   - .env resolves next to this file, not the working directory, because MCP clients launch servers from their
 *     own install directory.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2).filter((a) => a !== '--stdio');

/** Downloads/Canvas in the home folder, so files don't end up inside npx's cache. */
function defaultDownloadDir() {
  const downloads = path.join(os.homedir(), 'Downloads');
  return fs.existsSync(downloads) ? path.join(downloads, 'Canvas') : path.join(SCRIPT_DIR, 'canvas-downloads');
}

if (args.length) {
  const { runCli } = await import('./cli.js');
  process.exitCode = await runCli(args);
} else {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: path.join(SCRIPT_DIR, '.env'), quiet: true });
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { createCanvasServer } = await import('./core/index.js');
  const { defaultStateDir } = await import('./core/state.js');

  const log = (line) => process.stderr.write(`[canvas-mcp] ${line}\n`);
  const version = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, 'package.json'), 'utf8')).version;
  const canvas = createCanvasServer({
    env: process.env,
    version,
    defaultDownloadDir: defaultDownloadDir(),
    stateDir: defaultStateDir(),
    log,
    missingTokenHelp: 'Add it to your AI app\'s Canvas settings, or run: npx canvas-lms-mcp-local setup. On Windows, the free Canvas MCP Installer Assistant can set it up for you: https://fireiscoolsolo.github.io/canvas-lms-mcp-local/app/',
  });

  process.on('uncaughtException', (e) => canvas.log(`uncaught: ${e.stack || e.message}`));
  process.on('unhandledRejection', (e) => canvas.log(`unhandled rejection: ${e?.stack || e}`));

  canvas.start();
  // stdio: the MCP client owns this process and talks to it over stdin/stdout. Exits when the client closes the pipe.
  await canvas.server.connect(new StdioServerTransport());
  canvas.log('ready on stdio');
}
