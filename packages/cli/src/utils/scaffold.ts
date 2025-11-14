/**
 * Project Scaffolding
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';
import type { ProjectConfig } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function scaffoldProject(config: ProjectConfig): Promise<void> {
  const spinner = ora({
    text: `Creating ${config.template} project...`,
    color: 'cyan',
  }).start();

  try {
    const templateDir = path.join(__dirname, '../templates', config.template);

    if (!await fs.pathExists(templateDir)) {
      throw new Error(`Template not found: ${config.template}
Looked in: ${templateDir}`);
    }

    await fs.copy(templateDir, config.projectPath, {
      filter: (src) => {
        const relativePath = path.relative(templateDir, src);
        
        const shouldCopy = !relativePath.includes('node_modules') && 
               !relativePath.includes('dist') && 
               !relativePath.includes('.next');
        return shouldCopy;
      },
    });

    await processTemplateFiles(config);

    await createEnvFile(config);

    spinner.succeed('Project scaffolded successfully!');
  } catch (error) {
    spinner.fail('Failed to scaffold project');
    throw error;
  }
}

async function processTemplateFiles(config: ProjectConfig): Promise<void> {
  const filesToProcess = [
    'package.json',
    'README.md',
    '.env.example',
  ];

  for (const file of filesToProcess) {
    const filePath = path.join(config.projectPath, file);
    
    if (await fs.pathExists(filePath)) {
      let content = await fs.readFile(filePath, 'utf-8');
      
      content = content
        .replace(/\{\{PROJECT_NAME\}\}/g, config.projectName)
        .replace(/\{\{API_KEY\}\}/g, config.apiKey || 'your-api-key-here')
        .replace(/\{\{WEBHOOK_SECRET\}\}/g, config.webhookSecret || 'your-webhook-secret-here');
      
      await fs.writeFile(filePath, content);
    }
  }
}

async function createEnvFile(config: ProjectConfig): Promise<void> {
  const envPath = path.join(config.projectPath, '.env');
  const envExamplePath = path.join(config.projectPath, '.env.example');

  let envContent = '';
  if (await fs.pathExists(envExamplePath)) {
    envContent = await fs.readFile(envExamplePath, 'utf-8');
  } else {
    envContent = `# ZendFi Configuration
ZENDFI_API_KEY=${config.apiKey || 'your-api-key-here'}
ZENDFI_WEBHOOK_SECRET=${config.webhookSecret || 'your-webhook-secret-here'}
ZENDFI_ENVIRONMENT=${config.environment}
`;
  }

  envContent = envContent
    .replace(/\{\{API_KEY\}\}/g, config.apiKey || 'your-api-key-here')
    .replace(/\{\{WEBHOOK_SECRET\}\}/g, config.webhookSecret || 'your-webhook-secret-here')
    .replace(/\{\{ENVIRONMENT\}\}/g, config.environment);

  await fs.writeFile(envPath, envContent);
}