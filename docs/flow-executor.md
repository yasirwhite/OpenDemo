# Flow Executor Integration Guide

## Overview

The Flow Executor is a new module that enables OpenScreen to execute structured demo flows autonomously using Playwright. It takes a `DemoFlow` specification and produces a recorded video output.

## Architecture

### Components

1. **FlowExecutor** (`src/lib/flowExecutor/`) - Renderer-side TypeScript implementation
2. **FlowExecutorSession** (`electron/ipc/flowExecutorHandler.ts`) - Main process IPC handler
3. **Event Emission** - Real-time execution events via IPC

### Integration Points

- **IPC Handler**: `execute-demo-flow` - Executes a flow and returns result
- **IPC Event**: `flow-execution-event` - Real-time execution progress events
- **Recording Output**: Uses Playwright's built-in video recording (`.webm`)

## DemoFlow Type Specification

```typescript
type DemoFlow = {
  baseUrl: string;
  credentials: {
    type: "basic" | "callback";
    username?: string;
    password?: string;
  };
  steps: Array<{
    action: "goto" | "click" | "type" | "wait" | "assert" | "login";
    target?: string;
    value?: string;
    timeoutMs?: number;
  }>;
  recording: {
    width: number;
    height: number;
    fps: number;
  };
};
```

### Step Actions

- **goto**: Navigate to URL (relative to baseUrl or absolute)
- **click**: Click element matching selector
- **type**: Fill input with value
- **wait**: Wait for selector or timeout
- **assert**: Assert element exists (and optionally matches text)
- **login**: Navigate to login page (credentials handled separately)

## Event Emission Contract

Events are emitted via IPC during execution:

```typescript
type FlowExecutionEvent =
  | { type: "started"; timestamp: number }
  | { type: "step-started"; stepIndex: number; step: DemoFlow["steps"][number] }
  | { type: "step-completed"; stepIndex: number }
  | { type: "step-retrying"; stepIndex: number; attempt: number }
  | { type: "step-failed"; stepIndex: number; error: string }
  | { type: "completed"; timestamp: number }
  | { type: "failed"; stepIndex: number; error: string };
```

## Setup

### 1. Register IPC Handler

In `electron/main.ts`, register the Flow Executor handler:

```typescript
import { registerFlowExecutorHandlers } from "./ipc/flowExecutorHandler";

// After creating app ready handler
app.whenReady().then(() => {
  registerFlowExecutorHandlers(RECORDINGS_DIR);
  // ... other handlers
});
```

### 2. Add IPC Types to Preload

In `electron/preload.ts`, expose the Flow Executor API:

```typescript
const electronAPI = {
  // ... existing methods
  
  executeDemoFlow: (flow: DemoFlow) =>
    ipcRenderer.invoke("execute-demo-flow", flow),
  
  onFlowExecutionEvent: (callback: (event: FlowExecutionEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, event: FlowExecutionEvent) =>
      callback(event);
    ipcRenderer.on("flow-execution-event", listener);
    return () => ipcRenderer.removeListener("flow-execution-event", listener);
  },
};
```

### 3. Update Type Declarations

In `src/preload.d.ts`:

```typescript
interface ElectronAPI {
  // ... existing methods
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

## Usage Example

### Basic Usage

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
    { action: "goto", target: "/login" },
    { action: "type", target: "#email", value: "demo@example.com" },
    { action: "type", target: "#password", value: "demo123" },
    { action: "click", target: "button[type='submit']" },
    { action: "wait", target: ".dashboard" },
    { action: "assert", target: "h1", value: "Welcome to Dashboard" },
    { action: "click", target: "nav a[href='/settings']" },
    { action: "wait", target: ".settings-page", timeoutMs: 5000 },
  ],
  recording: {
    width: 1920,
    height: 1080,
    fps: 60,
  },
};

// Execute the flow
const result = await window.electronAPI.executeDemoFlow(demoFlow);

if (result.success) {
  console.log("Flow completed successfully!");
  console.log("Video saved to:", result.videoPath);
} else {
  console.error("Flow failed:", result.error);
}
```

### With Event Monitoring

```typescript
// Listen for execution events
const unsubscribe = window.electronAPI.onFlowExecutionEvent((event) => {
  switch (event.type) {
    case "started":
      console.log("Execution started");
      break;
    case "step-started":
      console.log(`Step ${event.stepIndex}: ${event.step.action}`);
      break;
    case "step-completed":
      console.log(`Step ${event.stepIndex} completed`);
      break;
    case "step-retrying":
      console.log(`Retrying step ${event.stepIndex} (attempt ${event.attempt})`);
      break;
    case "step-failed":
      console.error(`Step ${event.stepIndex} failed: ${event.error}`);
      break;
    case "completed":
      console.log("Flow completed successfully");
      break;
    case "failed":
      console.error(`Flow failed at step ${event.stepIndex}: ${event.error}`);
      break;
  }
});

const result = await window.electronAPI.executeDemoFlow(demoFlow);

// Clean up listener
unsubscribe();
```

### React Hook Example

```typescript
import { useState, useEffect } from "react";
import type { DemoFlow, FlowExecutionEvent } from "../lib/flowExecutor";

export function useDemoFlowExecutor() {
  const [executing, setExecuting] = useState(false);
  const [events, setEvents] = useState<FlowExecutionEvent[]>([]);
  const [result, setResult] = useState<{
    success: boolean;
    videoPath?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onFlowExecutionEvent((event) => {
      setEvents((prev) => [...prev, event]);
    });

    return () => unsubscribe();
  }, []);

  const executeFlow = async (flow: DemoFlow) => {
    setExecuting(true);
    setEvents([]);
    setResult(null);

    const flowResult = await window.electronAPI.executeDemoFlow(flow);

    setResult(flowResult);
    setExecuting(false);

    return flowResult;
  };

  return { executeFlow, executing, events, result };
}
```

## Implementation Details

### Retry Logic

- Each step is retried up to 2 additional times (3 total attempts) on failure
- 1-second delay between retry attempts
- If all retries fail, execution aborts and emits a failure event

### UI Readiness Waiting

All actions include explicit waiting conditions:

- **goto**: Waits for `networkidle` state
- **click**: Waits for element visibility, then waits for `networkidle` after click
- **type**: Waits for element visibility before typing
- **wait**: Waits for selector visibility or timeout
- **assert**: Waits for element visibility before assertion

### Recording Configuration

- Viewport size is set exactly to `recording.width` x `recording.height`
- Playwright's video recorder enforces these dimensions for output
- FPS is recorded in metadata but Playwright controls actual frame rate
- Output format is `.webm` (Playwright default)

### Authentication

Two credential modes:

1. **basic**: Username/password stored in flow, used with login step
2. **callback**: Reserved for future extension (not implemented in IPC handler)

### Determinism

Execution is deterministic given:
- Identical `DemoFlow` input
- Same application state at `baseUrl`
- No external factors (network latency, server-side changes)

Wait conditions and retry logic ensure consistency across runs.

## Limitations

1. **No DOM rewriting**: All state changes come from real browser interactions
2. **No app-specific instrumentation**: Works with any web app via standard selectors
3. **No data seeding API**: Flow Executor focuses on UI interaction only
4. **No cursor recording**: Uses Playwright's recording, which doesn't capture system cursor

## Future Extensions

Potential enhancements:

- API-based data seeding hooks
- Custom fixture injection layer
- Cursor position tracking integration
- Support for multiple pages/tabs
- Screenshot capture at specific steps
- Video quality/codec configuration
