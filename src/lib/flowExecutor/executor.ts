import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { DemoFlow, FlowExecutionEvent, FlowExecutorOptions } from "./types";

const MAX_RETRIES = 2;
const DEFAULT_TIMEOUT = 30000;

export class FlowExecutor {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: FlowExecutorOptions;

  constructor(options: FlowExecutorOptions = {}) {
    this.options = options;
  }

  private emitEvent(event: FlowExecutionEvent): void {
    if (this.options.onEvent) {
      this.options.onEvent(event);
    }
  }

  async execute(flow: DemoFlow): Promise<{ success: boolean; error?: string }> {
    try {
      this.emitEvent({ type: "started", timestamp: Date.now() });

      this.browser = await chromium.launch({
        headless: this.options.headless ?? false,
      });

      this.context = await this.browser.newContext({
        viewport: {
          width: flow.recording.width,
          height: flow.recording.height,
        },
        recordVideo: {
          dir: this.options.recordingDir ?? "./recordings",
          size: {
            width: flow.recording.width,
            height: flow.recording.height,
          },
        },
      });

      this.page = await this.context.newPage();

      if (flow.credentials.type === "basic" && flow.credentials.username && flow.credentials.password) {
        const loginStep = flow.steps.find((s) => s.action === "login");
        if (loginStep) {
          await this.executeStepWithRetry(-1, loginStep, flow);
        }
      } else if (flow.credentials.type === "callback" && flow.credentials.callback) {
        await flow.credentials.callback();
      }

      for (let i = 0; i < flow.steps.length; i++) {
        const step = flow.steps[i];
        if (step.action === "login") continue;

        const success = await this.executeStepWithRetry(i, step, flow);
        if (!success) {
          const error = `Step ${i} failed after ${MAX_RETRIES + 1} attempts`;
          this.emitEvent({ type: "failed", stepIndex: i, error });
          return { success: false, error };
        }
      }

      this.emitEvent({ type: "completed", timestamp: Date.now() });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitEvent({ type: "failed", stepIndex: -1, error: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      await this.cleanup();
    }
  }

  private async executeStepWithRetry(
    stepIndex: number,
    step: DemoFlow["steps"][number],
    flow: DemoFlow
  ): Promise<boolean> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          this.emitEvent({ type: "step-retrying", stepIndex, attempt });
        } else {
          this.emitEvent({ type: "step-started", stepIndex, step });
        }

        await this.executeStep(step, flow);

        this.emitEvent({ type: "step-completed", stepIndex });
        return true;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.emitEvent({ type: "step-failed", stepIndex, error: errorMessage });
          return false;
        }
        await this.page?.waitForTimeout(1000);
      }
    }
    return false;
  }

  private async executeStep(step: DemoFlow["steps"][number], flow: DemoFlow): Promise<void> {
    if (!this.page) throw new Error("Page not initialized");

    const timeout = step.timeoutMs ?? DEFAULT_TIMEOUT;

    switch (step.action) {
      case "goto": {
        const url = step.target?.startsWith("http") ? step.target : `${flow.baseUrl}${step.target || ""}`;
        await this.page.goto(url, { waitUntil: "networkidle", timeout });
        break;
      }

      case "click": {
        if (!step.target) throw new Error("Click action requires target");
        await this.page.waitForSelector(step.target, { state: "visible", timeout });
        await this.page.click(step.target);
        await this.page.waitForLoadState("networkidle", { timeout });
        break;
      }

      case "type": {
        if (!step.target) throw new Error("Type action requires target");
        if (!step.value) throw new Error("Type action requires value");
        await this.page.waitForSelector(step.target, { state: "visible", timeout });
        await this.page.fill(step.target, step.value);
        break;
      }

      case "wait": {
        if (step.target) {
          await this.page.waitForSelector(step.target, { state: "visible", timeout });
        } else {
          await this.page.waitForTimeout(step.timeoutMs ?? 1000);
        }
        break;
      }

      case "assert": {
        if (!step.target) throw new Error("Assert action requires target");
        const element = await this.page.waitForSelector(step.target, { state: "visible", timeout });
        if (!element) throw new Error(`Assertion failed: ${step.target} not found`);
        if (step.value) {
          const text = await element.textContent();
          if (text !== step.value) {
            throw new Error(`Assertion failed: expected "${step.value}", got "${text}"`);
          }
        }
        break;
      }

      case "login": {
        if (!step.target) throw new Error("Login action requires target URL");
        const url = step.target.startsWith("http") ? step.target : `${flow.baseUrl}${step.target}`;
        await this.page.goto(url, { waitUntil: "networkidle", timeout });
        break;
      }

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async getRecordingPath(): Promise<string | null> {
    const video = this.page?.video();
    if (!video) return null;
    return await video.path();
  }
}
