import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import {
  MCP_SERVERS,
  CORE_SERVERS,
  MANAGED_SERVERS,
  buildServerConfig
} from './mcp-servers.js';
import {
  isInteractive,
  selectMcpServers,
  promptMorphLLMSetup,
  promptMorphApiKeyQuick,
  confirmInstallation
} from './prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);

const KIRO_DIR = path.join(os.homedir(), '.kiro');
const DIST_DIR = path.join(__dirname, '..', 'dist');

export async function installSuperClaude(options = {}) {
  try {
    // 1. Verify Kiro CLI directory exists (before any prompts)
    if (!await fs.pathExists(KIRO_DIR)) {
      console.log(chalk.red('\n  Kiro CLI not found.'));
      console.log(chalk.yellow('\n  Please install Kiro CLI first:'));
      console.log(chalk.cyan('    npm install -g @anthropic-ai/kiro-cli'));
      console.log(chalk.yellow('    or visit: https://kiro.dev/docs/cli/'));
      process.exit(1);
    }

    // 2. Check for existing installation (before any prompts)
    const steeringDir = path.join(KIRO_DIR, 'steering', 'superclaude');
    if (await fs.pathExists(steeringDir) && !options.force) {
      console.log(chalk.red('\n  SuperClaude already installed.'));
      console.log(chalk.yellow('\n  To overwrite, run:'));
      console.log(chalk.cyan('    npx superclaude-kiro install --force'));
      process.exit(1);
    }

    // 3. Verify dist directory exists
    if (!await fs.pathExists(DIST_DIR)) {
      console.log(chalk.red('\n  Distribution files not found.'));
      console.log(chalk.yellow('\n  Package may be corrupted. Try reinstalling:'));
      console.log(chalk.cyan('    npm cache clean --force'));
      console.log(chalk.cyan('    npx superclaude-kiro@latest install'));
      process.exit(1);
    }

    // 4. Determine MCP server selection and API keys
    let selectedServers = options.servers || null;
    let apiKeys = options.apiKeys || {};

    // Handle MCP configuration based on options
    if (options.mcp !== false) {
      // If --minimal flag, use only core servers
      if (options.minimal) {
        selectedServers = CORE_SERVERS;
      }
      // If --morph-api-key provided via CLI
      else if (options.morphApiKey) {
        selectedServers = [...CORE_SERVERS, 'morphllm-fast-apply'];
        apiKeys['morphllm-fast-apply'] = options.morphApiKey;
      }
      // If --with-morph flag, prompt for API key
      else if (options.withMorph) {
        selectedServers = [...CORE_SERVERS, 'morphllm-fast-apply'];
        if (isInteractive()) {
          const morphKey = await promptMorphApiKeyQuick();
          if (morphKey) {
            apiKeys['morphllm-fast-apply'] = morphKey;
          } else {
            // User didn't provide key, remove morphllm from selection
            selectedServers = CORE_SERVERS;
            console.log(chalk.gray('\n  Skipping MorphLLM (no API key provided).\n'));
          }
        } else {
          console.log(chalk.yellow('\n  Warning: --with-morph requires interactive mode or --morph-api-key'));
          selectedServers = CORE_SERVERS;
        }
      }
      // If interactive and no specific flags, show selection UI
      else if (options.interactive !== false && isInteractive()) {
        selectedServers = await selectMcpServers();

        // If morphllm was selected, prompt for API key
        if (selectedServers.includes('morphllm-fast-apply')) {
          const morphKey = await promptMorphLLMSetup();
          if (morphKey) {
            apiKeys['morphllm-fast-apply'] = morphKey;
          } else {
            // User didn't provide key, remove morphllm from selection
            selectedServers = selectedServers.filter(s => s !== 'morphllm-fast-apply');
          }
        }

        await confirmInstallation(selectedServers, !!apiKeys['morphllm-fast-apply']);
      }
      // Non-interactive default: core servers only
      else {
        selectedServers = CORE_SERVERS;
      }
    }

    // Start the spinner after all prompts are done
    const spinner = ora('Installing SuperClaude for Kiro...').start();

    // 5. Create directories
    spinner.text = 'Creating directories...';
    await fs.ensureDir(path.join(KIRO_DIR, 'steering', 'superclaude'));
    await fs.ensureDir(path.join(KIRO_DIR, 'agents'));
    await fs.ensureDir(path.join(KIRO_DIR, 'settings'));
    await fs.ensureDir(path.join(KIRO_DIR, 'docs'));

    // 6. Copy steering files
    spinner.text = 'Installing steering files...';
    const steeringSrc = path.join(DIST_DIR, 'steering', 'superclaude');
    if (await fs.pathExists(steeringSrc)) {
      await fs.copy(steeringSrc, path.join(KIRO_DIR, 'steering', 'superclaude'));
    }

    // 7. Copy agents
    spinner.text = 'Installing agents...';
    const agentsSrc = path.join(DIST_DIR, 'agents');
    if (await fs.pathExists(agentsSrc)) {
      const agents = await fs.readdir(agentsSrc);
      for (const agent of agents) {
        if (agent.endsWith('.json')) {
          await fs.copy(
            path.join(agentsSrc, agent),
            path.join(KIRO_DIR, 'agents', agent)
          );
        }
      }
    }

    // 8. Configure MCP servers (with selected servers)
    if (options.mcp !== false && selectedServers) {
      spinner.text = 'Configuring MCP servers...';
      await configureMcpServers(selectedServers, apiKeys);
    }

    // 9. Set default agent (optional)
    if (options.default !== false) {
      spinner.text = 'Setting default agent...';
      await setDefaultAgent();
    }

    // 10. Create version file
    spinner.text = 'Finalizing installation...';
    const pkg = require('../package.json');
    await fs.writeJson(
      path.join(KIRO_DIR, 'docs', 'superclaude-version.json'),
      {
        version: pkg.version,
        installedAt: new Date().toISOString(),
        source: 'npm:superclaude-kiro',
        mcpServers: selectedServers || []
      },
      { spaces: 2 }
    );

    // Count installed files
    const steeringFiles = await countFiles(path.join(KIRO_DIR, 'steering', 'superclaude'), '.md');
    const agentFiles = await countFiles(path.join(KIRO_DIR, 'agents'), '.json', 'sc-');

    spinner.succeed(chalk.green('SuperClaude installed successfully!'));

    console.log('');
    console.log(chalk.gray('  Installed:'));
    console.log(chalk.gray(`    - ${steeringFiles} steering files`));
    console.log(chalk.gray(`    - ${agentFiles + 1} agents`));
    if (selectedServers) {
      console.log(chalk.gray(`    - ${selectedServers.length} MCP servers`));
    }
    console.log('');
    console.log(chalk.cyan('Quick Start:'));
    console.log('  1. Run: ' + chalk.yellow('kiro-cli chat'));
    console.log('  2. Try: ' + chalk.yellow('#sc-help'));
    console.log('');

  } catch (error) {
    console.log(chalk.red('\n  Installation failed: ' + error.message));
    process.exit(1);
  }
}

