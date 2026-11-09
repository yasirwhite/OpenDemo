// SPDX-License-Identifier: AGPL-3.0-only
import { stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildKinoDocument } from "./bridge.mjs";

function refused(reply) {
	return reply?.isError || reply?.data?.held || reply?.data?.waiting;
}

export async function validateUploadSizes(files, limit) {
	if (!Number.isFinite(limit) || limit <= 0)
		throw new Error("Kino did not expose a valid upload limit.");
	for (const [id, file] of Object.entries(files)) {
		if ((await stat(file)).size > limit)
			throw new Error(
				`Media ${id} exceeds this Kino version's ${limit}-byte upload limit. Export shorter selected takes or a smaller compatible copy first; the original is unchanged. Automatic quality reduction is not used by this bridge.`,
			);
	}
}

export async function importBundle({ bundle, manifest, files, model, client }) {
	const sources = Object.fromEntries(
		manifest.media.map((media) => [media.id, `/api/media/preflight-${media.id}`]),
	);
	buildKinoDocument(manifest, sources, model);
	// Requires exclusive use of this server during import: Kino's current project is global.
	const created = await client.call("project", {
		action: "create",
		name: manifest.name,
		width: manifest.width,
		height: manifest.height,
		duration: Math.min(manifest.duration, 600),
	});
	if (refused(created) || typeof created?.data?.project !== "string" || !created.data.project)
		throw new Error(created.text || "Kino did not create the handoff workspace.");
	for (const [id, file] of Object.entries(files)) {
		const uploaded = await client.importFile(file);
		if (uploaded.refused || !uploaded.src)
			throw new Error(uploaded.refused?.text || `Kino did not return a media source for ${id}.`);
		sources[id] = uploaded.src;
	}
	const document = buildKinoDocument(manifest, sources, model);
	const motionPath = path.join(bundle, "handoff.motion");
	await writeFile(motionPath, `${JSON.stringify(document, null, 2)}\n`);
	const imported = await client.importFile(motionPath);
	if (imported?.refused || !imported?.project)
		throw new Error(
			imported?.refused?.text || "Kino did not confirm importing the native document.",
		);
	await writeFile(
		path.join(bundle, "import-result.json"),
		`${JSON.stringify({ project: imported.project, sources }, null, 2)}\n`,
	);
	const opened = await client.call("project", { action: "open", id: imported.project });
	if (refused(opened))
		throw new Error(
			`Imported project ${imported.project}, but opening it was refused: ${opened.text || "approval pending"}. The project ID is saved in import-result.json.`,
		);
	return {
		project: imported.project,
		file: motionPath,
		scenes: document.scenes.length,
		rendered: false,
	};
}
