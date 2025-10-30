/**
 * Create command - Main logic for scaffolding projects
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import validateNpmPackageName from 'validate-npm-package-name';
import { detectPackageManager } from '../utils/package-manager.js';
import { installDependencies } from '../utils/install.js';
import { initGit } from '../utils/git.js';
import { scaffoldProject } from '../utils/scaffold.js';
import { displaySuccessMessage } from '../utils/messages.js';
import { setupApiKey } from '../utils/api-key-setup.js';
import type { CliOptions, ProjectConfig, Template } from '../types.js';
import { TEMPLATES } from '../types.js';

export async function createApp(projectName: string | undefined, options: CliOptions): Promise<void> {
  const name = await getProjectName(projectName);
  
  validateProjectName(name);
  const projectPath = path.resolve(process.cwd(), name);
  await checkDirectoryExists(projectPath);

  const template = await getTemplate(options.template);
  
  const environment = options.env || 'development';
  
  const packageManager = await detectPackageManager();
  
  const config: ProjectConfig = {
    name,
    projectName: name,
    path: projectPath,
    projectPath,
    template,
    environment,
    packageManager,
  };
  
  console.log('\n' + chalk.cyan(' Project Configuration:'));
  console.log(chalk.gray('  Name:'), chalk.white(name));
  console.log(chalk.gray('  Template:'), chalk.white(TEMPLATES[template].name));
  console.log(chalk.gray('  Framework:'), chalk.white(TEMPLATES[template].framework));
  console.log(chalk.gray('  Environment:'), chalk.white(environment));
  console.log(chalk.gray('  Package Manager:'), chalk.white(packageManager));
  
  if (!options.yes) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Continue with this configuration?',
        default: true,
      },
    ]);
    
    if (!confirm) {
      console.log(chalk.yellow('\n  Aborted by user'));
      process.exit(0);
    }
  }
  
  const spinner = ora('Creating project directory...').start();
  await fs.ensureDir(projectPath);
  spinner.succeed('Project directory created');
  
  await scaffoldProject(config);
  
  const apiKey = await setupApiKey();
  if (apiKey) {
    // Update .env file with API key
    const envPath = path.join(projectPath, '.env');
    try {
      let envContent = await fs.readFile(envPath, 'utf-8');
      envContent = envContent.replace(
        /ZENDFI_API_KEY=.*/,
        `ZENDFI_API_KEY=${apiKey}`
      );
      await fs.writeFile(envPath, envContent, 'utf-8');
      console.log(chalk.green(' API key saved to .env file'));
    } catch (error) {
      console.log(chalk.yellow('  Could not save API key to .env file'));
      console.log(chalk.gray('Please add it manually:\n'));
      console.log(chalk.cyan(`ZENDFI_API_KEY=${apiKey}\n`));
    }
  }
  
  if (!options.skipInstall) {
    await installDependencies(projectPath, packageManager);
  } else {
    console.log(chalk.yellow('\n  Skipped dependency installation'));
  }
  
  if (!options.skipGit) {
    await initGit(projectPath);
  } else {
    console.log(chalk.yellow('\n  Skipped git initialization'));
  }
  
  displaySuccessMessage(config);
}

async function getProjectName(providedName: string | undefined): Promise<string> {
  if (providedName) {
    return providedName;
  }
  
  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'What is your project named?',
      default: 'my-zendfi-app',
      validate: (input: string) => {
        const validation = validateNpmPackageName(input);
        if (!validation.validForNewPackages) {
          const errors = [
            ...(validation.errors || []),
            ...(validation.warnings || []),
          ];
          return errors[0] || 'Invalid package name';
        }
        return true;
      },
    },
  ]);
  
  return projectName;
}

function validateProjectName(name: string): void {
  const validation = validateNpmPackageName(name);
  
  if (!validation.validForNewPackages) {
    const errors = [
      ...(validation.errors || []),
      ...(validation.warnings || []),
    ];
    throw new Error(`Invalid project name: ${errors.join(', ')}`);
  }
}

async function checkDirectoryExists(projectPath: string): Promise<void> {
  if (await fs.pathExists(projectPath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory ${chalk.cyan(path.basename(projectPath))} already exists. Overwrite?`,
        default: false,
      },
    ]);
    
    if (!overwrite) {
      console.log(chalk.yellow('\n  Aborted by user'));
      process.exit(0);
    }
    
    const spinner = ora('Removing existing directory...').start();
    await fs.remove(projectPath);
    spinner.succeed('Existing directory removed');
  }
}

async function getTemplate(providedTemplate: Template | undefined): Promise<Template> {
  if (providedTemplate) {
    if (!TEMPLATES[providedTemplate]) {
      throw new Error(`Invalid template: ${providedTemplate}`);
    }
    return providedTemplate;
  }
  
  const choices = Object.entries(TEMPLATES).map(([key, config]) => ({
    name: `${config.name} - ${chalk.gray(config.description)}`,
    value: key as Template,
    short: config.name,
  }));
  
  const { template } = await inquirer.prompt([
    {
      type: 'list',
      name: 'template',
      message: 'Which template would you like to use?',
      choices,
    },
  ]);
  
  return template;
}
