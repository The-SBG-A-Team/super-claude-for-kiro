# SuperClaude for Kiro CLI

Easy installation of [SuperClaude Framework](https://superclaude.netlify.app/) for Kiro CLI. One command to install, update, or uninstall.

> **Attribution**: This package is an installer for the SuperClaude Framework created by [SuperClaude-Org](https://github.com/SuperClaude-Org/SuperClaude_Framework). All command content and framework design belongs to the original authors. This package simply provides a convenient installation mechanism for Kiro CLI users.

## Installation

```bash
npx superclaude-kiro install
```

That's it! SuperClaude is now installed and set as your default agent.

## Usage

After installation, start Kiro CLI:

```bash
kiro-cli chat
```

Reference SuperClaude commands using `#sc-*` syntax:

```
#sc-implement Add user authentication
#sc-analyze Review this code for security issues
#sc-help Show all available commands
```

## Available Commands

| Command | Description |
|---------|-------------|
| `#sc-analyze` | Comprehensive code analysis |
| `#sc-brainstorm` | Interactive requirements discovery |
| `#sc-build` | Project building with error handling |
| `#sc-cleanup` | Code cleanup and optimization |
| `#sc-design` | System and component design |
| `#sc-document` | Documentation generation |
| `#sc-estimate` | Development estimates |
| `#sc-explain` | Code explanations |
| `#sc-git` | Git operations |
| `#sc-implement` | Feature implementation |
| `#sc-improve` | Code improvements |
| `#sc-index` | Project documentation generation |
| `#sc-pm` | Project management orchestration |
| `#sc-research` | Deep web research |
| `#sc-task` | Complex task execution |
| `#sc-test` | Test execution |
| `#sc-troubleshoot` | Issue diagnosis |
| `#sc-workflow` | Workflow generation |
| `#sc-help` | Show all commands and flags |

## CLI Commands

```bash
# Install SuperClaude
npx superclaude-kiro install

# Install with options
npx superclaude-kiro install --force        # Overwrite existing
npx superclaude-kiro install --no-mcp       # Skip MCP server config
npx superclaude-kiro install --no-default   # Don't set as default agent

# Update to latest version
npx superclaude-kiro update

# Check installation status
npx superclaude-kiro status

# Uninstall
npx superclaude-kiro uninstall
```

## What Gets Installed

- **30 steering files** - SuperClaude commands in `~/.kiro/steering/superclaude/`
- **4 agents** - Specialized agents in `~/.kiro/agents/`
  - `superclaude` - Main framework agent (default)
  - `sc-pm` - Project Manager agent
  - `sc-implement` - Implementation agent
  - `sc-analyze` - Analysis agent
- **MCP servers** - Pre-configured in `~/.kiro/settings/mcp.json`
- **Default agent** - Set to `superclaude` in `~/.kiro/settings/cli.json`

## Configuration

All agents are configured with:
- `"tools": ["*"]` - Access to all tools
- `"allowedTools": ["*"]` - All tools pre-approved (no prompts)
- `"allowedMcpTools": ["*"]` - All MCP tools trusted (no prompts)
- `"model": "claude-sonnet-4.5"` - Claude Sonnet 4.5
- `"useLegacyMcpJson": true` - Uses global MCP servers

## Behavioral Modes

Use natural language to activate modes:

| Mode | How to Activate |
|------|-----------------|
| Think deeply | "think through this step by step" |
| Brainstorm | "let's brainstorm this" |
| Delegate | "delegate this to sub-tasks" |
| Safe mode | "validate carefully before executing" |
| Token efficient | "be concise" |

## Switching Agents

```bash
# In a Kiro session
/agent swap
# Select from: superclaude, sc-pm, sc-implement, sc-analyze

# Or start with a specific agent
kiro-cli chat --agent sc-pm
```

## For Package Maintainers

### Update from Claude Code

```bash
# Clone this repo
git clone https://github.com/your-org/superclaude-kiro.git
cd superclaude-kiro

# Install dependencies
npm install

# Sync from your local Claude Code installation
npm run sync:claude

# Build distribution files
npm run build

# Bump version and publish
npm version patch
npm publish
```

### Update from GitHub

```bash
# Set the repo (optional, defaults to SuperClaude-Org/SuperClaude_Framework)
export SUPERCLAUDE_REPO=your-org/your-repo

# Sync from GitHub
npm run sync:github

# Build and publish
npm run build
npm version patch
npm publish
```

## Requirements

- Node.js 18+
- Kiro CLI installed (`~/.kiro` directory exists)

## Troubleshooting

### SuperClaude not loading as default

```bash
# Check setting
kiro-cli settings chat.defaultAgent

# Set manually if needed
kiro-cli settings chat.defaultAgent superclaude
```

### MCP servers not working

```bash
# List MCP servers
kiro-cli mcp list

# Check config
cat ~/.kiro/settings/mcp.json
```

### Reinstall from scratch

```bash
npx superclaude-kiro uninstall
npx superclaude-kiro install --force
```

## Credits & References

- **SuperClaude Framework**: https://superclaude.netlify.app/
- **SuperClaude GitHub**: https://github.com/SuperClaude-Org/SuperClaude_Framework
- **Kiro CLI Documentation**: https://kiro.dev/docs/cli/

This installer package was created to simplify SuperClaude deployment for Kiro CLI users. All credit for the SuperClaude framework, commands, and methodology goes to the original creators.

## License

MIT (installer only - SuperClaude Framework has its own license, see [original repository](https://github.com/SuperClaude-Org/SuperClaude_Framework))
