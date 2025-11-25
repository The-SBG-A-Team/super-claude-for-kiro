import { installSuperClaude, updateSuperClaude, uninstallSuperClaude, getStatus } from './installer.js';

export async function install(options) {
  await installSuperClaude({
    force: options.force || false,
    mcp: options.mcp !== false,
    default: options.default !== false
  });
}

export async function update(options) {
  await updateSuperClaude();
}

export async function uninstall(options) {
  await uninstallSuperClaude({
    skipConfirm: options.yes || false
  });
}

export async function status(options) {
  await getStatus();
}
