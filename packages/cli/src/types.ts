/**
 * CLI Types
 */

export type Template = 'nextjs-ecommerce' | 'nextjs-saas' | 'express-api';

export type Environment = 'development' | 'production';

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

export interface CliOptions {
  template?: Template;
  env?: Environment;
  yes?: boolean;
  skipInstall?: boolean;
  skipGit?: boolean;
}

export interface ProjectConfig {
  name: string;
  projectName: string;
  path: string;
  projectPath: string;
  template: Template;
  environment: Environment;
  packageManager: PackageManager;
  apiKey?: string;
  webhookSecret?: string;
}

export interface TemplateConfig {
  name: string;
  description: string;
  framework: string;
  features: string[];
  requiresAuth: boolean;
}

export const TEMPLATES: Record<Template, TemplateConfig> = {
  'nextjs-ecommerce': {
    name: 'Next.js E-commerce',
    description: 'Full-featured online store with product catalog and checkout',
    framework: 'Next.js 14 (App Router)',
    features: [
      'Product catalog page',
      'Shopping cart',
      'Checkout with ZendFi',
      'Order confirmation',
      'Webhook handler',
      'Admin dashboard (embedded)',
    ],
    requiresAuth: false,
  },
  'nextjs-saas': {
    name: 'Next.js SaaS',
    description: 'Subscription-based SaaS application',
    framework: 'Next.js 14 (App Router)',
    features: [
      'Subscription plans page',
      'User authentication',
      'Customer portal',
      'Webhook handler',
      'Usage tracking',
      'Payment history',
    ],
    requiresAuth: true,
  },
  'express-api': {
    name: 'Express API',
    description: 'Backend API with payment endpoints',
    framework: 'Express.js',
    features: [
      'Payment creation endpoint',
      'Webhook handler',
      'CORS configuration',
      'Environment setup',
      'TypeScript support',
    ],
    requiresAuth: false,
  },
};
