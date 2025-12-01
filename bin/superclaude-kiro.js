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
  .option('-i, --interactive', 'Force interactive mode for MCP selection')
  .option('--no-interactive', 'Skip interactive prompts (use defaults)')
  .option('--minimal', 'Install only core MCP servers (no prompts)')
  .option('--with-morph', 'Include MorphLLM Fast Apply (prompts for API key)')
  .option('--morph-api-key <key>', 'Include MorphLLM with this API key (for CI/CD)')
  .action(install);

program
  .command('update')
  .description('Update SuperClaude to latest version')
  .option('--with-morph', 'Add MorphLLM during update (prompts for API key)')
  .option('--morph-api-key <key>', 'Add MorphLLM with this API key during update')
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
