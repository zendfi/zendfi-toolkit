/**
 * CLI Messages and Output Formatting
 */

import chalk from 'chalk';
import type { ProjectConfig } from '../types.js';
import { getRunCommand } from './package-manager.js';

export function displaySuccessMessage(config: ProjectConfig): void {
  const { projectName, projectPath, packageManager, template } = config;

  console.log('\n' + chalk.green('✨ Success!') + ' Created ' + chalk.cyan(projectName) + ' at ' + chalk.gray(projectPath));
  console.log('\n' + chalk.bold('Inside that directory, you can run:'));
  
  // Development command
  console.log('\n  ' + chalk.cyan(getRunCommand(packageManager, 'dev')));
  console.log('    ' + chalk.gray('Starts the development server'));

  // Build command
  console.log('\n  ' + chalk.cyan(getRunCommand(packageManager, 'build')));
  console.log('    ' + chalk.gray('Builds the app for production'));

  // Start command (if applicable)
  if (template.includes('nextjs')) {
    console.log('\n  ' + chalk.cyan(getRunCommand(packageManager, 'start')));
    console.log('    ' + chalk.gray('Runs the production build'));
  }

  console.log('\n' + chalk.bold('We suggest that you begin by typing:'));
  console.log('\n  ' + chalk.cyan(`cd ${projectName}`));
  console.log('  ' + chalk.cyan(getRunCommand(packageManager, 'dev')));

  console.log('\n' + chalk.bold('📚 Documentation:'));
  console.log('  ' + chalk.gray('https://docs.zendfi.com'));

  console.log('\n' + chalk.bold('💬 Need help?'));
  console.log('  ' + chalk.gray('Join our Discord: https://discord.gg/zendfi'));
  
  console.log('\n' + chalk.yellow('⚡ Don\'t forget to:'));
  console.log('  1. Update your ' + chalk.cyan('.env') + ' file with your ZendFi API credentials');
  console.log('  2. Configure your webhook endpoint in the ZendFi dashboard');
  console.log('  3. Test webhook verification using ' + chalk.cyan('zendfi webhook test'));

  console.log('\n' + chalk.dim('Happy coding! 🚀\n'));
}

export function displayWelcome(): void {
  const logo = `
${chalk.magenta('╔══════════════════════════════════════════════════════╗')}
${chalk.magenta('║')}  ${chalk.bold.white('███████╗███████╗███╗   ██╗██████╗ ███████╗██╗')}      ${chalk.magenta('║')}
${chalk.magenta('║')}  ${chalk.bold.white('╚══███╔╝██╔════╝████╗  ██║██╔══██╗██╔════╝██║')}      ${chalk.magenta('║')}
${chalk.magenta('║')}    ${chalk.bold.cyan('███╔╝ █████╗  ██╔██╗ ██║██║  ██║█████╗  ██║')}      ${chalk.magenta('║')}
${chalk.magenta('║')}   ${chalk.bold.cyan('███╔╝  ██╔══╝  ██║╚██╗██║██║  ██║██╔══╝  ██║')}      ${chalk.magenta('║')}
${chalk.magenta('║')}  ${chalk.bold.blue('███████╗███████╗██║ ╚████║██████╔╝██║     ██║')}      ${chalk.magenta('║')}
${chalk.magenta('║')}  ${chalk.bold.blue('╚══════╝╚══════╝╚═╝  ╚═══╝╚═════╝ ╚═╝     ╚═╝')}      ${chalk.magenta('║')}
${chalk.magenta('║')}                                                      ${chalk.magenta('║')}
${chalk.magenta('║')}  ${chalk.gray('Accept crypto payments in your apps — in 2 minutes')}  ${chalk.magenta('║')}
${chalk.magenta('╚══════════════════════════════════════════════════════╝')}
  `;
  
  console.log(logo);
}

export function displayConfig(config: ProjectConfig): void {
  console.log('\n' + chalk.bold('📦 Project Configuration:'));
  console.log('  ' + chalk.gray('Name:         ') + chalk.cyan(config.projectName));
  console.log('  ' + chalk.gray('Template:     ') + chalk.cyan(config.template));
  console.log('  ' + chalk.gray('Environment:  ') + chalk.cyan(config.environment));
  console.log('  ' + chalk.gray('Package Mgr:  ') + chalk.cyan(config.packageManager));
  console.log('  ' + chalk.gray('Path:         ') + chalk.gray(config.projectPath));
  
  if (config.apiKey) {
    console.log('  ' + chalk.gray('API Key:      ') + chalk.green('✓ Set'));
  } else {
    console.log('  ' + chalk.gray('API Key:      ') + chalk.yellow('⚠ Not set (you\'ll need to add it to .env)'));
  }
}
