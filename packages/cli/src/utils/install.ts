/**
 * Dependency Installation
 */

import { execa } from 'execa';
import ora from 'ora';
import type { PackageManager } from '../types.js';
import { getInstallCommand } from './package-manager.js';

export async function installDependencies(
  projectPath: string,
  packageManager: PackageManager
): Promise<void> {
  const spinner = ora({
    text: `Installing dependencies with ${packageManager}...`,
    color: 'cyan',
  }).start();

  try {
    const command = getInstallCommand(packageManager);
    const parts = command.split(' ');
    const cmd = parts[0]!;
    const args = parts.slice(1);

    await execa(cmd, args, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    spinner.succeed(`Dependencies installed successfully!`);
  } catch (error) {
    spinner.fail(`Failed to install dependencies`);
    throw error;
  }
}
