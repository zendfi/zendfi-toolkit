/**
 * Package Manager Detection
 */

import { execaCommand } from 'execa';
import type { PackageManager } from '../types.js';

export async function detectPackageManager(): Promise<PackageManager> {
  const userAgent = process.env.npm_config_user_agent;
  
  if (userAgent) {
    if (userAgent.startsWith('yarn')) return 'yarn';
    if (userAgent.startsWith('pnpm')) return 'pnpm';
    if (userAgent.startsWith('bun')) return 'bun';
  }
  
  const managers: PackageManager[] = ['pnpm', 'yarn', 'bun', 'npm'];
  
  for (const manager of managers) {
    if (await isCommandAvailable(manager)) {
      return manager;
    }
  }
  
  return 'npm';
}

async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    await execaCommand(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function getInstallCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case 'yarn':
      return 'yarn';
    case 'pnpm':
      return 'pnpm install';
    case 'bun':
      return 'bun install';
    default:
      return 'npm install';
  }
}

export function getRunCommand(packageManager: PackageManager, script: string): string {
  switch (packageManager) {
    case 'yarn':
      return `yarn ${script}`;
    case 'pnpm':
      return `pnpm ${script}`;
    case 'bun':
      return `bun run ${script}`;
    default:
      return `npm run ${script}`;
  }
}
