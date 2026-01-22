#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.join(__dirname, '..', 'source');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// Colors for console output
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

async function build() {
  console.log('');
  log(colors.blue, 'BUILD', 'Building SuperClaude for Kiro...');
  console.log('');

  // Clean dist directory
  await fs.emptyDir(DIST_DIR);
  await fs.ensureDir(path.join(DIST_DIR, 'steering', 'superclaude'));
  await fs.ensureDir(path.join(DIST_DIR, 'agents'));
  await fs.ensureDir(path.join(DIST_DIR, 'mcp'));

  // Check if source directory exists
  if (!await fs.pathExists(SOURCE_DIR)) {
    log(colors.yellow, 'WARN', `Source directory not found: ${SOURCE_DIR}`);
    log(colors.yellow, 'WARN', 'Run "npm run sync:claude" or "npm run sync:github" first');
    log(colors.yellow, 'WARN', 'Or place source .md files in the source/ directory');
    console.log('');
    log(colors.blue, 'INFO', 'Creating dist with templates only...');
  }

  // Convert commands
  let commandCount = 0;
  if (await fs.pathExists(SOURCE_DIR)) {
    const files = await fs.readdir(SOURCE_DIR);

    for (const file of files) {
      if (file.endsWith('.md') && file !== 'README.md') {
        await convertCommand(
          path.join(SOURCE_DIR, file),
          path.join(DIST_DIR, 'steering', 'superclaude', `sc-${file}`)
        );
        commandCount++;
        log(colors.gray, 'CONV', `${file} -> sc-${file}`);
      }
    }
  }

  // Generate agents
  log(colors.blue, 'GEN', 'Generating agents...');
  await generateAgents();

  // Generate MCP template
  log(colors.blue, 'GEN', 'Generating MCP template...');
  await generateMcpTemplate();

  console.log('');
  log(colors.green, 'DONE', `Build complete!`);
  log(colors.gray, 'INFO', `  - Steering files: ${commandCount}`);
  log(colors.gray, 'INFO', `  - Agents: 4`);
  log(colors.gray, 'INFO', `  - MCP template: 1`);
  console.log('');
}

async function convertCommand(src, dst) {
  const content = await fs.readFile(src, 'utf-8');
  const filename = path.basename(src, '.md');

  const kiroContent = `---
inclusion: manual
---

# SuperClaude: ${filename}

> Converted from Claude Code SuperClaude framework
> Original: ~/.claude/commands/sc/${path.basename(src)}

${stripFrontmatter(content)}`;

  await fs.writeFile(dst, kiroContent);
}

function stripFrontmatter(content) {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return match ? match[1].trim() : content.trim();
}

