// SPDX-License-Identifier: AGPL-3.0-only
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export async function importedProject(bundle) {
	const file = path.resolve(bundle, "import-result.json");
	if ((await stat(file)).size > 128 * 1024) throw new Error("Import result is unexpectedly large.");
	const result = JSON.parse(await readFile(file, "utf8"));
	if (typeof result.project !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(result.project)) {
		throw new Error("Bundle has no valid imported project ID. Run kino:open first.");
	}
	return result.project;
}

export function previewRequest({ project, scene, from, to, fps = 12, out, job }) {
	if (job !== undefined) {
		if (typeof job !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(job))
			throw new Error("Invalid render job ID.");
		if (from !== undefined || to !== undefined || scene !== undefined || out !== undefined)
			throw new Error("Job status cannot be combined with preview range, scene or output options.");
		return { action: "status", project, job };
	}
	if (!Number.isFinite(fps) || fps < 1 || fps > 30)
		throw new Error("Preview fps must be between 1 and 30.");
	if (scene !== undefined && (typeof scene !== "string" || !scene.trim()))
		throw new Error("Scene must be a nonempty Kino scene ID/name/code.");
	const range = from !== undefined || to !== undefined;
	if (range && (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to <= from))
		throw new Error("A section needs both --from and --to with 0 <= from < to.");
	if (range && (!scene || scene === "all"))
		throw new Error("A section preview needs one explicit --scene, not all scenes.");
	return {
		action: "start",
		project,
		quality: "draft",
		preview: "fast",
		format: "mp4",
		fps,
		motionBlur: 0,
		dither: false,
		wait: false,
		...(scene ? { scene } : {}),
		...(range ? { from, to } : {}),
		...(out ? { out: path.resolve(out) } : {}),
	};
}

export async function requestPreview(client, request) {
	if (request.action === "start") {
		const catalog = await client.tools();
		const render = catalog.tools?.find((tool) => tool.name === "render");
		const properties = render?.inputSchema?.properties;
		const fast =
			properties?.preview?.const === "fast" || properties?.preview?.enum?.includes("fast");
		if (!fast || (request.from !== undefined && (!properties.from || !properties.to))) {
			throw new Error(
				"This running Kino server does not advertise fast/section previews. Update to the Kino fast-preview branch or a release containing it. No render was requested.",
			);
		}
	}
	const reply = await client.call("render", request);
	if (reply?.isError) throw new Error(reply.text || "Kino refused the preview.");
	const data = reply?.data;
	if (!data || (!data.job && !data.status && !data.held && !data.waiting && !data.id))
		throw new Error(reply?.text || "Kino did not confirm a preview job or approval state.");
	// Pass approval/held/failed states through unchanged. Never retry or answer them here.
	return { project: request.project, ...data, message: reply.text };
}
