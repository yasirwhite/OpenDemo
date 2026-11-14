// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { importedProject, previewRequest, requestPreview } from "./preview.mjs";

const catalog = {
	tools: [
		{
			name: "render",
			inputSchema: {
				properties: {
					preview: { enum: ["fast"] },
					from: { type: "number" },
					to: { type: "number" },
				},
			},
		},
	],
};

test("draft section request keeps original timeline and scopes the saved project", () => {
	const request = previewRequest({
		project: "saved-project",
		scene: "scene-2",
		from: 12.4,
		to: 18.6,
	});
	assert.deepEqual(request, {
		action: "start",
		project: "saved-project",
		quality: "draft",
		preview: "fast",
		format: "mp4",
		fps: 12,
		motionBlur: 0,
		dither: false,
		wait: false,
		scene: "scene-2",
		from: 12.4,
		to: 18.6,
	});
});

test("invalid/ambiguous ranges fail before any request", () => {
	for (const fields of [
		{ from: 3 },
		{ from: 3, to: 2, scene: "s1" },
		{ from: 0, to: 5 },
		{ from: 0, to: 5, scene: "all" },
		{ fps: 0 },
	])
		assert.throws(() => previewRequest({ project: "p", ...fields }));
});

test("unsupported server never silently renders a full film", async () => {
	let calls = 0;
	const client = {
		tools: async () => ({ tools: [{ name: "render", inputSchema: { properties: {} } }] }),
		call: async () => {
			calls++;
		},
	};
	await assert.rejects(
		requestPreview(client, previewRequest({ project: "p", scene: "s1", from: 2, to: 4 })),
		/No render was requested/,
	);
	assert.equal(calls, 0);
});

test("preview starts once without opening projects or reimporting sources", async () => {
	const calls = [];
	const client = {
		tools: async () => catalog,
		call: async (verb, request) => {
			calls.push({ verb, request });
			return { data: { job: "R7", status: "queued", from: 2, to: 4 }, text: "queued" };
		},
	};
	const result = await requestPreview(
		client,
		previewRequest({ project: "p", scene: "s1", from: 2, to: 4 }),
	);
	assert.equal(calls.length, 1);
	assert.equal(calls[0].verb, "render");
	assert.equal(result.job, "R7");
	assert.equal(result.status, "queued");
});

test("approval and refusal are preserved without retrying", async () => {
	let calls = 0;
	const client = {
		tools: async () => catalog,
		call: async () => {
			calls++;
			return { data: { id: "q1", status: "awaiting_approval" }, text: "waiting" };
		},
	};
	const result = await requestPreview(client, previewRequest({ project: "p" }));
	assert.equal(result.status, "awaiting_approval");
	assert.equal(calls, 1);
	client.call = async () => ({ isError: true, text: "blocked by policy" });
	await assert.rejects(
		requestPreview(client, previewRequest({ project: "p" })),
		/blocked by policy/,
	);
});

test("status never starts a new render", async () => {
	const request = previewRequest({ project: "p", job: "R7" });
	assert.deepEqual(request, { action: "status", project: "p", job: "R7" });
	const client = {
		call: async (verb, input) => {
			assert.equal(verb, "render");
			assert.equal(input.action, "status");
			return { data: { job: "R7", status: "done", files: ["preview.mp4"] } };
		},
	};
	assert.equal((await requestPreview(client, request)).status, "done");
});

test("preview uses import receipt without needing original media or exporting again", async (t) => {
	const bundle = await mkdtemp(path.join(os.tmpdir(), "kino-preview-"));
	t.after(() => rm(bundle, { recursive: true, force: true }));
	await writeFile(
		path.join(bundle, "import-result.json"),
		JSON.stringify({ project: "saved-project", sources: {} }),
	);
	assert.equal(await importedProject(bundle), "saved-project");
});

test("companion Kino's actual MCP schema passes capability negotiation", {
	skip: !process.env.KINO_PREVIEW_PATH,
}, async () => {
	const { agentToolList } = await import(
		pathToFileURL(path.resolve(process.env.KINO_PREVIEW_PATH, "backend/agent/tool-sync.mjs")).href
	);
	const tools = await agentToolList();
	let calls = 0;
	const client = {
		tools: async () => tools,
		call: async () => {
			calls++;
			return { data: { job: "R1", status: "queued" } };
		},
	};
	const result = await requestPreview(
		client,
		previewRequest({ project: "fixture", scene: "scene-1", from: 2, to: 4 }),
	);
	assert.equal(result.job, "R1");
	assert.equal(calls, 1);
});
