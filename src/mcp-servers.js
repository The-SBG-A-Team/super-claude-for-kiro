/**
 * MCP Server Definitions for SuperClaude
 *
 * Each server has metadata for the interactive installer:
 * - displayName: Human-readable name
 * - description: Short description for selection UI
 * - requiresApiKey: Whether user needs to provide an API key
 * - defaultEnabled: Pre-selected in interactive mode
 * - config: The actual MCP server configuration
 */

export const MCP_SERVERS = {
  'sequential-thinking': {
    name: 'sequential-thinking',
    displayName: 'Sequential Thinking',
    description: 'Structured reasoning and problem-solving',
    requiresApiKey: false,
    defaultEnabled: true,
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      autoApprove: ['sequentialthinking']
    }
  },

  'context7': {
    name: 'context7',
    displayName: 'Context7',
    description: 'Library documentation lookup',
    requiresApiKey: false,
    defaultEnabled: true,
    config: {
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp'],
      autoApprove: ['resolve-library-id', 'get-library-docs']
    }
  },

  'playwright': {
    name: 'playwright',
    displayName: 'Playwright',
    description: 'Browser automation and testing',
    requiresApiKey: false,
    defaultEnabled: true,
    config: {
      command: 'npx',
      args: ['-y', '@playwright/mcp@latest'],
      autoApprove: [
        'browser_close', 'browser_resize', 'browser_console_messages',
        'browser_handle_dialog', 'browser_evaluate', 'browser_file_upload',
        'browser_fill_form', 'browser_install', 'browser_press_key',
        'browser_type', 'browser_navigate', 'browser_navigate_back',
        'browser_network_requests', 'browser_run_code', 'browser_take_screenshot',
        'browser_snapshot', 'browser_click', 'browser_drag', 'browser_hover',
        'browser_select_option', 'browser_tabs', 'browser_wait_for'
      ]
    }
  },

  'serena': {
    name: 'serena',
    displayName: 'Serena',
    description: 'Semantic code analysis and editing',
    requiresApiKey: false,
    defaultEnabled: true,
    config: {
      command: 'uvx',
      args: [
        '--from', 'git+https://github.com/oraios/serena',
        'serena', 'start-mcp-server',
        '--context', 'ide-assistant',
        '--enable-web-dashboard', 'false',
        '--enable-gui-log-window', 'false'
      ],
      autoApprove: [
        'list_dir', 'find_file', 'search_for_pattern', 'get_symbols_overview',
        'find_symbol', 'find_referencing_symbols', 'replace_symbol_body',
        'insert_after_symbol', 'insert_before_symbol', 'rename_symbol',
        'write_memory', 'read_memory', 'list_memories', 'delete_memory',
        'edit_memory', 'activate_project', 'get_current_config',
        'check_onboarding_performed', 'onboarding', 'think_about_collected_information',
        'think_about_task_adherence', 'think_about_whether_you_are_done', 'initial_instructions'
      ]
    }
  },

  'morphllm-fast-apply': {
    name: 'morphllm-fast-apply',
    displayName: 'MorphLLM Fast Apply',
    description: 'Ultra-fast file editing (10,500+ tokens/sec) - requires API key',
    requiresApiKey: true,
    apiKeyEnvVar: 'MORPH_API_KEY',
    defaultEnabled: false,
    signupUrl: 'https://www.morphllm.com',
    apiKeyUrl: 'https://morphllm.com/dashboard/api-keys',
    pricing: 'Free tier: 500 requests/month. Paid: ~$1/million tokens.',
    setupInstructions: [
      '1. Create a free account at https://www.morphllm.com',
      '2. Get your API key at https://morphllm.com/dashboard/api-keys',
      '3. Paste your API key when prompted'
    ],
    config: {
      command: 'npx',
      args: ['-y', '@morph-llm/morph-fast-apply'],
      autoApprove: ['edit_file']
    }
  }
};

// List of server names that are managed by SuperClaude installer
export const MANAGED_SERVERS = Object.keys(MCP_SERVERS);

// Get core servers (no API key required)
export const CORE_SERVERS = Object.entries(MCP_SERVERS)
  .filter(([_, server]) => !server.requiresApiKey)
  .map(([name]) => name);

// Get servers that require API keys
export const API_KEY_SERVERS = Object.entries(MCP_SERVERS)
  .filter(([_, server]) => server.requiresApiKey)
  .map(([name]) => name);

/**
 * Build MCP config for a server, optionally with API key
 */
export function buildServerConfig(serverName, apiKey = null) {
  const server = MCP_SERVERS[serverName];
  if (!server) return null;

  const config = { ...server.config };

  // Add API key to env if provided
  if (apiKey && server.requiresApiKey) {
    config.env = {
      [server.apiKeyEnvVar]: apiKey
    };
  }

  return config;
}

/**
 * Build complete MCP config from selected servers
 */
export function buildMcpConfig(selectedServers, apiKeys = {}) {
  const mcpServers = {};

  for (const serverName of selectedServers) {
    const apiKey = apiKeys[serverName] || null;
    const config = buildServerConfig(serverName, apiKey);
    if (config) {
      mcpServers[serverName] = config;
    }
  }

  return { mcpServers };
}
