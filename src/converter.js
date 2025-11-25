import fs from 'fs-extra';
import path from 'path';

/**
 * Convert a Claude Code command file to Kiro steering file format
 * @param {string} src - Source file path
 * @param {string} dst - Destination file path
 */
export async function convertCommand(src, dst) {
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

/**
 * Strip YAML frontmatter from markdown content
 * @param {string} content - Markdown content with potential frontmatter
 * @returns {string} Content without frontmatter
 */
export function stripFrontmatter(content) {
  // Match YAML frontmatter at the start of the file
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return match ? match[1].trim() : content.trim();
}

/**
 * Parse YAML frontmatter from markdown content
 * @param {string} content - Markdown content with frontmatter
 * @returns {Object} Parsed frontmatter object
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result = {};

  // Simple YAML parsing for key: value pairs
  const lines = yaml.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      // Remove quotes if present
      result[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  return result;
}
