export type DemoFlow = {
  baseUrl: string;
  credentials: {
    type: "basic" | "callback";
    username?: string;
    password?: string;
    callback?: () => Promise<void>;
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

export type FlowExecutionEvent =
  | { type: "started"; timestamp: number }
  | { type: "step-started"; stepIndex: number; step: DemoFlow["steps"][number] }
  | { type: "step-completed"; stepIndex: number }
  | { type: "step-retrying"; stepIndex: number; attempt: number }
  | { type: "step-failed"; stepIndex: number; error: string }
  | { type: "completed"; timestamp: number }
  | { type: "failed"; stepIndex: number; error: string };

export interface FlowExecutorOptions {
  headless?: boolean;
  recordingDir?: string;
  onEvent?: (event: FlowExecutionEvent) => void;
}
