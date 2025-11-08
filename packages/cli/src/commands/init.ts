/**
 * zendfi init - Add ZendFi to an existing project
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { detectFramework, getFrameworkPaths, getInstallCommand } from '../utils/framework-detector.js';
import { generateClientFile, generateWebhookFile, generateEnvFile } from '../utils/file-templates.js';
import { execSync } from 'child_process';

export async function initCommand(options: { yes?: boolean; skipInstall?: boolean } = {}) {
  const projectPath = process.cwd();

  console.log(chalk.cyan('\nInitializing ZendFi in your project...\n'));

  // Step 1: Detect framework
  const spinner = ora('Detecting project framework...').start();
  
  let frameworkInfo;
  try {
    frameworkInfo = await detectFramework(projectPath);
    spinner.succeed(`Detected: ${chalk.green(frameworkInfo.name)}`);
  } catch (error) {
    spinner.fail(chalk.red((error as Error).message));
    process.exit(1);
  }

  // Show detected info
  console.log(chalk.gray('\n  Project Information:'));
  console.log(chalk.gray('  Framework:'), chalk.white(frameworkInfo.name));
  if (frameworkInfo.version) {
    console.log(chalk.gray('  Version:'), chalk.white(frameworkInfo.version));
  }
  console.log(chalk.gray('  TypeScript:'), chalk.white(frameworkInfo.hasTypeScript ? 'Yes' : 'No'));
  console.log(chalk.gray('  Package Manager:'), chalk.white(frameworkInfo.packageManager));

  // Step 2: Confirm installation
  if (!options.yes) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Continue with ZendFi setup?',
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('\n  Setup cancelled.'));
      process.exit(0);
    }
  }

  // Step 3: Install @zendfi/sdk
  if (!options.skipInstall) {
    await installSDK(frameworkInfo.packageManager, projectPath);
  } else {
    console.log(chalk.yellow('\n  ⏭️  Skipped SDK installation'));
  }

  // Step 4: Create files
  await createFiles(projectPath, frameworkInfo);

  // Step 5: Setup environment variables
  await setupEnvironment(projectPath, frameworkInfo);

  // Step 6: Show next steps
  displaySuccessMessage(frameworkInfo);
}

/**
 * Install @zendfi/sdk
 */
async function installSDK(packageManager: string, projectPath: string) {
  const spinner = ora('Installing @zendfi/sdk...').start();

  try {
    const installCmd = getInstallCommand(packageManager, ['@zendfi/sdk']);
    
    execSync(installCmd, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    spinner.succeed('Installed @zendfi/sdk');
  } catch (error) {
    spinner.warn('Could not install @zendfi/sdk automatically');
    console.log(chalk.yellow(`  Please run: ${getInstallCommand(packageManager, ['@zendfi/sdk'])}`));
  }
}

/**
 * Create necessary files
 */
async function createFiles(
  projectPath: string,
  frameworkInfo: Awaited<ReturnType<typeof detectFramework>>
) {
  const paths = getFrameworkPaths(frameworkInfo.framework);
  const { hasTypeScript, framework } = frameworkInfo;

  // Create lib/zendfi file
  const clientFilePath = path.join(projectPath, paths.libPath);
  if (await fs.pathExists(clientFilePath)) {
    console.log(chalk.yellow(`\n  ⏭️  ${paths.libPath} already exists, skipping...`));
  } else {
    const spinner = ora(`Creating ${paths.libPath}...`).start();
    const clientContent = generateClientFile(framework, hasTypeScript);
    await fs.ensureDir(path.dirname(clientFilePath));
    await fs.writeFile(clientFilePath, clientContent, 'utf-8');
    spinner.succeed(`Created ${chalk.green(paths.libPath)}`);
  }

  // Create webhook handler
  const webhookFilePath = path.join(projectPath, paths.webhookPath);
  if (await fs.pathExists(webhookFilePath)) {
    console.log(chalk.yellow(`  ⏭️  ${paths.webhookPath} already exists, skipping...`));
  } else {
    const spinner = ora(`Creating ${paths.webhookPath}...`).start();
    const webhookContent = generateWebhookFile(framework, hasTypeScript);
    await fs.ensureDir(path.dirname(webhookFilePath));
    await fs.writeFile(webhookFilePath, webhookContent, 'utf-8');
    spinner.succeed(`Created ${chalk.green(paths.webhookPath)}`);
  }
}

/**
 * Setup environment variables
 */
async function setupEnvironment(
  projectPath: string,
  frameworkInfo: Awaited<ReturnType<typeof detectFramework>>
) {
  const paths = getFrameworkPaths(frameworkInfo.framework);
  const envFilePath = path.join(projectPath, paths.envFile);

  if (await fs.pathExists(envFilePath)) {
    console.log(chalk.yellow(`\n  ℹ️  ${paths.envFile} already exists`));
    console.log(chalk.gray('     Add these variables to your existing file:\n'));
    console.log(chalk.cyan(generateEnvFile(frameworkInfo.framework)));
  } else {
    const spinner = ora(`Creating ${paths.envFile}...`).start();
    const envContent = generateEnvFile(frameworkInfo.framework);
    await fs.writeFile(envFilePath, envContent, 'utf-8');
    spinner.succeed(`Created ${chalk.green(paths.envFile)}`);
  }
}

/**
 * Display success message with next steps
 */
function displaySuccessMessage(
  frameworkInfo: Awaited<ReturnType<typeof detectFramework>>
) {
  const paths = getFrameworkPaths(frameworkInfo.framework);

  console.log(chalk.green('\n✨ ZendFi setup complete!\n'));

  console.log(chalk.bold('📝 Next steps:\n'));

  console.log(chalk.cyan('  1. Add your API key to ' + paths.envFile));
  console.log(chalk.gray('     Get your API key from: https://app.zendfi.com/settings/api-keys\n'));

  if (frameworkInfo.framework === 'nextjs-app') {
    console.log(chalk.cyan('  2. Create a payment in your app:'));
    console.log(chalk.white(`
     import { zendfi } from '@/lib/zendfi';
     
     const payment = await zendfi.createPayment({
       amount: 50,
       description: 'Premium subscription'
     });
     
     // Redirect to checkout
     return redirect(payment.checkout_url);
    `));
  } else if (frameworkInfo.framework === 'express') {
    console.log(chalk.cyan('  2. Create a payment in your API:'));
    console.log(chalk.white(`
     import { zendfi } from './lib/zendfi';
     
     app.post('/api/payments', async (req, res) => {
       const payment = await zendfi.createPayment({
         amount: req.body.amount,
         description: req.body.description
       });
       
       res.json({ checkout_url: payment.checkout_url });
     });
    `));
  }

  console.log(chalk.cyan('\n  3. Implement webhook handlers'));
  console.log(chalk.gray(`     File: ${paths.webhookPath}`));
  console.log(chalk.gray('     Update the TODO sections to handle payment events\n'));

  console.log(chalk.cyan('  4. Test your integration'));
  console.log(chalk.gray('     Run: zendfi test payment --amount 50\n'));

  console.log(chalk.bold('📚 Documentation:'));
  console.log(chalk.gray('   https://docs.zendfi.com/quickstart\n'));

  console.log(chalk.green('Happy building! 🚀\n'));
}
