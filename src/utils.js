import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * Get the Kiro CLI directory path
 * @returns {string} Path to ~/.kiro
 */
export function getKiroDir() {
  return path.join(os.homedir(), '.kiro');
}

/**
 * Get the Claude Code directory path
 * @returns {string} Path to ~/.claude
 */
export function getClaudeDir() {
  return path.join(os.homedir(), '.claude');
}

/**
 * Check if Kiro CLI is installed
 * @returns {Promise<boolean>}
 */
export async function isKiroInstalled() {
  return await fs.pathExists(getKiroDir());
}

/**
 * Check if SuperClaude is installed in Kiro
 * @returns {Promise<boolean>}
 */
export async function isSuperClaudeInstalled() {
  const versionFile = path.join(getKiroDir(), 'docs', 'superclaude-version.json');
  const steeringDir = path.join(getKiroDir(), 'steering', 'superclaude');
  return await fs.pathExists(versionFile) && await fs.pathExists(steeringDir);
}

/**
 * Get installed SuperClaude version
 * @returns {Promise<string|null>} Version string or null if not installed
 */
export async function getInstalledVersion() {
  const versionFile = path.join(getKiroDir(), 'docs', 'superclaude-version.json');
  if (!await fs.pathExists(versionFile)) return null;

  const info = await fs.readJson(versionFile);
  return info.version;
}

/**
 * Ensure a directory exists
 * @param {string} dirPath - Directory path to ensure
 */
export async function ensureDir(dirPath) {
  await fs.ensureDir(dirPath);
}

/**
 * Copy files matching a pattern from source to destination
 * @param {string} srcDir - Source directory
 * @param {string} dstDir - Destination directory
 * @param {string} extension - File extension to match (e.g., '.md')
 * @returns {Promise<number>} Number of files copied
 */
export async function copyMatchingFiles(srcDir, dstDir, extension) {
  if (!await fs.pathExists(srcDir)) return 0;

  await fs.ensureDir(dstDir);

  const files = await fs.readdir(srcDir);
  let count = 0;

  for (const file of files) {
    if (file.endsWith(extension)) {
      await fs.copy(
        path.join(srcDir, file),
        path.join(dstDir, file)
      );
      count++;
    }
  }

  return count;
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
export function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}
