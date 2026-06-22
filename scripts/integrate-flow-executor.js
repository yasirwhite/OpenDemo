#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Flow Executor Integration...\n');

// Get project root
const projectRoot = path.resolve(__dirname, '..');

// File paths
const mainFile = path.join(projectRoot, 'electron', 'main.ts');
const preloadFile = path.join(projectRoot, 'electron', 'preload.ts');
const preloadDtsFile = path.join(projectRoot, 'electron', 'electron-env.d.ts');

// Backup files
console.log('📦 Creating backups...');
fs.copyFileSync(mainFile, mainFile + '.backup');
fs.copyFileSync(preloadFile, preloadFile + '.backup');
fs.copyFileSync(preloadDtsFile, preloadDtsFile + '.backup');
console.log('   ✓ Backups created (.backup files)\n');

// 1. Patch electron/main.ts
console.log('🔧 Patching electron/main.ts...');
let mainContent = fs.readFileSync(mainFile, 'utf8');

if (mainContent.includes('registerFlowExecutorHandlers')) {
  console.log('   ⚠ Flow Executor already integrated in main.ts, skipping...');
} else {
  // Add import after registerIpcHandlers import
  const importLine = 'import { registerIpcHandlers } from "./ipc/handlers";';
  const newImport = 'import { registerFlowExecutorHandlers } from "./ipc/flowExecutorHandler";';
  
  if (mainContent.includes(importLine)) {
    mainContent = mainContent.replace(
      importLine,
      `${importLine}\n${newImport}`
    );
  } else {
    // Fallback: add at the beginning after other imports
    const lines = mainContent.split('\n');
    const lastImportIndex = lines.findIndex(line => line.startsWith('import ') && line.includes('from'));
    if (lastImportIndex !== -1) {
      // Find the last import
      let insertIndex = lastImportIndex;
      for (let i = lastImportIndex + 1; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          insertIndex = i;
        } else if (lines[i].trim() !== '') {
          break;
        }
      }
      lines.splice(insertIndex + 1, 0, newImport);
      mainContent = lines.join('\n');
    }
  }
  
  // Add handler registration after ensureRecordingsDir()
  const ensureLine = 'await ensureRecordingsDir();';
  if (mainContent.includes(ensureLine)) {
    mainContent = mainContent.replace(
      ensureLine,
      `${ensureLine}\n\tregisterFlowExecutorHandlers(RECORDINGS_DIR);`
    );
  }
  
  fs.writeFileSync(mainFile, mainContent, 'utf8');
  console.log('   ✓ main.ts patched successfully');
}
console.log('');

// 2. Patch electron/preload.ts
console.log('🔧 Patching electron/preload.ts...');
let preloadContent = fs.readFileSync(preloadFile, 'utf8');

if (preloadContent.includes('executeDemoFlow')) {
  console.log('   ⚠ Flow Executor already integrated in preload.ts, skipping...');
} else {
  // Add type import at the top
  const typeImport = 'import type { DemoFlow } from "../src/lib/flowExecutor/types";\n';
  preloadContent = typeImport + preloadContent;
  
  // Find the electronAPI object and add methods
  const apiPattern = /(const electronAPI = \{[\s\S]*?)(};)/;
  const match = preloadContent.match(apiPattern);
  
  if (match) {
    const newMethods = `
\texecuteDemoFlow: (flow: DemoFlow) =>
\t\tipcRenderer.invoke("execute-demo-flow", flow),

\tonFlowExecutionEvent: (callback: (event: any) => void) => {
\t\tconst listener = (_event: Electron.IpcRendererEvent, event: any) =>
\t\t\tcallback(event);
\t\tipcRenderer.on("flow-execution-event", listener);
\t\treturn () => ipcRenderer.removeListener("flow-execution-event", listener);
\t},

`;
    
    // Insert before the closing brace
    preloadContent = preloadContent.replace(
      apiPattern,
      `$1${newMethods}$2`
    );
  }
  
  fs.writeFileSync(preloadFile, preloadContent, 'utf8');
  console.log('   ✓ preload.ts patched successfully');
}
console.log('');

// 3. Patch electron/electron-env.d.ts
console.log('🔧 Patching electron/electron-env.d.ts...');
let preloadDtsContent = fs.readFileSync(preloadDtsFile, 'utf8');

if (preloadDtsContent.includes('executeDemoFlow')) {
  console.log('   ⚠ Flow Executor already integrated in electron-env.d.ts, skipping...');
} else {
  // Add type imports at the top
  const typeImports = 'import type { DemoFlow, FlowExecutionEvent } from "./lib/flowExecutor";\n';
  preloadDtsContent = typeImports + preloadDtsContent;
  
  // Find the ElectronAPI interface and add methods
  const interfacePattern = /(interface ElectronAPI \{[\s\S]*?)(})/;
  const match = preloadDtsContent.match(interfacePattern);
  
  if (match) {
    const newMethods = `
\texecuteDemoFlow: (flow: DemoFlow) => Promise<{
\t\tsuccess: boolean;
\t\tvideoPath?: string;
\t\terror?: string;
\t}>;

\tonFlowExecutionEvent: (
\t\tcallback: (event: FlowExecutionEvent) => void
\t) => () => void;

`;
    
    // Insert before the closing brace
    preloadDtsContent = preloadDtsContent.replace(
      interfacePattern,
      `$1${newMethods}$2`
    );
  }
  
  fs.writeFileSync(preloadDtsFile, preloadDtsContent, 'utf8');
  console.log('   ✓ electron-env.d.ts patched successfully');
}
console.log('');

// 4. Check Playwright installation
console.log('📚 Checking Playwright installation...');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.dependencies?.playwright && !packageJson.devDependencies?.playwright) {
  console.log('   ⚠ Playwright not found in package.json');
  console.log('   Installing Playwright...');
  try {
    execSync('npm install playwright', { cwd: projectRoot, stdio: 'inherit' });
    console.log('   ✓ Playwright installed');
  } catch (error) {
    console.error('   ❌ Failed to install Playwright');
    console.error('   Run "npm install playwright" manually');
  }
} else {
  console.log('   ✓ Playwright already installed');
}
console.log('');

// 5. Verify TypeScript compilation
console.log('🔍 Verifying TypeScript compilation...');
try {
  execSync('npx tsc --noEmit --project tsconfig.json', {
    cwd: projectRoot,
    stdio: 'pipe',
    encoding: 'utf8'
  });
  console.log('   ✓ TypeScript compilation successful');
} catch (error) {
  if (error.stdout && error.stdout.includes('error TS')) {
    console.log('   ❌ TypeScript compilation errors found');
    console.log('   Run "npx tsc --noEmit" to see details');
    console.log('\n⚠️  Integration complete but with TypeScript errors');
    console.log('   Backups saved as .backup files');
    process.exit(1);
  }
}
console.log('');

console.log('✅ Flow Executor Integration Complete!\n');
console.log('📝 Next steps:');
console.log('   1. Review the changes in the patched files');
console.log('   2. Test with: npm run dev');
console.log('   3. Use example from: examples/flow-executor-integration.ts\n');
console.log('📚 Documentation:');
console.log('   - API Reference: docs/flow-executor.md');
console.log('   - Integration Guide: docs/FLOW_EXECUTOR_INTEGRATION.md\n');
console.log('🔄 To revert: restore from .backup files\n');
