import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);

const KIRO_DIR = path.join(os.homedir(), '.kiro');
const DIST_DIR = path.join(__dirname, '..', 'dist');

export async function installSuperClaude(options = {}) {
  const spinner = ora('Installing SuperClaude for Kiro...').start();

  try {
    // 1. Verify Kiro CLI directory exists
    if (!await fs.pathExists(KIRO_DIR)) {
      spinner.fail(chalk.red('Kiro CLI not found.'));
      console.log(chalk.yellow('\nPlease install Kiro CLI first:'));
      console.log(chalk.cyan('  npm install -g @anthropic-ai/kiro-cli'));
      console.log(chalk.yellow('  or visit: https://kiro.dev/docs/cli/'));
      process.exit(1);
    }

    // 2. Check for existing installation
    const steeringDir = path.join(KIRO_DIR, 'steering', 'superclaude');
    if (await fs.pathExists(steeringDir) && !options.force) {
      spinner.fail(chalk.red('SuperClaude already installed.'));
      console.log(chalk.yellow('\nTo overwrite, run:'));
      console.log(chalk.cyan('  npx superclaude-kiro install --force'));
      process.exit(1);
    }

    // 3. Verify dist directory exists
    if (!await fs.pathExists(DIST_DIR)) {
      spinner.fail(chalk.red('Distribution files not found.'));
      console.log(chalk.yellow('\nPackage may be corrupted. Try reinstalling:'));
      console.log(chalk.cyan('  npm cache clean --force'));
      console.log(chalk.cyan('  npx superclaude-kiro@latest install'));
      process.exit(1);
    }

    // 4. Create directories
    spinner.text = 'Creating directories...';
    await fs.ensureDir(path.join(KIRO_DIR, 'steering', 'superclaude'));
    await fs.ensureDir(path.join(KIRO_DIR, 'agents'));
    await fs.ensureDir(path.join(KIRO_DIR, 'settings'));
    await fs.ensureDir(path.join(KIRO_DIR, 'docs'));

    // 5. Copy steering files
    spinner.text = 'Installing steering files...';
    const steeringSrc = path.join(DIST_DIR, 'steering', 'superclaude');
    if (await fs.pathExists(steeringSrc)) {
      await fs.copy(steeringSrc, path.join(KIRO_DIR, 'steering', 'superclaude'));
    }

    // 6. Copy agents
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

    // 7. Configure MCP servers (optional)
    if (options.mcp !== false) {
      spinner.text = 'Configuring MCP servers...';
      await configureMcpServers();
    }

    // 8. Set default agent (optional)
    if (options.default !== false) {
      spinner.text = 'Setting default agent...';
      await setDefaultAgent();
    }

    // 9. Create version file
    spinner.text = 'Finalizing installation...';
    const pkg = require('../package.json');
    await fs.writeJson(
      path.join(KIRO_DIR, 'docs', 'superclaude-version.json'),
      {
        version: pkg.version,
        installedAt: new Date().toISOString(),
        source: 'npm:superclaude-kiro'
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
    console.log('');
    console.log(chalk.cyan('Quick Start:'));
    console.log('  1. Run: ' + chalk.yellow('kiro-cli chat'));
    console.log('  2. Try: ' + chalk.yellow('#sc-help'));
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('Installation failed: ' + error.message));
    process.exit(1);
  }
}

export async function updateSuperClaude() {
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

    spinner.text = 'Updating SuperClaude...';

    // Perform fresh install with force
    await installSuperClaude({ force: true, mcp: true, default: true });

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

  // Check MCP
  const mcpPath = path.join(KIRO_DIR, 'settings', 'mcp.json');
  if (await fs.pathExists(mcpPath)) {
    const mcpConfig = await fs.readJson(mcpPath);
    const mcpCount = Object.keys(mcpConfig.mcpServers || {}).length;
    console.log(chalk.green(`    ✔ MCP servers (${mcpCount})`));
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

async function configureMcpServers() {
  const mcpPath = path.join(KIRO_DIR, 'settings', 'mcp.json');
  const templatePath = path.join(DIST_DIR, 'mcp', 'mcp-servers.json');

  let existingConfig = { mcpServers: {} };
  if (await fs.pathExists(mcpPath)) {
    existingConfig = await fs.readJson(mcpPath);
  }

  let newServers = { mcpServers: {} };
  if (await fs.pathExists(templatePath)) {
    newServers = await fs.readJson(templatePath);
  }

  // Merge MCP servers (existing takes precedence to preserve user customizations)
  const mergedConfig = {
    mcpServers: {
      ...newServers.mcpServers,
      ...existingConfig.mcpServers
    }
  };

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
