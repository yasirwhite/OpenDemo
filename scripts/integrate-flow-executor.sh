#!/bin/bash

# Flow Executor Integration Script
# This script automatically integrates the Flow Executor into OpenScreen

set -e

echo "🚀 Starting Flow Executor Integration..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# File paths
MAIN_FILE="$PROJECT_ROOT/electron/main.ts"
PRELOAD_FILE="$PROJECT_ROOT/electron/preload.ts"
PRELOAD_DTS_FILE="$PROJECT_ROOT/src/preload.d.ts"

# Backup files
echo "📦 Creating backups..."
cp "$MAIN_FILE" "$MAIN_FILE.backup"
cp "$PRELOAD_FILE" "$PRELOAD_FILE.backup"
cp "$PRELOAD_DTS_FILE" "$PRELOAD_DTS_FILE.backup"
echo "   ✓ Backups created (.backup files)"
echo ""

# 1. Patch electron/main.ts
echo "🔧 Patching electron/main.ts..."

# Check if already integrated
if grep -q "registerFlowExecutorHandlers" "$MAIN_FILE"; then
    echo "   ⚠ Flow Executor already integrated in main.ts, skipping..."
else
    # Add import at the top (after other imports)
    sed -i '/^import { registerIpcHandlers } from "\.\/ipc\/handlers";/a import { registerFlowExecutorHandlers } from "./ipc/flowExecutorHandler";' "$MAIN_FILE"
    
    # Add handler registration after ensureRecordingsDir()
    sed -i '/await ensureRecordingsDir();/a \\tregisterFlowExecutorHandlers(RECORDINGS_DIR);' "$MAIN_FILE"
    
    echo "   ✓ main.ts patched successfully"
fi
echo ""

# 2. Patch electron/preload.ts
echo "🔧 Patching electron/preload.ts..."

if grep -q "executeDemoFlow" "$PRELOAD_FILE"; then
    echo "   ⚠ Flow Executor already integrated in preload.ts, skipping..."
else
    # Add type import at the top
    sed -i '1i import type { DemoFlow } from "../src/lib/flowExecutor/types";' "$PRELOAD_FILE"
    
    # Find the electronAPI object and add methods before the closing brace
    # This is tricky, so we'll use a more robust approach with awk
    awk '
    /^const electronAPI = {/ { in_api = 1; print; next }
    in_api && /^};/ {
        print "\texecuteDemoFlow: (flow: DemoFlow) =>"
        print "\t\tipcRenderer.invoke(\"execute-demo-flow\", flow),"
        print ""
        print "\tonFlowExecutionEvent: (callback: (event: any) => void) => {"
        print "\t\tconst listener = (_event: Electron.IpcRendererEvent, event: any) =>"
        print "\t\t\tcallback(event);"
        print "\t\tipcRenderer.on(\"flow-execution-event\", listener);"
        print "\t\treturn () => ipcRenderer.removeListener(\"flow-execution-event\", listener);"
        print "\t},"
        in_api = 0
    }
    { print }
    ' "$PRELOAD_FILE" > "$PRELOAD_FILE.tmp" && mv "$PRELOAD_FILE.tmp" "$PRELOAD_FILE"
    
    echo "   ✓ preload.ts patched successfully"
fi
echo ""

# 3. Patch src/preload.d.ts
echo "🔧 Patching src/preload.d.ts..."

if grep -q "executeDemoFlow" "$PRELOAD_DTS_FILE"; then
    echo "   ⚠ Flow Executor already integrated in preload.d.ts, skipping..."
else
    # Add type imports at the top
    sed -i '1i import type { DemoFlow, FlowExecutionEvent } from "./lib/flowExecutor";' "$PRELOAD_DTS_FILE"
    
    # Find the ElectronAPI interface and add methods before the closing brace
    awk '
    /^interface ElectronAPI {/ { in_interface = 1; print; next }
    in_interface && /^}/ {
        print "\texecuteDemoFlow: (flow: DemoFlow) => Promise<{"
        print "\t\tsuccess: boolean;"
        print "\t\tvideoPath?: string;"
        print "\t\terror?: string;"
        print "\t}>;"
        print ""
        print "\tonFlowExecutionEvent: ("
        print "\t\tcallback: (event: FlowExecutionEvent) => void"
        print "\t) => () => void;"
        in_interface = 0
    }
    { print }
    ' "$PRELOAD_DTS_FILE" > "$PRELOAD_DTS_FILE.tmp" && mv "$PRELOAD_DTS_FILE.tmp" "$PRELOAD_DTS_FILE"
    
    echo "   ✓ preload.d.ts patched successfully"
fi
echo ""

# 4. Check if Playwright is installed
echo "📚 Checking Playwright installation..."
if ! grep -q '"playwright"' "$PROJECT_ROOT/package.json"; then
    echo "   ⚠ Playwright not found in package.json"
    echo "   Installing Playwright..."
    npm install playwright
    echo "   ✓ Playwright installed"
else
    echo "   ✓ Playwright already installed"
fi
echo ""

# 5. Verify TypeScript compilation
echo "🔍 Verifying TypeScript compilation..."
if npx tsc --noEmit --project "$PROJECT_ROOT/tsconfig.json" 2>&1 | grep -q "error TS"; then
    echo "   ❌ TypeScript compilation errors found"
    echo "   Run 'npx tsc --noEmit' to see details"
    echo ""
    echo "⚠️  Integration complete but with TypeScript errors"
    echo "   Backups saved as .backup files"
    exit 1
else
    echo "   ✓ TypeScript compilation successful"
fi
echo ""

echo "✅ Flow Executor Integration Complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Review the changes in the patched files"
echo "   2. Test with: npm run dev"
echo "   3. Use example from: examples/flow-executor-integration.ts"
echo ""
echo "📚 Documentation:"
echo "   - API Reference: docs/flow-executor.md"
echo "   - Integration Guide: docs/FLOW_EXECUTOR_INTEGRATION.md"
echo ""
echo "🔄 To revert: restore from .backup files"
echo ""