export async function updateSuperClaude(options = {}) {
  const spinner = ora('Checking for updates...').start();

  try {
    // Check if installed
    const versionFile = path.join(KIRO_DIR, 'docs', 'superclaude-version.json');
    if (!await fs.pathExists(versionFile)) {
      spinner.fail(chalk.red('SuperClaude is not installed.'));
      console.log(chalk.yellow('\nTo install, run:'));
      console.log(chalk.cyan('  npx superclaude-kiro install'));
      process.exit(1);
    }

    // Read existing version info to preserve MCP server selections
    const versionInfo = await fs.readJson(versionFile);
    const existingServers = versionInfo.mcpServers || CORE_SERVERS;

    // Stop this spinner before installSuperClaude starts its own
    spinner.stop();

    // Perform fresh install with force, preserving server selection
    await installSuperClaude({
      force: true,
      mcp: true,
      default: true,
      servers: existingServers,
      interactive: false, // Don't re-prompt during update
      ...options
    });

  } catch (error) {
    spinner.fail(chalk.red('Update failed: ' + error.message));
    process.exit(1);
  }
}

export async function uninstallSuperClaude(options = {}) {
  const spinner = ora('Uninstalling SuperClaude...').start();

  try {
    // Check if installed
    const steeringDir = path.join(KIRO_DIR, 'steering', 'superclaude');
    if (!await fs.pathExists(steeringDir)) {
      spinner.fail(chalk.red('SuperClaude is not installed.'));
      process.exit(1);
    }

    // Remove steering files
    spinner.text = 'Removing steering files...';
    await fs.remove(steeringDir);

    // Remove agents
    spinner.text = 'Removing agents...';
    const agents = ['superclaude.json', 'sc-pm.json', 'sc-implement.json', 'sc-analyze.json'];
    for (const agent of agents) {
      const agentPath = path.join(KIRO_DIR, 'agents', agent);
      if (await fs.pathExists(agentPath)) {
        await fs.remove(agentPath);
      }
    }

    // Remove version file
    spinner.text = 'Cleaning up...';
    await fs.remove(path.join(KIRO_DIR, 'docs', 'superclaude-version.json'));

    // Reset default agent if it was superclaude
    const cliSettingsPath = path.join(KIRO_DIR, 'settings', 'cli.json');
    if (await fs.pathExists(cliSettingsPath)) {
      const settings = await fs.readJson(cliSettingsPath);
      if (settings['chat.defaultAgent'] === 'superclaude') {
        delete settings['chat.defaultAgent'];
        await fs.writeJson(cliSettingsPath, settings, { spaces: 2 });
      }
    }

    spinner.succeed(chalk.green('SuperClaude uninstalled successfully!'));
    console.log('');
    console.log(chalk.gray('  Note: MCP server configurations were preserved.'));
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('Uninstall failed: ' + error.message));
    process.exit(1);
  }
}

