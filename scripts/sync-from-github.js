#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure this to your SuperClaude GitHub repo
const GITHUB_REPO = process.env.SUPERCLAUDE_REPO || 'SuperClaude-Org/SuperClaude_Framework';

const SOURCE_DIR = path.join(__dirname, '..', 'source');
const TEMP_DIR = path.join(__dirname, '..', '.temp-github');

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

async function syncFromGithub() {
  console.log('');
  log(colors.blue, 'SYNC', `Syncing from GitHub: ${GITHUB_REPO}`);
  console.log('');

  try {
    // Clone or pull repo
    if (await fs.pathExists(TEMP_DIR)) {
      log(colors.gray, 'GIT', 'Pulling latest changes...');
      execSync('git pull', { cwd: TEMP_DIR, stdio: 'pipe' });
    } else {
      log(colors.gray, 'GIT', 'Cloning repository...');
      execSync(`git clone --depth 1 https://github.com/${GITHUB_REPO}.git "${TEMP_DIR}"`, {
        stdio: 'pipe'
      });
    }

    // Find commands directory (try multiple possible locations)
    const possiblePaths = [
      path.join(TEMP_DIR, 'src', 'superclaude', 'commands'),
      path.join(TEMP_DIR, 'plugins', 'superclaude', 'commands'),
      path.join(TEMP_DIR, 'commands', 'sc'),
      path.join(TEMP_DIR, 'commands'),
      path.join(TEMP_DIR, 'sc')
    ];

    let commandsPath = null;
    for (const p of possiblePaths) {
      if (await fs.pathExists(p)) {
        // Check if it contains .md files
        const files = await fs.readdir(p);
        if (files.some(f => f.endsWith('.md'))) {
          commandsPath = p;
          break;
        }
      }
    }

    if (!commandsPath) {
      log(colors.red, 'ERROR', 'Could not find commands directory in GitHub repo');
      console.log('');
      log(colors.yellow, 'HELP', 'Tried these paths:');
      for (const p of possiblePaths) {
        log(colors.gray, 'PATH', p.replace(TEMP_DIR, '<repo>'));
      }
      console.log('');
      log(colors.yellow, 'TIP', 'Set SUPERCLAUDE_REPO env var to use a different repo');
      console.log('');
      process.exit(1);
    }

    log(colors.gray, 'FOUND', commandsPath.replace(TEMP_DIR, '<repo>'));

    // Ensure source directory exists and is empty
    await fs.emptyDir(SOURCE_DIR);

    // Copy files
    const files = await fs.readdir(commandsPath);
    let count = 0;

    for (const file of files) {
      if (file.endsWith('.md') && file !== 'README.md') {
        await fs.copy(
          path.join(commandsPath, file),
          path.join(SOURCE_DIR, file)
        );
        log(colors.gray, 'COPY', file);
        count++;
      }
    }

    console.log('');
    log(colors.green, 'DONE', `Synced ${count} files from GitHub`);
    console.log('');
    log(colors.yellow, 'NEXT', 'Run: npm run build');
    console.log('');

  } catch (error) {
    log(colors.red, 'ERROR', error.message);
    console.log('');
    log(colors.yellow, 'HELP', 'Make sure git is installed and you have network access');
    console.log('');
    process.exit(1);
  }
}

syncFromGithub().catch(error => {
  log(colors.red, 'ERROR', error.message);
  process.exit(1);
});
