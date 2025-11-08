/**
 * Framework Detection Utility
 * Detects the framework/library used in a project
 */

import fs from 'fs-extra';
import path from 'path';

export type Framework =
  | 'nextjs-app'      // Next.js 13+ with App Router
  | 'nextjs-pages'    // Next.js with Pages Router
  | 'express'         // Express.js
  | 'react'           // React (CRA, Vite)
  | 'vue'             // Vue.js
  | 'svelte'          // SvelteKit
  | 'node'            // Plain Node.js
  | 'unknown';

export interface FrameworkInfo {
  framework: Framework;
  name: string;
  version?: string;
  hasTypeScript: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
}

/**
 * Detect framework from project files
 */
export async function detectFramework(projectPath: string): Promise<FrameworkInfo> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  
  if (!await fs.pathExists(packageJsonPath)) {
    throw new Error('No package.json found. Make sure you\'re in a valid Node.js project.');
  }

  const packageJson = await fs.readJson(packageJsonPath);
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  // Detect package manager
  const packageManager = await detectPackageManager(projectPath);

  // Check for TypeScript
  const hasTypeScript = 
    await fs.pathExists(path.join(projectPath, 'tsconfig.json')) ||
    !!deps.typescript;

  // Detect Next.js
  if (deps.next) {
    const version = deps.next.replace(/[\^~]/, '');
    const majorVersion = parseInt(version.split('.')[0]);

    // Check if using App Router (Next.js 13+)
    const hasAppDir = await fs.pathExists(path.join(projectPath, 'app'));
    const hasPagesDir = await fs.pathExists(path.join(projectPath, 'pages'));

    if (majorVersion >= 13 && hasAppDir) {
      return {
        framework: 'nextjs-app',
        name: 'Next.js (App Router)',
        version,
        hasTypeScript,
        packageManager,
      };
    } else {
      return {
        framework: 'nextjs-pages',
        name: 'Next.js (Pages Router)',
        version,
        hasTypeScript,
        packageManager,
      };
    }
  }

  // Detect Express
  if (deps.express) {
    return {
      framework: 'express',
      name: 'Express.js',
      version: deps.express?.replace(/[\^~]/, ''),
      hasTypeScript,
      packageManager,
    };
  }

  // Detect React
  if (deps.react && !deps.next) {
    return {
      framework: 'react',
      name: 'React',
      version: deps.react?.replace(/[\^~]/, ''),
      hasTypeScript,
      packageManager,
    };
  }

  // Detect Vue
  if (deps.vue) {
    return {
      framework: 'vue',
      name: 'Vue.js',
      version: deps.vue?.replace(/[\^~]/, ''),
      hasTypeScript,
      packageManager,
    };
  }

  // Detect Svelte
  if (deps['@sveltejs/kit']) {
    return {
      framework: 'svelte',
      name: 'SvelteKit',
      version: deps['@sveltejs/kit']?.replace(/[\^~]/, ''),
      hasTypeScript,
      packageManager,
    };
  }

  // Plain Node.js
  return {
    framework: 'node',
    name: 'Node.js',
    hasTypeScript,
    packageManager,
  };
}

/**
 * Detect package manager from lock files
 */
async function detectPackageManager(projectPath: string): Promise<'npm' | 'yarn' | 'pnpm' | 'bun'> {
  if (await fs.pathExists(path.join(projectPath, 'bun.lockb'))) {
    return 'bun';
  }
  if (await fs.pathExists(path.join(projectPath, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (await fs.pathExists(path.join(projectPath, 'yarn.lock'))) {
    return 'yarn';
  }
  return 'npm';
}

/**
 * Get install command for package manager
 */
export function getInstallCommand(packageManager: string, packages: string[]): string {
  const pkgs = packages.join(' ');
  
  switch (packageManager) {
    case 'yarn':
      return `yarn add ${pkgs}`;
    case 'pnpm':
      return `pnpm add ${pkgs}`;
    case 'bun':
      return `bun add ${pkgs}`;
    default:
      return `npm install ${pkgs}`;
  }
}

/**
 * Get recommended file paths for framework
 */
export function getFrameworkPaths(framework: Framework): {
  libPath: string;
  webhookPath: string;
  envFile: string;
} {
  switch (framework) {
    case 'nextjs-app':
      return {
        libPath: 'lib/zendfi.ts',
        webhookPath: 'app/api/webhooks/zendfi/route.ts',
        envFile: '.env.local',
      };
    case 'nextjs-pages':
      return {
        libPath: 'lib/zendfi.ts',
        webhookPath: 'pages/api/webhooks/zendfi.ts',
        envFile: '.env.local',
      };
    case 'express':
      return {
        libPath: 'src/lib/zendfi.ts',
        webhookPath: 'src/routes/webhooks.ts',
        envFile: '.env',
      };
    default:
      return {
        libPath: 'src/lib/zendfi.ts',
        webhookPath: 'src/webhooks.ts',
        envFile: '.env',
      };
  }
}
