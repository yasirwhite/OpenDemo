# Flow Executor - Integration Instructions

This document provides step-by-step instructions for integrating the Flow Executor module into OpenScreen.

## Overview

The Flow Executor enables OpenScreen to execute structured demo flows autonomously using Playwright, producing recorded videos without manual interaction.

## Files Created

### Core Module (Renderer-side)
- `src/lib/flowExecutor/types.ts` - Type definitions
- `src/lib/flowExecutor/executor.ts` - FlowExecutor class implementation
- `src/lib/flowExecutor/index.ts` - Module exports

### IPC Handler (Main process)
- `electron/ipc/flowExecutorHandler.ts` - Main process IPC handler with Playwright session management

### Documentation & Examples
- `docs/flow-executor.md` - Complete API documentation and usage guide
- `docs/FLOW_EXECUTOR_INTEGRATION.md` - This file
- `examples/flow-executor-integration.ts` - Sample demo flow
- `examples/main-integration-patch.ts` - Integration helper

## Integration Steps

### Step 1: Register IPC Handler in Main Process

Edit `electron/main.ts` and add the Flow Executor handler registration:

```typescript
// Add import at the top
import { registerFlowExecutorHandlers } from "./ipc/flowExecutorHandler";

// In the app.whenReady() block, after ensureRecordingsDir():
app.whenReady().then(async () => {
  // ... existing code ...
  
  await ensureRecordingsDir();
  
  // Add this line:
  registerFlowExecutorHandlers(RECORDINGS_DIR);
  
  // ... rest of existing code ...
});
```

### Step 2: Add IPC Methods to Preload Script

Edit `electron/preload.ts` to expose the Flow Executor API:

```typescript
// Add type imports at the top
import type { DemoFlow } from "../src/lib/flowExecutor/types";

// In the electronAPI object:
const electronAPI = {
  // ... existing methods ...
  
  executeDemoFlow: (flow: DemoFlow) =>
    ipcRenderer.invoke("execute-demo-flow", flow),
  
  onFlowExecutionEvent: (callback: (event: any) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, event: any) =>
      callback(event);
    ipcRenderer.on("flow-execution-event", listener);
    return () => ipcRenderer.removeListener("flow-execution-event", listener);
  },
};
```

### Step 3: Update Type Declarations

Edit `src/preload.d.ts` to add type definitions:

```typescript
import type { DemoFlow, FlowExecutionEvent } from "./lib/flowExecutor";

interface ElectronAPI {
  // ... existing methods ...
  
  executeDemoFlow: (flow: DemoFlow) => Promise<{
    success: boolean;
    videoPath?: string;
    error?: string;
  }>;
  
  onFlowExecutionEvent: (
    callback: (event: FlowExecutionEvent) => void
  ) => () => void;
}
```

### Step 4: Install Playwright (if not already installed)

The Flow Executor requires Playwright. Check if it's in `package.json`:

```bash
npm install playwright
```

If you need to install browser binaries:

```bash
npx playwright install chromium
```

### Step 5: Verify Installation

Build the project to ensure everything compiles:

```bash
npm run build
```

## Usage Example

Once integrated, you can use the Flow Executor from any renderer process:

```typescript
import type { DemoFlow } from "./lib/flowExecutor";

const demoFlow: DemoFlow = {
  baseUrl: "https://example.com",
  credentials: {
    type: "basic",
    username: "demo@example.com",
    password: "demo123",
  },
  steps: [
    { action: "goto", target: "/" },
    { action: "click", target: "a[href='/login']" },
    { action: "type", target: "input[name='email']", value: "demo@example.com" },
    { action: "type", target: "input[name='password']", value: "demo123" },
    { action: "click", target: "button[type='submit']" },
    { action: "wait", target: ".dashboard" },
  ],
  recording: {
    width: 1920,
    height: 1080,
    fps: 60,
  },
};

// Listen for events
const unsubscribe = window.electronAPI.onFlowExecutionEvent((event) => {
  console.log("Flow event:", event);
});

// Execute the flow
const result = await window.electronAPI.executeDemoFlow(demoFlow);

if (result.success) {
  console.log("Video saved to:", result.videoPath);
} else {
  console.error("Flow failed:", result.error);
}

unsubscribe();
```

