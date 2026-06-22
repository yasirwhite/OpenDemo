import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	app,
	BrowserWindow,
	ipcMain,
	Menu,
	nativeImage,
	session,
	systemPreferences,
	Tray,
	screen,
	dialog,
	shell,
} from "electron";
import { registerFlowExecutorHandlers } from "./ipc/flowExecutorHandler";
import { ShortcutBinding } from "../src/lib/shortcuts";
import {
	loadAndRegisterGlobalShortcut,
	registerOpenAppShortcut,
	unregisterAllGlobalShortcuts,
} from "./globalShortcut";
import { mainT, setMainLocale } from "./i18n";
import { getSelectedDesktopSource, registerIpcHandlers } from "./ipc/handlers";
import {
	createCountdownOverlayWindow,
	createEditorWindow,
	createHudOverlayWindow,
	createSourceSelectorWindow,
} from "./windows";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use Screen & System Audio Recording permissions instead of the CoreAudio Tap API on macOS.
// Tap needs NSAudioCaptureUsageDescription in the parent app's Info.plist, which breaks when
// running from a terminal/IDE during dev.
if (process.platform === "darwin") {
	app.commandLine.appendSwitch("disable-features", "MacCatapLoopbackAudioForScreenShare");
}

// Wayland support for screen capture and window management on Wayland compositors.
if (process.platform === "linux") {
	const isWayland =
		process.env.XDG_SESSION_TYPE === "wayland" || process.env.WAYLAND_DISPLAY !== undefined;
	if (isWayland) {
		app.commandLine.appendSwitch("ozone-platform", "wayland");
		// Enable WebRTCPipeWireCapturer for screen capture on Wayland
		app.commandLine.appendSwitch("enable-features", "WaylandWindowDrag,WebRTCPipeWireCapturer");
	}
}

export const RECORDINGS_DIR = path.join(app.getPath("userData"), "recordings");

async function ensureRecordingsDir() {
	try {
		await fs.mkdir(RECORDINGS_DIR, { recursive: true });
		console.log("RECORDINGS_DIR:", RECORDINGS_DIR);
		console.log("User Data Path:", app.getPath("userData"));
	} catch (error) {
		console.error("Failed to create recordings directory:", error);
	}
}

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
	? path.join(process.env.APP_ROOT, "public")
	: RENDERER_DIST;

// Window references
let mainWindow: BrowserWindow | null = null;
let sourceSelectorWindow: BrowserWindow | null = null;
let countdownOverlayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let selectedSourceName = "";
const isMac = process.platform === "darwin";
const trayIconSize = isMac ? 16 : 24;

// Tray Icons
const defaultTrayIcon = getTrayIcon("openscreen.png", trayIconSize);
const recordingTrayIcon = getTrayIcon("rec-button.png", trayIconSize);

function createWindow() {
	if (process.env.HEADLESS_EXPORT_PROJECT) {
		// Headless export mode: open the editor directly, no HUD.
		createEditorWindowWrapper();
		// Pipe renderer console output to Node stdout so run-demo.mjs can capture it.
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.on("console-message", (_e: any, levelInfo: any, ...args) => {
				let msg = "";
				if (typeof levelInfo === "object" && levelInfo.message) {
					msg = levelInfo.message; // Newer Electron object signature
				} else {
					msg = args.join(" "); // Older signature
				}
				process.stdout.write(`[renderer] ${msg}\n`);
			});
			mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
				process.stdout.write(`[renderer-error] did-fail-load: ${code} ${desc} ${url}\n`);
			});
			mainWindow.webContents.on("did-finish-load", () => {
				process.stdout.write(`[renderer] did-finish-load: ${mainWindow?.webContents.getURL()}\n`);
			});
			mainWindow.webContents.on("render-process-gone", (_e, details) => {
				process.stdout.write(`[renderer-error] render-process-gone: ${details.reason}\n`);
			});
		}
	} else {
		mainWindow = createHudOverlayWindow();
	}
}

function showMainWindow() {
	if (mainWindow && !mainWindow.isDestroyed()) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}
		mainWindow.show();
		mainWindow.focus();
		return;
	}

	createWindow();
}

function isEditorWindow(window: BrowserWindow) {
	return window.webContents.getURL().includes("windowType=editor");
}

