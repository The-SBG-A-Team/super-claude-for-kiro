#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLAUDE_COMMANDS = path.join(os.homedir(), '.claude', 'commands', 'sc');
const SOURCE_DIR = path.join(__dirname, '..', 'source');

// Colors
const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

function log(color, prefix, message) {
  console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

async function syncFromClaude() {
  console.log('');
  log(colors.blue, 'SYNC', 'Syncing from Claude Code...');
  console.log('');

  // Check if Claude commands directory exists
  if (!await fs.pathExists(CLAUDE_COMMANDS)) {
    log(colors.red, 'ERROR', `Claude commands not found at: ${CLAUDE_COMMANDS}`);
    console.log('');
    log(colors.yellow, 'HELP', 'Make sure SuperClaude is installed in Claude Code:');
    log(colors.gray, 'INFO', '  ~/.claude/commands/sc/*.md');
    console.log('');
    process.exit(1);
  }

  // Ensure source directory exists
  await fs.ensureDir(SOURCE_DIR);

  // Copy all .md files
  const files = await fs.readdir(CLAUDE_COMMANDS);
  let count = 0;

  for (const file of files) {
    if (file.endsWith('.md')) {
      await fs.copy(
        path.join(CLAUDE_COMMANDS, file),
        path.join(SOURCE_DIR, file)
      );
      log(colors.gray, 'COPY', file);
      count++;
    }
  }

  console.log('');
  log(colors.green, 'DONE', `Synced ${count} files from Claude Code`);
  console.log('');
  log(colors.yellow, 'NEXT', 'Run: npm run build');
  console.log('');
}

syncFromClaude().catch(error => {
  log(colors.red, 'ERROR', error.message);
  process.exit(1);
});
