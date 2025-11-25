#!/usr/bin/env node
import { program } from 'commander';
import { install, update, uninstall, status } from '../src/cli.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

program
  .name('superclaude-kiro')
  .description('Install SuperClaude Framework for Kiro CLI')
  .version(version);

program
  .command('install')
  .description('Install SuperClaude into Kiro CLI')
  .option('-f, --force', 'Overwrite existing installation')
  .option('--no-mcp', 'Skip MCP server configuration')
  .option('--no-default', 'Do not set superclaude as default agent')
  .action(install);

program
  .command('update')
  .description('Update SuperClaude to latest version')
  .action(update);

program
  .command('uninstall')
  .description('Remove SuperClaude from Kiro CLI')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(uninstall);

program
  .command('status')
  .description('Check SuperClaude installation status')
  .action(status);

program.parse();