function sendEditorMenuAction(
	channel: "menu-load-project" | "menu-save-project" | "menu-save-project-as" | "menu-new-project",
) {
	let targetWindow = BrowserWindow.getFocusedWindow() ?? mainWindow;

	if (!targetWindow || targetWindow.isDestroyed() || !isEditorWindow(targetWindow)) {
		createEditorWindowWrapper();
		targetWindow = mainWindow;
		if (!targetWindow || targetWindow.isDestroyed()) return;

		targetWindow.webContents.once("did-finish-load", () => {
			if (!targetWindow || targetWindow.isDestroyed()) return;
			targetWindow.webContents.send(channel);
		});
		return;
	}

	targetWindow.webContents.send(channel);
}

function setupApplicationMenu() {
	const isMac = process.platform === "darwin";
	const template: Electron.MenuItemConstructorOptions[] = [];

	if (isMac) {
		template.push({
			label: app.name,
			submenu: [
				{
					role: "about",
					label: mainT("common", "actions.about") || "About OpenScreen",
				},
				{ type: "separator" },
				{
					role: "services",
					label: mainT("common", "actions.services") || "Services",
				},
				{ type: "separator" },
				{
					role: "hide",
					label: mainT("common", "actions.hide") || "Hide OpenScreen",
				},
				{
					role: "hideOthers",
					label: mainT("common", "actions.hideOthers") || "Hide Others",
				},
				{
					role: "unhide",
					label: mainT("common", "actions.unhide") || "Show All",
				},
				{ type: "separator" },
				{ role: "quit", label: mainT("common", "actions.quit") || "Quit" },
			],
		});
	}

	template.push(
		{
			label: mainT("common", "actions.file") || "File",
			submenu: [
				{
					label: mainT("dialogs", "unsavedChanges.newProject") || "New Project",
					accelerator: "CmdOrCtrl+N",
					click: () => sendEditorMenuAction("menu-new-project"),
				},
				{ type: "separator" as const },
				{
					label: mainT("dialogs", "unsavedChanges.loadProject") || "Load Project…",
					accelerator: "CmdOrCtrl+O",
					click: () => sendEditorMenuAction("menu-load-project"),
				},
				{
					label: mainT("dialogs", "unsavedChanges.saveProject") || "Save Project…",
					accelerator: "CmdOrCtrl+S",
					click: () => sendEditorMenuAction("menu-save-project"),
				},
				{
					label: mainT("dialogs", "unsavedChanges.saveProjectAs") || "Save Project As…",
					accelerator: "CmdOrCtrl+Shift+S",
					click: () => sendEditorMenuAction("menu-save-project-as"),
				},
				...(isMac
					? []
					: [
							{ type: "separator" as const },
							{
								role: "quit" as const,
								label: mainT("common", "actions.quit") || "Quit",
							},
						]),
			],
		},
		{
			label: mainT("common", "actions.edit") || "Edit",
			submenu: [
				{ role: "undo", label: mainT("common", "actions.undo") || "Undo" },
				{ role: "redo", label: mainT("common", "actions.redo") || "Redo" },
				{ type: "separator" },
				{ role: "cut", label: mainT("common", "actions.cut") || "Cut" },
				{ role: "copy", label: mainT("common", "actions.copy") || "Copy" },
				{ role: "paste", label: mainT("common", "actions.paste") || "Paste" },
				{
					role: "selectAll",
					label: mainT("common", "actions.selectAll") || "Select All",
				},
			],
		},
		{
			label: mainT("common", "actions.view") || "View",
			submenu: [
				{
					role: "reload",
					label: mainT("common", "actions.reload") || "Reload",
				},
				{
					role: "forceReload",
					label: mainT("common", "actions.forceReload") || "Force Reload",
				},
				{
					role: "toggleDevTools",
					label: mainT("common", "actions.toggleDevTools") || "Toggle Developer Tools",
				},
				{ type: "separator" },
				{
					role: "resetZoom",
					label: mainT("common", "actions.actualSize") || "Actual Size",
				},
				{
					role: "zoomIn",
					label: mainT("common", "actions.zoomIn") || "Zoom In",
				},
				{
					role: "zoomOut",
					label: mainT("common", "actions.zoomOut") || "Zoom Out",
				},
				{ type: "separator" },
				{
					role: "togglefullscreen",
					label: mainT("common", "actions.toggleFullScreen") || "Toggle Full Screen",
				},
			],
		},
		{
			label: mainT("common", "actions.window") || "Window",
			submenu: isMac
				? [
						{
							role: "minimize",
							label: mainT("common", "actions.minimize") || "Minimize",
						},
						{ role: "zoom" },
						{ type: "separator" },
						{ role: "front" },
					]
				: [
						{
							role: "minimize",
							label: mainT("common", "actions.minimize") || "Minimize",
						},
						{
							role: "close",
							label: mainT("common", "actions.close") || "Close",
						},
					],
		},
	);

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

function createTray() {
	tray = new Tray(defaultTrayIcon);
	tray.on("click", () => {
		showMainWindow();
	});
	tray.on("double-click", () => {
		showMainWindow();
	});
}

function getTrayIcon(filename: string, size: number) {
	return nativeImage
		.createFromPath(path.join(process.env.VITE_PUBLIC || RENDERER_DIST, filename))
		.resize({
			width: size,
			height: size,
			quality: "best",
		});
}

function updateTrayMenu(recording: boolean = false) {
	if (!tray) return;
	const trayIcon = recording ? recordingTrayIcon : defaultTrayIcon;
	const trayToolTip = recording
		? mainT("common", "actions.recordingStatus", {
				source: selectedSourceName,
			}) || `Recording: ${selectedSourceName}`
		: "OpenScreen";
	const menuTemplate = recording
		? [
				{
					label: mainT("common", "actions.stopRecording") || "Stop Recording",
					click: () => {
						if (mainWindow && !mainWindow.isDestroyed()) {
							mainWindow.webContents.send("stop-recording-from-tray");
						}
					},
				},
			]
		: [
				{
					label: mainT("common", "actions.open") || "Open",
					click: () => {
						showMainWindow();
					},
				},
				{
					label: mainT("common", "actions.quit") || "Quit",
					click: () => {
						app.quit();
					},
				},
			];
	tray.setImage(trayIcon);
	tray.setToolTip(trayToolTip);
	tray.setContextMenu(Menu.buildFromTemplate(menuTemplate));
}

let editorHasUnsavedChanges = false;
let isForceClosing = false;
let isCloseConfirmInFlight = false;

ipcMain.on("set-has-unsaved-changes", (_, hasChanges: boolean) => {
	editorHasUnsavedChanges = hasChanges;
});

function forceCloseEditorWindow(windowToClose: BrowserWindow | null) {
	if (!windowToClose || windowToClose.isDestroyed()) return;

	isForceClosing = true;
	setImmediate(() => {
		try {
			if (!windowToClose.isDestroyed()) {
				windowToClose.close();
			}
		} finally {
			isForceClosing = false;
		}
	});
}

function createEditorWindowWrapper() {
	if (mainWindow) {
		isForceClosing = true;
		mainWindow.close();
		isForceClosing = false;
		mainWindow = null;
	}
	mainWindow = createEditorWindow();
	editorHasUnsavedChanges = false;

	mainWindow.on("close", (event) => {
		if (isForceClosing || !editorHasUnsavedChanges || isCloseConfirmInFlight) return;

		event.preventDefault();
		isCloseConfirmInFlight = true;

		const windowToClose = mainWindow;
		if (!windowToClose || windowToClose.isDestroyed()) return;

		// Ask renderer to show the in-app close dialog.
		windowToClose.webContents.send("request-close-confirm");

		ipcMain.once("close-confirm-response", (event, choice: "save" | "discard" | "cancel") => {
			if (event.sender.id !== windowToClose?.webContents.id) return;
			isCloseConfirmInFlight = false;
			if (!windowToClose || windowToClose.isDestroyed()) return;

			if (choice === "save") {
				// Save first, then close when the renderer reports done.
				windowToClose.webContents.send("request-save-before-close");
				ipcMain.once("save-before-close-done", (event, shouldClose: boolean) => {
					if (event.sender.id !== windowToClose?.webContents.id) return;
					if (!shouldClose) return;
					forceCloseEditorWindow(windowToClose);
				});
			} else if (choice === "discard") {
				forceCloseEditorWindow(windowToClose);
			}
			// "cancel": flag reset, window stays open
		});
	});
}

function createSourceSelectorWindowWrapper() {
	sourceSelectorWindow = createSourceSelectorWindow();
	sourceSelectorWindow.on("closed", () => {
		sourceSelectorWindow = null;
	});
	return sourceSelectorWindow;
}

function createCountdownOverlayWindowWrapper() {
	if (countdownOverlayWindow && !countdownOverlayWindow.isDestroyed()) {
		return countdownOverlayWindow;
	}

	countdownOverlayWindow = createCountdownOverlayWindow();
	countdownOverlayWindow.on("closed", () => {
		countdownOverlayWindow = null;
	});
	return countdownOverlayWindow;
}

// Closing every window quits the app (tray goes too). In headless export mode
// we never show a tray, and window-all-closed fires when the editor closes.
app.on("window-all-closed", () => {
	app.quit();
});

// In headless export mode, the renderer sends this when export is done.
ipcMain.once("headless-export-done", (_, result: { outputPath?: string; error?: string }) => {
	if (result.outputPath) {
		console.log(`[headless-export] ✅ Export complete: ${result.outputPath}`);
		try {
			const outMarker = path.join(path.dirname(result.outputPath), ".headless-export-result.json");
			fsSync.writeFileSync(outMarker, JSON.stringify({ success: true, outputPath: result.outputPath }));
		} catch { /* best-effort */ }
	} else {
		console.error(`[headless-export] ❌ Export failed: ${result.error ?? "unknown error"}`);
		try {
			// Write failure marker so run-demo.mjs knows what happened
			const markerDir = path.join(path.dirname(process.execPath), "recordings");
			fsSync.writeFileSync(
				path.join(markerDir, ".headless-export-result.json"),
				JSON.stringify({ success: false, error: result.error }),
			);
		} catch { /* best-effort */ }
	}
	setImmediate(() => {
		if (result.outputPath) {
			// Create a mini toast window at the bottom right
			const display = screen.getPrimaryDisplay();
			const width = 320;
			const height = 360;
			const x = display.workArea.x + display.workArea.width - width - 20;
			const y = display.workArea.y + display.workArea.height - height - 20;

			const toastWin = new BrowserWindow({
				width,
				height,
				x,
				y,
				frame: false,
				transparent: true,
				alwaysOnTop: true,
				skipTaskbar: true,
				resizable: false,
				webPreferences: {
					nodeIntegration: true,
					contextIsolation: false,
					webSecurity: false // allow file:// video loading
				}
			});

			const videoUrl = "file:///" + result.outputPath.replace(/\\/g, "/");

			const html = `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body {
			margin: 0; overflow: hidden;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			background: rgba(30, 30, 30, 0.95); color: white;
			border-radius: 8px; border: 1px solid #555;
			box-shadow: 0 4px 12px rgba(0,0,0,0.5);
			display: flex; flex-direction: column; padding: 12px;
			user-select: none; height: calc(100vh - 26px);
		}
		.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
		.title { font-weight: 600; font-size: 14px; }
		.close { cursor: pointer; color: #aaa; font-size: 18px; line-height: 1; margin-top: -4px; }
		.close:hover { color: white; }
		.btn { background: #333; color: white; border: 1px solid #555; padding: 8px; margin-bottom: 6px; border-radius: 4px; cursor: pointer; text-align: center; font-size: 13px; transition: background 0.2s; }
		.btn:hover { background: #444; }
		.btn-primary { background: #0066cc; border-color: #005bb5; }
		.btn-primary:hover { background: #005bb5; }
		.actions { display: flex; flex-direction: column; gap: 4px; margin-top: auto; }
	</style>
</head>
<body>
	<div class="header">
		<div class="title">✨ Your demo is ready!</div>
		<div class="close" id="closeBtn">&times;</div>
	</div>
	<video src="${videoUrl}" autoplay loop muted style="width: 100%; border-radius: 6px; border: 1px solid #222; margin-bottom: 12px; background: #000; height: 160px; object-fit: cover;"></video>
	<div class="actions">
		<button class="btn btn-primary" id="openBtn">Edit in OpenScreen</button>
		<div style="display: flex; gap: 6px;">
			<button class="btn" id="viewBtn" style="flex: 1; margin-bottom: 0;">View Full</button>
			<button class="btn" id="saveBtn" style="flex: 1; margin-bottom: 0;">Save As...</button>
		</div>
	</div>
	<script>
		const { ipcRenderer } = require('electron');
		document.getElementById('openBtn').addEventListener('click', () => ipcRenderer.send('toast-action', 'open'));
		document.getElementById('viewBtn').addEventListener('click', () => ipcRenderer.send('toast-action', 'view'));
		document.getElementById('saveBtn').addEventListener('click', () => ipcRenderer.send('toast-action', 'save'));
		document.getElementById('closeBtn').addEventListener('click', () => ipcRenderer.send('toast-action', 'close'));
	</script>
</body>
</html>`;

			toastWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

			ipcMain.on('toast-action', async (_event, action) => {
				const finalPath = result.outputPath;
				if (!finalPath) return;

				if (action === 'open') {
					if (mainWindow && !mainWindow.isDestroyed()) {
						mainWindow.show();
						mainWindow.maximize();
						mainWindow.focus();
					}
					toastWin.close();
				} else if (action === 'view') {
					shell.openPath(finalPath);
				} else if (action === 'save') {
					const res = await dialog.showSaveDialog({
						title: "Save Demo Video",
						defaultPath: path.basename(finalPath),
						filters: [{ name: "Video", extensions: ["mp4"] }]
					});
					if (!res.canceled && res.filePath) {
						fsSync.copyFileSync(finalPath, res.filePath);
					}
				} else if (action === 'close') {
					toastWin.close();
					app.quit();
				}
			});
			
		} else {
			// On failure, quit the app so it doesn't hang the headless script invisibly.
			app.quit();
		}
	});
});

app.on("activate", () => {
	// On macOS, re-open a window when the dock icon is clicked and none are open.
	const hasVisibleWindow = BrowserWindow.getAllWindows().some((window) => {
		if (window.isDestroyed() || !window.isVisible()) {
			return false;
		}

		const url = window.webContents.getURL();
		const isCountdownOverlayWindow = url.includes("windowType=countdown-overlay");
		return !isCountdownOverlayWindow;
	});
	if (!hasVisibleWindow) {
		showMainWindow();
	}
});

app.on("will-quit", () => {
	unregisterAllGlobalShortcuts();
});

app.whenReady().then(async () => {
	// Force "regular" activation policy so the Dock icon appears. The HUD overlay
	// (transparent, frameless, skipTaskbar) is the first window, and AppKit would
	// otherwise classify us as an accessory app.
	if (process.platform === "darwin") {
		app.dock?.show();
	}

	session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
		const allowed = [
			"media",
			"audioCapture",
			"microphone",
			"videoCapture",
			"camera",
			"screen",
			"display-capture",
		];
		return allowed.includes(permission);
	});

	session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
		const allowed = [
			"media",
			"audioCapture",
			"microphone",
			"videoCapture",
			"camera",
			"screen",
			"display-capture",
		];
		callback(allowed.includes(permission));
	});

	session.defaultSession.setDisplayMediaRequestHandler(
		(request, callback) => {
			const source = getSelectedDesktopSource();
			if (!request.videoRequested || !source) {
				callback({});
				return;
			}

			callback({
				video: source,
				...(request.audioRequested && process.platform === "win32" ? { audio: "loopback" } : {}),
			});
		},
		{ useSystemPicker: false },
	);

	// Request mic permission now. Screen Recording is requested lazily from the
	// source-picker action so its prompt isn't hidden behind the selector window.
	if (process.platform === "darwin") {
		const micStatus = systemPreferences.getMediaAccessStatus("microphone");
		if (micStatus !== "granted") {
			await systemPreferences.askForMediaAccess("microphone");
		}
	}

	ipcMain.on("hud-overlay-close", () => {
		app.quit();
	});
	ipcMain.handle("set-locale", (_, locale: string) => {
		setMainLocale(locale);
		setupApplicationMenu();
		updateTrayMenu();
	});

	ipcMain.handle("update-global-shortcut", (_, binding: ShortcutBinding) => {
		const success = registerOpenAppShortcut(binding, showMainWindow);
		return { success };
	});

	const isHeadlessExport = Boolean(process.env.HEADLESS_EXPORT_PROJECT);

	// In headless export mode, skip all UI chrome (tray, menu, global shortcuts)
	if (!isHeadlessExport) {
		createTray();
		updateTrayMenu();
		setupApplicationMenu();
	}
	await ensureRecordingsDir();
	// Only register flow executor when NOT in headless mode
	// (it dynamically imports playwright which must be resolved from node_modules, not Electron)
	if (!isHeadlessExport) {
		registerFlowExecutorHandlers(RECORDINGS_DIR);
	}

	function switchToHudWrapper() {
		if (mainWindow) {
			isForceClosing = true;
			mainWindow.close();
			isForceClosing = false;
			mainWindow = null;
		}
		showMainWindow();
	}

	registerIpcHandlers(
		createEditorWindowWrapper,
		createSourceSelectorWindowWrapper,
		createCountdownOverlayWindowWrapper,
		() => mainWindow,
		() => sourceSelectorWindow,
		() => countdownOverlayWindow,
		(recording: boolean, sourceName: string) => {
			selectedSourceName = sourceName;
			if (!tray) createTray();
			updateTrayMenu(recording);
			if (!recording) {
				showMainWindow();
			}
		},
		switchToHudWrapper,
	);

	if (!isHeadlessExport) {
		await loadAndRegisterGlobalShortcut(showMainWindow);
	}

	createWindow();
});