async function generateAgents() {
  // Main SuperClaude agent
  const superclaudeAgent = {
    "$schema": "https://raw.githubusercontent.com/aws/amazon-q-developer-cli/refs/heads/main/schemas/agent-v1.json",
    "name": "superclaude",
    "description": "SuperClaude Framework Agent - Comprehensive development orchestration with specialized behaviors, flags, and MCP integrations",
    "prompt": `You are operating with the SuperClaude framework context. You have access to all SuperClaude behaviors.

## How to Use SuperClaude Commands
The user can reference any SuperClaude command using #sc-[command] syntax. When they do, load and follow the corresponding steering file.

## Available Commands
- #sc-analyze: Comprehensive code analysis
- #sc-brainstorm: Interactive requirements discovery
- #sc-build: Project building with error handling
- #sc-cleanup: Code cleanup and optimization
- #sc-design: System and component design
- #sc-document: Documentation generation
- #sc-estimate: Development estimates
- #sc-explain: Code explanations
- #sc-git: Git operations
- #sc-implement: Feature implementation
- #sc-improve: Code improvements
- #sc-index: Project documentation generation
- #sc-pm: Project management orchestration
- #sc-reflect: Task reflection
- #sc-research: Deep web research
- #sc-save / #sc-load: Session management
- #sc-spawn: Task orchestration
- #sc-task: Complex task execution
- #sc-test: Test execution
- #sc-troubleshoot: Issue diagnosis
- #sc-workflow: Workflow generation
- #sc-help: Show all commands and flags

## CRITICAL: FLAG PARSING - YOU MUST INTERPRET THESE FLAGS

When user includes ANY of these flags, you MUST activate the corresponding MCP tools:

### MCP Server Flags (ACTIVATE IMMEDIATELY when seen)
- \`--seq\` or \`--sequential\`: IMMEDIATELY call mcp__sequential-thinking__sequentialthinking for EVERY reasoning step
- \`--serena\`: USE mcp__serena__* tools for all code operations (find_symbol, get_symbols_overview, etc.)
- \`--c7\` or \`--context7\`: USE mcp__context7__* tools for documentation lookup
- \`--play\` or \`--playwright\`: USE mcp__playwright__* tools for browser automation
- \`--all-mcp\`: Enable ALL MCP servers for the task

### Analysis Depth Flags (CRITICAL)
- \`--think\`: Use sequential-thinking with ~5-8 thought steps
- \`--think-hard\`: Use sequential-thinking with ~10-15 thought steps + context7
- \`--ultrathink\`: MAXIMUM DEPTH - Use sequential-thinking with 15-25+ thought steps, enable ALL MCP servers, analyze exhaustively

### Output Flags
- \`--uc\` or \`--ultracompressed\`: Respond with minimal tokens, use symbols/abbreviations
- \`--token-efficient\`: Concise responses, reduced context

### Execution Examples
User: "#sc-analyze --seq --serena src/"
→ You MUST: 1) Call sequential-thinking for each analysis step 2) Use serena tools for code inspection

User: "#sc-implement --ultrathink --c7 add auth"
→ You MUST: 1) Use 15-25+ sequential thinking steps 2) Look up auth docs via context7 3) Use serena for code changes

## Behavioral Modes (natural language triggers)
- 'brainstorm mode': Collaborative discovery, ask probing questions
- 'think deeply/hard': Activate --think-hard behavior
- 'delegate this': Break into sub-tasks
- 'safe mode': Maximum validation before execution`,
    "mcpServers": {},
    "tools": ["*"],
    "allowedTools": [
      "*",
      "use_subagent",
      "@context7",
      "@playwright",
      "@sequential-thinking",
      "@serena",
      "@morphllm-fast-apply/edit_file"
    ],
    "resources": [],
    "hooks": {},
    "toolsSettings": {
      "shell": { "autoAllow": true },
      "write": { "autoAllow": true }
    },
    "useLegacyMcpJson": true,
    "model": "claude-opus-4-5"
  };

  // PM Agent
  const pmAgent = {
    "$schema": "https://raw.githubusercontent.com/aws/amazon-q-developer-cli/refs/heads/main/schemas/agent-v1.json",
    "name": "sc-pm",
    "description": "SuperClaude Project Manager Agent - Orchestrates complex projects with PDCA cycle and sub-agent delegation",
    "prompt": `You are the SuperClaude Project Manager Agent. You orchestrate complex projects using:

1. **Session Lifecycle**: Restore context, track progress, preserve state
2. **PDCA Cycle**: Plan (hypothesis) -> Do (experiment) -> Check (evaluate) -> Act (improve)
3. **Sub-Agent Delegation**: Route tasks to specialists based on analysis
4. **Self-Correction**: Never retry without understanding root cause first
5. **Documentation**: Record patterns, mistakes, and learnings continuously

When the user needs project management help, reference #sc-pm for full workflow details.

For task breakdown, use #sc-task or #sc-spawn.
For implementation delegation, use #sc-implement.
For analysis, use #sc-analyze.

## FLAG PARSING (CRITICAL)
- \`--seq\`: Use mcp__sequential-thinking__sequentialthinking for ALL steps
- \`--serena\`: Use mcp__serena__* tools for code operations
- \`--ultrathink\`: 15-25+ sequential thinking steps, enable ALL MCP servers
- \`--think-hard\`: 10-15 sequential thinking steps + context7`,
    "mcpServers": {},
    "tools": ["*"],
    "allowedTools": [
      "*",
      "use_subagent",
      "@context7",
      "@playwright",
      "@sequential-thinking",
      "@serena",
      "@morphllm-fast-apply/edit_file"
    ],
    "resources": [],
    "hooks": {},
    "toolsSettings": {
      "shell": { "autoAllow": true },
      "write": { "autoAllow": true }
    },
    "useLegacyMcpJson": true,
    "model": "claude-opus-4-5"
  };

  // Implementation Agent
  const implementAgent = {
    "$schema": "https://raw.githubusercontent.com/aws/amazon-q-developer-cli/refs/heads/main/schemas/agent-v1.json",
    "name": "sc-implement",
    "description": "SuperClaude Implementation Agent - Feature and code implementation with intelligent workflow",
    "prompt": `You are the SuperClaude Implementation Agent. You implement features following:

1. **Understand**: Analyze requirements thoroughly before coding
2. **Research**: Use MCP tools (context7) for documentation lookup
3. **Plan**: Design approach based on project patterns
4. **Implement**: Write code following conventions
5. **Test**: Include tests with implementation
6. **Document**: Record decisions and rationale

Reference #sc-implement for full workflow.
For design decisions, use #sc-design.
For testing, use #sc-test.

## FLAG PARSING (CRITICAL)
- \`--seq\`: Use mcp__sequential-thinking__sequentialthinking for ALL steps
- \`--serena\`: Use mcp__serena__* tools for code operations
- \`--c7\`: Use mcp__context7__* for documentation lookup
- \`--ultrathink\`: 15-25+ sequential thinking steps, enable ALL MCP servers`,
    "mcpServers": {},
    "tools": ["*"],
    "allowedTools": [
      "*",
      "use_subagent",
      "@context7",
      "@playwright",
      "@sequential-thinking",
      "@serena",
      "@morphllm-fast-apply/edit_file"
    ],
    "resources": [],
    "hooks": {},
    "toolsSettings": {
      "shell": { "autoAllow": true },
      "write": { "autoAllow": true }
    },
    "useLegacyMcpJson": true,
    "model": "claude-opus-4-5"
  };

  // Analysis Agent
  const analyzeAgent = {
    "$schema": "https://raw.githubusercontent.com/aws/amazon-q-developer-cli/refs/heads/main/schemas/agent-v1.json",
    "name": "sc-analyze",
    "description": "SuperClaude Analysis Agent - Comprehensive code analysis across quality, security, performance, and architecture",
    "prompt": `You are the SuperClaude Analysis Agent. You perform comprehensive analysis:

1. **Quality Analysis**: Code style, patterns, maintainability
2. **Security Analysis**: OWASP vulnerabilities, auth issues, input validation
3. **Performance Analysis**: Bottlenecks, optimization opportunities
4. **Architecture Analysis**: Design patterns, coupling, cohesion

Provide actionable insights with specific recommendations and code locations.

Reference #sc-analyze for full workflow.
For improvements, use #sc-improve.
For troubleshooting, use #sc-troubleshoot.

## FLAG PARSING (CRITICAL)
- \`--seq\`: ALWAYS use mcp__sequential-thinking__sequentialthinking for EVERY analysis step
- \`--serena\`: Use mcp__serena__* tools (find_symbol, get_symbols_overview) for code inspection
- \`--ultrathink\`: 15-25+ sequential thinking steps, exhaustive analysis with ALL MCP servers
- \`--think-hard\`: 10-15 sequential thinking steps + context7`,
    "mcpServers": {},
    "tools": ["*"],
    "allowedTools": [
      "*",
      "use_subagent",
      "@context7",
      "@playwright",
      "@sequential-thinking",
      "@serena",
      "@morphllm-fast-apply/edit_file"
    ],
    "resources": [],
    "hooks": {},
    "toolsSettings": {
      "shell": { "autoAllow": true },
      "write": { "autoAllow": true }
    },
    "useLegacyMcpJson": true,
    "model": "claude-opus-4-5"
  };

  await fs.writeJson(path.join(DIST_DIR, 'agents', 'superclaude.json'), superclaudeAgent, { spaces: 2 });
  await fs.writeJson(path.join(DIST_DIR, 'agents', 'sc-pm.json'), pmAgent, { spaces: 2 });
  await fs.writeJson(path.join(DIST_DIR, 'agents', 'sc-implement.json'), implementAgent, { spaces: 2 });
  await fs.writeJson(path.join(DIST_DIR, 'agents', 'sc-analyze.json'), analyzeAgent, { spaces: 2 });

  log(colors.gray, 'GEN', 'superclaude.json');
  log(colors.gray, 'GEN', 'sc-pm.json');
  log(colors.gray, 'GEN', 'sc-implement.json');
  log(colors.gray, 'GEN', 'sc-analyze.json');
}