export async function getStatus() {
  console.log('');
  console.log(chalk.bold('  SuperClaude for Kiro'));
  console.log(chalk.gray('  ' + '─'.repeat(30)));

  // Check Kiro CLI
  if (!await fs.pathExists(KIRO_DIR)) {
    console.log(chalk.red('  Status:      Not installed (Kiro CLI missing)'));
    console.log('');
    return;
  }

  // Check installation
  const versionFile = path.join(KIRO_DIR, 'docs', 'superclaude-version.json');
  const steeringDir = path.join(KIRO_DIR, 'steering', 'superclaude');

  if (!await fs.pathExists(versionFile) || !await fs.pathExists(steeringDir)) {
    console.log(chalk.yellow('  Status:      Not installed'));
    console.log('');
    console.log(chalk.gray('  To install:'));
    console.log(chalk.cyan('    npx superclaude-kiro install'));
    console.log('');
    return;
  }

  // Read version info
  const versionInfo = await fs.readJson(versionFile);
  const installedDate = new Date(versionInfo.installedAt).toLocaleDateString();

  console.log(chalk.green('  Status:      Installed'));
  console.log(chalk.white(`  Version:     ${versionInfo.version}`));
  console.log(chalk.gray(`  Installed:   ${installedDate}`));
  console.log('');

  // Count components
  const steeringFiles = await countFiles(steeringDir, '.md');
  const agentFiles = await countFiles(path.join(KIRO_DIR, 'agents'), '.json', 'sc-');

  console.log(chalk.gray('  Components:'));
  console.log(chalk.green(`    ✔ Steering files (${steeringFiles})`));
  console.log(chalk.green(`    ✔ Agents (${agentFiles + 1})`));

  // Check MCP servers
  const mcpPath = path.join(KIRO_DIR, 'settings', 'mcp.json');
  if (await fs.pathExists(mcpPath)) {
    const mcpConfig = await fs.readJson(mcpPath);
    const mcpCount = Object.keys(mcpConfig.mcpServers || {}).length;
    const installedServers = versionInfo.mcpServers || [];

    console.log(chalk.green(`    ✔ MCP servers (${mcpCount})`));

    // Show which servers are installed
    if (installedServers.length > 0) {
      console.log(chalk.gray('      Installed:'));
      for (const serverName of installedServers) {
        const server = MCP_SERVERS[serverName];
        const displayName = server?.displayName || serverName;
        console.log(chalk.gray(`        - ${displayName}`));
      }
    }

    // Check if morphllm is configured
    if (mcpConfig.mcpServers?.['morphllm-fast-apply']) {
      const hasApiKey = mcpConfig.mcpServers['morphllm-fast-apply']?.env?.MORPH_API_KEY;
      if (hasApiKey && !hasApiKey.startsWith('${')) {
        console.log(chalk.green('    ✔ MorphLLM API key configured'));
      } else {
        console.log(chalk.yellow('    ○ MorphLLM needs API key'));
      }
    }
  } else {
    console.log(chalk.yellow('    ○ MCP servers (not configured)'));
  }

  // Check default agent
  const cliSettingsPath = path.join(KIRO_DIR, 'settings', 'cli.json');
  if (await fs.pathExists(cliSettingsPath)) {
    const settings = await fs.readJson(cliSettingsPath);
    if (settings['chat.defaultAgent'] === 'superclaude') {
      console.log(chalk.green('    ✔ Default agent: superclaude'));
    } else {
      console.log(chalk.yellow(`    ○ Default agent: ${settings['chat.defaultAgent'] || 'none'}`));
    }
  }

  console.log('');
}

