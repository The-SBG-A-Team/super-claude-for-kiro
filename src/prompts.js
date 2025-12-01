import prompts from 'prompts';
import chalk from 'chalk';
import { MCP_SERVERS, CORE_SERVERS } from './mcp-servers.js';

/**
 * Check if running in interactive TTY
 */
export function isInteractive() {
  return process.stdin.isTTY && process.stdout.isTTY;
}

/**
 * Display a header box
 */
function showHeader(title) {
  const line = '─'.repeat(title.length + 4);
  console.log('');
  console.log(chalk.cyan(`┌${line}┐`));
  console.log(chalk.cyan(`│  ${chalk.bold(title)}  │`));
  console.log(chalk.cyan(`└${line}┘`));
  console.log('');
}

/**
 * Prompt user to select which MCP servers to install
 */
export async function selectMcpServers() {
  showHeader('MCP Server Setup');

  const choices = Object.entries(MCP_SERVERS).map(([name, server]) => {
    const apiKeyNote = server.requiresApiKey ? chalk.yellow(' (requires API key)') : '';
    return {
      title: `${server.displayName}${apiKeyNote}`,
      description: server.description,
      value: name,
      selected: server.defaultEnabled
    };
  });

  const response = await prompts({
    type: 'multiselect',
    name: 'servers',
    message: 'Select MCP servers to install',
    choices,
    hint: '- Space to toggle, Enter to confirm',
    instructions: false
  }, {
    onCancel: () => {
      console.log(chalk.yellow('\nInstallation cancelled.'));
      process.exit(0);
    }
  });

  return response.servers || CORE_SERVERS;
}

/**
 * Prompt for MorphLLM API key setup
 */
export async function promptMorphLLMSetup() {
  const server = MCP_SERVERS['morphllm-fast-apply'];

  showHeader('MorphLLM Fast Apply Setup');

  console.log(chalk.white('MorphLLM provides ultra-fast file editing (10,500+ tokens/sec).'));
  console.log(chalk.gray(server.pricing));
  console.log('');
  console.log(chalk.white('Setup steps:'));
  server.setupInstructions.forEach(step => {
    console.log(chalk.gray(`  ${step}`));
  });
  console.log('');

  // Ask if user has an API key
  const hasKey = await prompts({
    type: 'confirm',
    name: 'value',
    message: 'Do you have a MorphLLM API key?',
    initial: false
  }, {
    onCancel: () => {
      return { value: false };
    }
  });

  if (!hasKey.value) {
    console.log('');
    console.log(chalk.cyan('To get your free API key:'));
    console.log(chalk.white(`  1. Sign up at: ${chalk.underline(server.signupUrl)}`));
    console.log(chalk.white(`  2. Get key at: ${chalk.underline(server.apiKeyUrl)}`));
    console.log('');

    const wannaWait = await prompts({
      type: 'confirm',
      name: 'value',
      message: 'Would you like to enter an API key now? (open the URL above first)',
      initial: true
    });

    if (!wannaWait.value) {
      console.log('');
      console.log(chalk.gray('No worries! You can add MorphLLM later by running:'));
      console.log(chalk.cyan('  npx superclaude-kiro install --with-morph'));
      console.log('');
      return null;
    }
  }

  // Prompt for the API key
  const apiKeyResponse = await prompts({
    type: 'password',
    name: 'apiKey',
    message: 'Enter your MorphLLM API key',
    validate: value => {
      if (!value || value.trim().length === 0) {
        return 'API key cannot be empty';
      }
      if (value.trim().length < 10) {
        return 'API key seems too short';
      }
      return true;
    }
  }, {
    onCancel: () => {
      return { apiKey: null };
    }
  });

  if (apiKeyResponse.apiKey) {
    console.log(chalk.green('  API key saved.'));
    return apiKeyResponse.apiKey.trim();
  }

  return null;
}

/**
 * Quick prompt for MorphLLM key when using --with-morph flag
 */
export async function promptMorphApiKeyQuick() {
  const server = MCP_SERVERS['morphllm-fast-apply'];

  console.log('');
  console.log(chalk.cyan.bold('MorphLLM Fast Apply'));
  console.log(chalk.gray(server.pricing));
  console.log('');
  console.log(chalk.white(`Sign up: ${chalk.underline(server.signupUrl)}`));
  console.log(chalk.white(`Get key: ${chalk.underline(server.apiKeyUrl)}`));
  console.log('');

  const response = await prompts({
    type: 'password',
    name: 'apiKey',
    message: 'Enter your MorphLLM API key (or press Enter to skip)',
  });

  if (response.apiKey && response.apiKey.trim().length > 0) {
    return response.apiKey.trim();
  }

  return null;
}

/**
 * Confirm installation with selected servers
 */
export async function confirmInstallation(servers, hasMorph) {
  console.log('');
  console.log(chalk.white('Will install the following MCP servers:'));
  servers.forEach(name => {
    const server = MCP_SERVERS[name];
    const icon = server?.requiresApiKey ? chalk.yellow('*') : chalk.green('✓');
    console.log(`  ${icon} ${server?.displayName || name}`);
  });

  if (hasMorph) {
    console.log(chalk.gray('  * requires API key'));
  }
  console.log('');

  return true; // Auto-confirm for now, can add prompt if needed
}