async function generateMcpTemplate() {
  const mcpTemplate = {
    "mcpServers": {
      "sequential-thinking": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
        "autoApprove": ["sequentialthinking"]
      },
      "context7": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@upstash/context7-mcp"],
        "autoApprove": ["resolve-library-id", "get-library-docs"]
      },
      "playwright": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest"],
        "autoApprove": [
          "browser_close", "browser_resize", "browser_console_messages",
          "browser_handle_dialog", "browser_evaluate", "browser_file_upload",
          "browser_fill_form", "browser_install", "browser_press_key",
          "browser_type", "browser_navigate", "browser_navigate_back",
          "browser_network_requests", "browser_run_code", "browser_take_screenshot",
          "browser_snapshot", "browser_click", "browser_drag", "browser_hover",
          "browser_select_option", "browser_tabs", "browser_wait_for"
        ]
      },
      "serena": {
        "type": "stdio",
        "command": "uvx",
        "args": [
          "--from", "git+https://github.com/oraios/serena",
          "serena", "start-mcp-server",
          "--context", "ide-assistant",
          "--enable-web-dashboard", "false",
          "--enable-gui-log-window", "false"
        ],
        "autoApprove": [
          "list_dir", "find_file", "search_for_pattern", "get_symbols_overview",
          "find_symbol", "find_referencing_symbols", "replace_symbol_body",
          "insert_after_symbol", "insert_before_symbol", "rename_symbol",
          "write_memory", "read_memory", "list_memories", "delete_memory",
          "edit_memory", "activate_project", "get_current_config",
          "check_onboarding_performed", "onboarding", "think_about_collected_information",
          "think_about_task_adherence", "think_about_whether_you_are_done", "initial_instructions"
        ]
      }
    }
  };

  await fs.writeJson(path.join(DIST_DIR, 'mcp', 'mcp-servers.json'), mcpTemplate, { spaces: 2 });
  log(colors.gray, 'GEN', 'mcp-servers.json');
}

// Run build
build().catch(error => {
  log(colors.red, 'ERROR', error.message);
  process.exit(1);
});