// Helper functions

async function configureMcpServers(selectedServers, apiKeys = {}) {
  const mcpPath = path.join(KIRO_DIR, 'settings', 'mcp.json');

  // Read existing config to preserve user's custom servers
  let existingConfig = { mcpServers: {} };
  if (await fs.pathExists(mcpPath)) {
    existingConfig = await fs.readJson(mcpPath);
  }

  // Build new config from selected servers
  const newServers = {};
  for (const serverName of selectedServers) {
    const apiKey = apiKeys[serverName] || null;
    const config = buildServerConfig(serverName, apiKey);
    if (config) {
      newServers[serverName] = config;
    }
  }

  // Merge: preserve user's custom servers, update managed servers
  const mergedServers = {};

  // First, add all user's non-managed servers
  for (const [name, config] of Object.entries(existingConfig.mcpServers || {})) {
    if (!MANAGED_SERVERS.includes(name)) {
      mergedServers[name] = config;
    }
  }

  // Then add/update selected managed servers
  for (const [name, config] of Object.entries(newServers)) {
    const existingServer = existingConfig.mcpServers?.[name];

    if (existingServer) {
      // Preserve user's env settings (especially API keys) if they exist
      const mergedEnv = {
        ...(config.env || {}),
        ...(existingServer.env || {})
      };

      // But if we have a new API key from this install, use it
      if (apiKeys[name]) {
        const server = MCP_SERVERS[name];
        if (server?.apiKeyEnvVar) {
          mergedEnv[server.apiKeyEnvVar] = apiKeys[name];
        }
      }

      mergedServers[name] = {
        ...config,
        ...(Object.keys(mergedEnv).length > 0 ? { env: mergedEnv } : {})
      };
    } else {
      mergedServers[name] = config;
    }
  }

  const mergedConfig = { mcpServers: mergedServers };

  await fs.ensureDir(path.join(KIRO_DIR, 'settings'));
  await fs.writeJson(mcpPath, mergedConfig, { spaces: 2 });
}

async function setDefaultAgent() {
  const cliSettingsPath = path.join(KIRO_DIR, 'settings', 'cli.json');

  let settings = {};
  if (await fs.pathExists(cliSettingsPath)) {
    settings = await fs.readJson(cliSettingsPath);
  }

  settings['chat.defaultAgent'] = 'superclaude';
  settings['chat.model'] = settings['chat.model'] || 'claude-sonnet-4.5';
  settings['chat.enableThinking'] = settings['chat.enableThinking'] !== false;
  settings['chat.enableTodoList'] = settings['chat.enableTodoList'] !== false;
  settings['chat.enableDelegate'] = settings['chat.enableDelegate'] !== false;

  await fs.ensureDir(path.join(KIRO_DIR, 'settings'));
  await fs.writeJson(cliSettingsPath, settings, { spaces: 2 });
}

async function countFiles(dir, extension, prefix = '') {
  if (!await fs.pathExists(dir)) return 0;

  const files = await fs.readdir(dir);
  return files.filter(f => {
    const matchesExt = f.endsWith(extension);
    const matchesPrefix = prefix ? f.startsWith(prefix) : true;
    return matchesExt && matchesPrefix;
  }).length;
}
