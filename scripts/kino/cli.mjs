#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { buildKinoDocument } from "./bridge.mjs";
import { exportBundle, loadBundle } from "./bundle.mjs";
import { importBundle, validateUploadSizes } from "./importer.mjs";

const help = `OpenDemo + Kino
  node scripts/kino/cli.mjs export <video|project.openscreen> --out <new-folder>
    [--human <presenter.mp4>] [--human-start <seconds>] [--human-offset <seconds>]
    [--accept-visual-loss]
  node scripts/kino/cli.mjs open <bundle-folder> --kino <kino-checkout>
    [--url <http://127.0.0.1:4781>] [--validate-only]

Export requires ffprobe on PATH (or FFPROBE_PATH). Open requires a compatible
Kino source checkout; normal import requires its server running. Validate-only
checks the native document offline without uploading any media.
`;

try {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			out: { type: "string" },
			human: { type: "string" },
			"human-start": { type: "string" },
			"human-offset": { type: "string" },
			"accept-visual-loss": { type: "boolean" },
			kino: { type: "string" },
			url: { type: "string" },
			"validate-only": { type: "boolean" },
			help: { type: "boolean" },
		},
	});
	if (values.help) console.log(help);
	else if (positionals.length !== 2) throw new Error(help);
	else if (positionals[0] === "export") {
		if (!values.out) throw new Error("--out is required.");
		const manifest = await exportBundle({
			input: positionals[1],
			out: values.out,
			human: values.human,
			humanStart: Number(values["human-start"] || 0),
			humanOffset: Number(values["human-offset"] || 0),
			acceptVisualLoss: values["accept-visual-loss"],
		});
		console.log(
			JSON.stringify(
				{
					bundle: path.resolve(values.out),
					duration: manifest.duration,
					warnings: manifest.warnings,
				},
				null,
				2,
			),
		);
	} else if (positionals[0] === "open") {
		if (!values.kino)
			throw new Error("--kino is required; use the path to a Kino source checkout.");
		const bundle = path.resolve(positionals[1]);
		const { manifest, files } = await loadBundle(bundle);
		const kino = path.resolve(values.kino);
		const model = await import(pathToFileURL(path.join(kino, "engine/model.js")).href);
		const { MAX_UPLOAD_BYTES } = await import(
			pathToFileURL(path.join(kino, "engine/schema.js")).href
		);
		await validateUploadSizes(files, MAX_UPLOAD_BYTES);
		const sources = Object.fromEntries(
			manifest.media.map((media) => [media.id, `/api/media/preflight-${media.id}`]),
		);
		const preflight = buildKinoDocument(manifest, sources, model);
		if (values["validate-only"]) {
			console.log(
				JSON.stringify({
					valid: true,
					schema: preflight.version,
					scenes: preflight.scenes.length,
					uploaded: false,
				}),
			);
		} else {
			const { connectAgentClient } = await import(
				pathToFileURL(path.join(kino, "backend/agent/client.mjs")).href
			);
			const client = await connectAgentClient(
				{ ...process.env, ...(values.url ? { MOTION_API_URL: values.url } : {}) },
				{ name: "opendemo-handoff" },
			);
			const result = await importBundle({ bundle, manifest, files, model, client });
			console.log(JSON.stringify(result, null, 2));
		}
	} else throw new Error(help);
} catch (error) {
	console.error(`OpenDemo handoff: ${error.message}`);
	process.exitCode = 1;
}