## Testing

### Manual Test

Create a test file `test-flow-executor.ts` in your renderer:

```typescript
const testFlow: DemoFlow = {
  baseUrl: "https://example.com",
  credentials: { type: "basic" },
  steps: [
    { action: "goto", target: "/" },
    { action: "wait", timeoutMs: 2000 },
  ],
  recording: { width: 1280, height: 720, fps: 30 },
};

window.electronAPI.executeDemoFlow(testFlow).then(console.log);
```

### Unit Tests

You can test the renderer-side FlowExecutor class directly:

```typescript
import { FlowExecutor } from "./lib/flowExecutor";

const executor = new FlowExecutor({
  headless: true,
  recordingDir: "./test-recordings",
  onEvent: (event) => console.log(event),
});

await executor.execute(testFlow);
```

## Architecture Notes

### Event Flow

```
Renderer Process                Main Process
     │                               │
     │  executeDemoFlow(flow)        │
     ├──────────────────────────────>│
     │                               │
     │                          FlowExecutorSession
     │                          creates Playwright
     │                          browser & context
     │                               │
     │  flow-execution-event         │
     │<──────────────────────────────┤
     │  (step updates)               │
     │                               │
     │  { success, videoPath }       │
     │<──────────────────────────────┤
     │                               │
```

### Recording Pipeline

1. Playwright browser launched with video recording enabled
2. Viewport set to exact dimensions from `DemoFlow.recording`
3. Steps executed with retry logic and wait conditions
4. Video saved to `RECORDINGS_DIR` upon completion
5. Path returned to renderer process

### Integration with Existing Recorder

The Flow Executor is **independent** of the existing MediaRecorder-based system:

- **Existing**: User-initiated screen/window recording via `getDisplayMedia()`
- **Flow Executor**: Automated Playwright browser recording via `recordVideo`

Both produce `.webm` files in `RECORDINGS_DIR` and can be edited using the same video editor component.

## Troubleshooting

### Issue: Playwright not found

**Solution**: Ensure Playwright is installed and browser binaries are downloaded:
```bash
npm install playwright
npx playwright install chromium
```

### Issue: Video not saved

**Solution**: Check that `RECORDINGS_DIR` exists and is writable. The directory is created automatically in `ensureRecordingsDir()`.

### Issue: Steps failing with timeout

**Solution**: Increase `timeoutMs` for slow-loading pages:
```typescript
{ action: "goto", target: "/slow-page", timeoutMs: 60000 }
```

### Issue: IPC handler not registered

**Solution**: Verify `registerFlowExecutorHandlers()` is called in `app.whenReady()` before any IPC calls are made.

## Advanced Configuration

### Custom Recording Directory

Pass a custom directory when registering the handler:

```typescript
import path from "node:path";
const customDir = path.join(app.getPath("userData"), "demo-recordings");
registerFlowExecutorHandlers(customDir);
```

### Headless Mode

The Flow Executor runs in headed mode by default (browser visible). This cannot be changed via the IPC interface but can be modified in `flowExecutorHandler.ts`:

```typescript
this.browser = await chromium.launch({ headless: true });
```

### Video Quality

Playwright's video recording quality is controlled by the viewport size. Higher resolutions produce larger files:

- 1280x720 (HD): ~10-20 MB/min
- 1920x1080 (FHD): ~20-40 MB/min
- 3840x2160 (4K): ~80-150 MB/min

## Future Enhancements

Potential additions to the Flow Executor:

1. **Data Seeding API**: Allow flows to call backend APIs to seed demo data
2. **Multi-page Support**: Handle multiple tabs/windows
3. **Screenshot Steps**: Capture screenshots at specific points
4. **Custom Wait Conditions**: Beyond element visibility (e.g., network requests)
5. **Error Recovery Strategies**: Custom retry logic per step
6. **Video Post-processing**: Trim, overlay, or edit recordings automatically

## Support

For issues or questions about the Flow Executor:

1. Check the [API documentation](./flow-executor.md)
2. Review the [example code](../examples/flow-executor-integration.ts)
3. File an issue in the OpenScreen repository

## License

The Flow Executor module follows the same license as OpenScreen.
