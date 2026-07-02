# OpenDemo JSON Configuration Guide

OpenDemo uses Playwright to script browser interactions and record them into cinematic, smooth product demos. You will write a JSON configuration file specifying the actions you want to take, and then you will execute the `run-demo.mjs` script.

## Writing the JSON Configuration

You must create a `.json` file that defines the viewport, recording settings, and the array of steps to execute.

### Base Structure:
```json
{
  "baseUrl": "http://localhost:3000",
  "recording": {
    "width": 1280,
    "height": 720,
    "fps": 120,
    "timeLapseWaitSegments": true,
    "timeLapseSpeedFactor": 4.0
  },
  "steps": [
    { "action": "goto", "target": "/dashboard" },
    { "action": "wait", "timeoutMs": 1500 },
    { "action": "click", "target": "#submit_btn", "zoom": { "durationMs": 1500 } },
    { "action": "type", "target": "#username", "value": "test_user", "durationMs": 600 }
  ]
}
```

### Supported Actions:
- `goto`: Navigates to the given target URL.
- `click`: Clicks the element at the `target` CSS selector. It will smoothly animate the mouse, auto-scroll the page if necessary, and execute the click.
- `type`: Types the `value` into the `target` CSS selector. Supports an optional `durationMs` window (default `1000`ms) so typing speed dynamically scales to finish within the window. Playwright natively clears existing text and types with a brisk, human-like typewriter effect. **Do NOT put a redundant `click` or `wait` step right before `type`.**
- `scroll`: Scrolls the page. Supports a `mode: "smooth"` parameter for interpolated smooth scrolling.
- `wait`: Pauses execution for `timeoutMs`. Useful for letting animations or network requests settle.

### Attaching Zoom:
You can attach a `zoom` property to any `click` or `type` step to create a cinematic punch-in.
- Example: `"zoom": true` (defaults to 1400ms duration)
- Example: `"zoom": { "durationMs": 1000 }`
- **Selective Zooming:** Do NOT attach zooms to every action! Only use zooms on major focal points or core feature demonstrations. 
