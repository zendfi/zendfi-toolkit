#!/usr/bin/env node

/**
 * create-zendfi-app
 * CLI tool to scaffold a ZendFi-powered application
 */

import { program } from 'commander';
import chalk from 'chalk';
import { createApp } from './commands/create.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const version = pkg.version;

// ASCII Art Logo
const logo = `
${chalk.hex('#667eea').bold('╔══════════════════════════════════════╗')}
${chalk.hex('#667eea').bold('║')}  ${chalk.hex('#764ba2').bold(' ZendFi App Generator')}           ${chalk.hex('#667eea').bold('║')}
${chalk.hex('#667eea').bold('║')}  ${chalk.gray('Create a crypto payment app')}       ${chalk.hex('#667eea').bold('║')}
${chalk.hex('#667eea').bold('║')}  ${chalk.gray('in seconds')}                        ${chalk.hex('#667eea').bold('║')}
${chalk.hex('#667eea').bold('╚══════════════════════════════════════╝')}
`;

program
  .name('create-zendfi-app')
  .description('Create a new ZendFi-powered application')
  .version(version)
  .argument('[project-name]', 'Name of the project')
  .option('-t, --template <template>', 'Template to use (nextjs-ecommerce, nextjs-saas, express-api)')
  .option('--env <environment>', 'Environment (development, production)', 'development')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--skip-install', 'Skip dependency installation')
  .option('--skip-git', 'Skip git initialization')
  .action(async (projectName, options) => {
    console.log(logo);
    
    try {
      await createApp(projectName, options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
