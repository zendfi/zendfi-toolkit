/**
 * Git Repository Initialization
 */

import { execa } from 'execa';
import ora from 'ora';

export async function initGit(projectPath: string): Promise<void> {
  const spinner = ora({
    text: 'Initializing git repository...',
    color: 'cyan',
  }).start();

  try {
    await execa('git', ['init'], {
      cwd: projectPath,
      stdio: 'pipe',
    });

    await execa('git', ['add', '.'], {
      cwd: projectPath,
      stdio: 'pipe',
    });

    await execa('git', ['commit', '-m', 'Initial commit from create-zendfi-app'], {
      cwd: projectPath,
      stdio: 'pipe',
    });

    spinner.succeed('Git repository initialized!');
  } catch (error) {
    spinner.warn('Could not initialize git repository (continuing...)');
  }
}
