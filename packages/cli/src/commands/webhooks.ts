/**
 * Webhooks Command
 * Local webhook testing and management
 */

import chalk from 'chalk';
import express from 'express';
import ora from 'ora';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface WebhookListenerOptions {
  port?: string;
  forwardTo?: string;
}

export async function listenWebhooks(options: WebhookListenerOptions): Promise<void> {
  console.log(chalk.cyan.bold('\n🎧 ZendFi Webhook Listener\n'));

  const port = options.port || '3000';
  const forwardTo = options.forwardTo;

  // Check if ngrok is installed
  const hasNgrok = await checkCommandExists('ngrok');
  const hasCloudflared = await checkCommandExists('cloudflared');

  if (!hasNgrok && !hasCloudflared) {
    console.log(chalk.red('❌ No tunnel service found!\n'));
    console.log(chalk.gray('Please install one of the following:\n'));
    console.log(chalk.cyan('  • ngrok:       ') + chalk.gray('https://ngrok.com/download'));
    console.log(chalk.cyan('  • cloudflared: ') + chalk.gray('https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/'));
    console.log('');
    return;
  }

  // Choose tunnel service
  let tunnelService = 'ngrok';
  if (hasNgrok && hasCloudflared) {
    const { service } = await inquirer.prompt([
      {
        type: 'list',
        name: 'service',
        message: 'Which tunnel service would you like to use?',
        choices: [
          { name: 'ngrok', value: 'ngrok' },
          { name: 'Cloudflare Tunnel', value: 'cloudflared' },
        ],
      },
    ]);
    tunnelService = service;
  } else if (hasCloudflared) {
    tunnelService = 'cloudflared';
  }

  // Start Express server
  const app = express();
  app.use(express.json());

  let webhookCount = 0;

interface WebhookPayload {
    event?: string;
    payment_id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    [key: string]: any;
}

    app.post('/webhooks', (req: express.Request<{}, {}, WebhookPayload>, res: express.Response) => {
        webhookCount++;
        const timestamp: string = new Date().toLocaleTimeString();
        
        console.log(chalk.cyan(`\n[${timestamp}] `) + chalk.green(`Webhook #${webhookCount} received`));
        console.log(chalk.gray('  Event:   ') + chalk.white(req.body.event || 'unknown'));
        console.log(chalk.gray('  Payment: ') + chalk.white(req.body.payment_id || 'unknown'));
        console.log(chalk.gray('  Status:  ') + getStatusBadge(req.body.status));
        
        if (req.body.amount) {
            console.log(chalk.gray('  Amount:  ') + chalk.white(`$${req.body.amount} ${req.body.currency || 'USD'}`));
        }

        // Forward webhook if needed
        if (forwardTo) {
            forwardWebhook(forwardTo, req.body);
        }

        res.status(200).json({ success: true });
    });

interface HealthResponse {
    status: string;
    webhooksReceived: number;
}

app.get('/health', (_req: express.Request, res: express.Response<HealthResponse>) => {
    res.json({ status: 'ok', webhooksReceived: webhookCount });
});

  const server = app.listen(port, () => {
    console.log(chalk.green(`✓ Local server started on port ${port}`));
  });

  // Start tunnel
  const spinner = ora(`Starting ${tunnelService} tunnel...`).start();
  
  try {
    let tunnelUrl: string;
    let tunnelProcess: any;

    if (tunnelService === 'ngrok') {
      tunnelProcess = exec(`ngrok http ${port} --log=stdout`);
      tunnelUrl = await waitForNgrokUrl(tunnelProcess);
    } else {
      tunnelProcess = exec(`cloudflared tunnel --url http://localhost:${port}`);
      tunnelUrl = await waitForCloudflaredUrl(tunnelProcess);
    }

    spinner.succeed(chalk.green(`Tunnel active: ${tunnelUrl}`));

    console.log(chalk.cyan('\n📋 Configuration:'));
    console.log(chalk.gray('  Webhook URL: ') + chalk.white(`${tunnelUrl}/webhooks`));
    console.log(chalk.gray('  Health:      ') + chalk.white(`${tunnelUrl}/health`));
    
    console.log(chalk.cyan('\n🔧 Setup Instructions:'));
    console.log(chalk.gray('  1. Copy the webhook URL above'));
    console.log(chalk.gray('  2. Go to ZendFi Dashboard → Settings → Webhooks'));
    console.log(chalk.gray('  3. Add the webhook URL'));
    console.log(chalk.gray('  4. Create a test payment to trigger webhooks'));

    console.log(chalk.yellow('\n👂 Listening for webhooks... (Press Ctrl+C to stop)\n'));

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n⏸️  Shutting down...'));
      server.close();
      tunnelProcess?.kill();
      console.log(chalk.green(`\n✓ Received ${webhookCount} webhooks total\n`));
      process.exit(0);
    });

  } catch (error) {
    spinner.fail(chalk.red('Failed to start tunnel'));
    console.error(error);
    server.close();
    process.exit(1);
  }
}

/**
 * Check if a command exists
 */
async function checkCommandExists(command: string): Promise<boolean> {
  try {
    await execAsync(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for ngrok URL
 */
function waitForNgrokUrl(process: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for ngrok URL'));
    }, 30000);

    process.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      const urlMatch = output.match(/url=(https:\/\/[^\s]+)/);
      if (urlMatch && urlMatch[1]) {
        clearTimeout(timeout);
        resolve(urlMatch[1]);
      }
    });

    process.stderr.on('data', (data: Buffer) => {
      console.error(chalk.red(data.toString()));
    });
  });
}

/**
 * Wait for Cloudflare tunnel URL
 */
function waitForCloudflaredUrl(process: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for cloudflared URL'));
    }, 30000);

    process.stderr.on('data', (data: Buffer) => {
      const output = data.toString();
      const urlMatch = output.match(/(https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com)/);
      if (urlMatch && urlMatch[1]) {
        clearTimeout(timeout);
        resolve(urlMatch[1]);
      }
    });
  });
}

/**
 * Forward webhook to another URL
 */
async function forwardWebhook(url: string, payload: any): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (response.ok) {
      console.log(chalk.gray('  → Forwarded to ') + chalk.cyan(url));
    } else {
      console.log(chalk.red('  → Failed to forward'));
    }
  } catch (error) {
    console.log(chalk.red('  → Forward error: ') + chalk.gray(error instanceof Error ? error.message : 'Unknown'));
  }
}

/**
 * Get colored status badge
 */
function getStatusBadge(status: string): string {
  switch (status) {
    case 'completed':
    case 'confirmed':
      return chalk.green('✓ ' + status);
    case 'pending':
      return chalk.yellow('⏳ ' + status);
    case 'failed':
    case 'expired':
      return chalk.red('✗ ' + status);
    default:
      return chalk.gray(status || 'unknown');
  }
}
