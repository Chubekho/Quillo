/**
 * esbuild.lambda.mjs — Bundle worker.ts → dist-lambda/index.js
 *
 * Usage: node esbuild.lambda.mjs
 *
 * Output: backend/dist-lambda/index.js (single-file bundle, CJS)
 *
 * Notes on dynamic imports:
 *   worker.ts uses `await import('./config/logger')` etc inside processMessage().
 *   esbuild --bundle handles dynamic imports by inlining them at build time
 *   since all targets are relative local modules (no code-splitting needed).
 *
 * Prisma engine decision (Bước 0.7):
 *   Using @prisma/adapter-pg (PrismaPg driver adapter) → Prisma v7 queryCompiler GA.
 *   Queries route through pg driver → NO native query engine binary needed.
 *   Lambda zip will be clean with no .so binary.
 */

import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(__dirname, 'dist-lambda');

// Ensure output directory exists
if (!existsSync(outdir)) {
  mkdirSync(outdir, { recursive: true });
}

const result = await esbuild.build({
  entryPoints: [resolve(__dirname, 'src/worker.ts')],
  outfile: resolve(outdir, 'index.js'),

  // Target: Lambda Node.js 20.x runtime
  platform: 'node',
  target: 'node20',

  // Single-file bundle — inline all runtime deps
  bundle: true,
  format: 'cjs', // CommonJS: aligns with tsconfig module=CommonJS; Lambda handler = exports.handler

  // Source map for CloudWatch debugging
  sourcemap: false, // keep zip small; enable 'inline' if debugging needed

  // Tree-shaking
  treeShaking: true,

  external: [],

  // Path alias resolution: mirrors tsconfig paths @/* → src/*
  alias: {
    '@': resolve(__dirname, 'src'),
    '@aws-sdk/client-cloudwatch-logs': resolve(__dirname, 'mock-aws.js'),
  },

  // Dùng inject để mock theo yêu cầu
  inject: [resolve(__dirname, 'mock-aws.js')],

  // Log level
  logLevel: 'info',

  // Metafile for bundle analysis (written alongside output)
  metafile: true,
});

// Write metafile for optional bundle analysis (esbuild --analyze)
if (result.metafile) {
  const { writeFileSync } = await import('fs');
  writeFileSync(resolve(outdir, 'meta.json'), JSON.stringify(result.metafile, null, 2));
  console.log('✓ dist-lambda/index.js built successfully');
  console.log('  Metafile written to dist-lambda/meta.json');
  console.log('  Run: npx esbuild --analyze dist-lambda/meta.json  (for bundle analysis)');
}
