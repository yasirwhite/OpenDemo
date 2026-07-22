import type { Rotation3D } from "@/components/video-editor/types";
import {
	computeRotation3DContainScale,
	isRotation3DIdentity,
	rotation3DPerspective,
} from "@/components/video-editor/types";

// Rotation math is done in CSS convention (+y down) to match the preview, then
// gl_Position.y is flipped so WebGL clip space (+y up) lands the input's top edge
// at the top of the viewport.
const VERTEX_SHADER = `#version 300 es
in vec2 aPos;
in vec2 aUV;
out vec2 vUV;
out vec2 vScreenPos;
uniform mat4 uMvp;
uniform vec2 uSize;

void main() {
	vUV = aUV;
	vScreenPos = aPos;
	vec2 px = (aPos - 0.5) * uSize;
	vec4 clip = uMvp * vec4(px, 0.0, 1.0);
	clip.y = -clip.y;
	gl_Position = clip;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUV;
in vec2 vScreenPos;
out vec4 fragColor;

uniform sampler2D uTex;
uniform vec2 uSize;
uniform int uDeviceFrame; // 0: none, 1: glass, 2: macbook, 3: browser, 4: phone
uniform float uGlareIntensity;
uniform vec3 uRotAngles;

void main() {
	vec2 uv = vUV;
	vec4 videoColor = texture(uTex, uv);

	// Specular Glare sweep calculation based on 3D rotation
	float glareProgress = clamp((uv.x + uv.y) * 0.5 + (uRotAngles.y * 0.015) - (uRotAngles.x * 0.015), 0.0, 1.0);
	float glareWidth = 0.28;
	float glareDist = abs(glareProgress - 0.5);
	float glareFactor = smoothstep(glareWidth, 0.0, glareDist) * uGlareIntensity * 0.45;
	vec3 glareColor = vec3(1.0, 1.0, 1.0) * glareFactor;

	if (uDeviceFrame == 1) {
		// Glass Card Frame: Glass border edge & vignette
		float edgeDistX = min(uv.x, 1.0 - uv.x);
		float edgeDistY = min(uv.y, 1.0 - uv.y);
		float edge = min(edgeDistX, edgeDistY);
		
		float vignette = smoothstep(0.0, 0.08, edge);
		videoColor.rgb *= mix(0.88, 1.0, vignette);

		if (edge < 0.012) {
			float borderAlpha = smoothstep(0.012, 0.002, edge);
			vec3 borderColor = mix(vec3(1.0), vec3(0.5, 0.7, 1.0), uv.y);
			videoColor.rgb = mix(videoColor.rgb, borderColor, borderAlpha * 0.6);
		}
		videoColor.rgb += glareColor;

	} else if (uDeviceFrame == 2) {
		// MacBook Pro Mockup Frame
		float bezelX = 0.035;
		float bezelY = 0.055;
		
		if (uv.x < bezelX || uv.x > (1.0 - bezelX) || uv.y < bezelY || uv.y > (1.0 - bezelY)) {
			videoColor = vec4(0.07, 0.08, 0.09, 1.0);
			vec2 notchCenter = vec2(0.5, bezelY * 0.5);
			vec2 notchDist = abs(uv - notchCenter);
			if (notchDist.x < 0.04 && notchDist.y < bezelY * 0.4) {
				videoColor = vec4(0.02, 0.02, 0.02, 1.0);
				if (length(uv - notchCenter) < 0.005) {
					videoColor = vec4(0.1, 0.2, 0.4, 1.0);
				}
			}
		} else {
			vec2 innerUV = vec2(
				(uv.x - bezelX) / (1.0 - 2.0 * bezelX),
				(uv.y - bezelY) / (1.0 - 2.0 * bezelY)
			);
			videoColor = texture(uTex, innerUV);
			videoColor.rgb += glareColor * 0.7;
		}

	} else if (uDeviceFrame == 3) {
		// Browser Window Frame (Safari / Arc style)
		float headerHeight = 0.07;
		if (uv.y < headerHeight) {
			videoColor = vec4(0.15, 0.16, 0.18, 1.0);
			
			vec2 redDot = vec2(0.03, headerHeight * 0.5);
			vec2 yellowDot = vec2(0.05, headerHeight * 0.5);
			vec2 greenDot = vec2(0.07, headerHeight * 0.5);

			float r = 0.008;
			vec2 aspectUV = (uv - redDot) * vec2(1.0, uSize.y / uSize.x);
			if (length(aspectUV) < r) {
				videoColor = vec4(1.0, 0.38, 0.34, 1.0);
			} else if (length((uv - yellowDot) * vec2(1.0, uSize.y / uSize.x)) < r) {
				videoColor = vec4(1.0, 0.76, 0.18, 1.0);
			} else if (length((uv - greenDot) * vec2(1.0, uSize.y / uSize.x)) < r) {
				videoColor = vec4(0.16, 0.79, 0.28, 1.0);
			} else {
				vec2 addrCenter = vec2(0.5, headerHeight * 0.5);
				vec2 addrDist = abs(uv - addrCenter);
				if (addrDist.x < 0.25 && addrDist.y < headerHeight * 0.28) {
					videoColor = vec4(0.22, 0.24, 0.27, 1.0);
				}
			}
		} else {
			vec2 contentUV = vec2(uv.x, (uv.y - headerHeight) / (1.0 - headerHeight));
			videoColor = texture(uTex, contentUV);
			videoColor.rgb += glareColor * 0.5;
		}

	} else if (uDeviceFrame == 4) {
		// Phone Mockup Frame
		float bezel = 0.04;
		if (uv.x < bezel || uv.x > (1.0 - bezel) || uv.y < bezel || uv.y > (1.0 - bezel)) {
			videoColor = vec4(0.05, 0.05, 0.06, 1.0);
		} else {
			vec2 phoneUV = vec2((uv.x - bezel)/(1.0 - 2.0*bezel), (uv.y - bezel)/(1.0 - 2.0*bezel));
			videoColor = texture(uTex, phoneUV);
			
			vec2 islandCenter = vec2(0.5, bezel + 0.025);
			vec2 islandDist = abs(uv - islandCenter);
			if (islandDist.x < 0.06 && islandDist.y < 0.012) {
				videoColor = vec4(0.0, 0.0, 0.0, 1.0);
			} else {
				videoColor.rgb += glareColor;
			}
		}
	} else {
		videoColor.rgb += glareColor * 0.4;
	}

	fragColor = videoColor;
}
`;

function deg2rad(deg: number): number {
	return (deg * Math.PI) / 180;
}

function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array {
	const out = new Float32Array(16);
	for (let i = 0; i < 4; i += 1) {
		for (let j = 0; j < 4; j += 1) {
			let s = 0;
			for (let k = 0; k < 4; k += 1) {
				s += a[k * 4 + j] * b[i * 4 + k];
			}
			out[i * 4 + j] = s;
		}
	}
	return out;
}

function rotationXMat(rad: number): Float32Array {
	const c = Math.cos(rad);
	const s = Math.sin(rad);
	return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
}

function rotationYMat(rad: number): Float32Array {
	const c = Math.cos(rad);
	const s = Math.sin(rad);
	return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
}

function rotationZMat(rad: number): Float32Array {
	const c = Math.cos(rad);
	const s = Math.sin(rad);
	return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function translationMat(x: number, y: number, z: number): Float32Array {
	return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
}

function perspectiveMat(fovY: number, aspect: number, near: number, far: number): Float32Array {
	const f = 1 / Math.tan(fovY / 2);
	const nf = 1 / (near - far);
	return new Float32Array([
		f / aspect,
		0,
		0,
		0,
		0,
		f,
		0,
		0,
		0,
		0,
		(far + near) * nf,
		-1,
		0,
		0,
		2 * far * near * nf,
		0,
	]);
}

function scaleMat(s: number): Float32Array {
	return new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

export function buildMvpMatrix(rot: Rotation3D, w: number, h: number): Float32Array {
	const rx = rotationXMat(deg2rad(rot.rotationX));
	const ry = rotationYMat(deg2rad(rot.rotationY));
	const rz = rotationZMat(deg2rad(rot.rotationZ));
	const rotMat = multiplyMat4(rz, multiplyMat4(ry, rx));

	const perspective = rotation3DPerspective(w, h);
	const containScale = computeRotation3DContainScale(rot, w, h, perspective);
	const rotScaled = multiplyMat4(rotMat, scaleMat(containScale));

	const d = perspective;
	const fovY = 2 * Math.atan2(h / 2, d);
	const proj = perspectiveMat(fovY, w / h, 0.1, d * 4 + Math.max(w, h));
	const view = translationMat(0, 0, -d);
	return multiplyMat4(proj, multiplyMat4(view, rotScaled));
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) throw new Error("Failed to create shader");
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const info = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`Shader compile failed: ${info}`);
	}
	return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
	const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
	const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
	const program = gl.createProgram();
	if (!program) throw new Error("Failed to create program");
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const info = gl.getProgramInfoLog(program);
		gl.deleteProgram(program);
		throw new Error(`Program link failed: ${info}`);
	}
	gl.deleteShader(vs);
	gl.deleteShader(fs);
	return program;
}

export interface ThreeDPass {
	apply(srcCanvas: HTMLCanvasElement | OffscreenCanvas, rot: Rotation3D): HTMLCanvasElement;
	/** Read the last apply() result as ImageData-ready pixels, for platforms where drawImage(webglCanvas) is unreliable. */
	readPixels(): Uint8ClampedArray;
	resize(width: number, height: number): void;
	destroy(): void;
}

export function createThreeDPass(width: number, height: number): ThreeDPass {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true });
	if (!gl) throw new Error("WebGL2 not available for 3D pass");

	const program = createProgram(gl);
	// biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook
	gl.useProgram(program);

	const aPos = gl.getAttribLocation(program, "aPos");
	const aUV = gl.getAttribLocation(program, "aUV");
	const uMvp = gl.getUniformLocation(program, "uMvp");
	const uSize = gl.getUniformLocation(program, "uSize");
	const uTex = gl.getUniformLocation(program, "uTex");
	const uDeviceFrame = gl.getUniformLocation(program, "uDeviceFrame");
	const uGlareIntensity = gl.getUniformLocation(program, "uGlareIntensity");
	const uRotAngles = gl.getUniformLocation(program, "uRotAngles");

	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	// Quad as two triangles. pos.y is 0 (top) to 1 (bottom) per CSS convention; UV.y
	// is inverted so that with UNPACK_FLIP_Y_WEBGL the top of the input lands at the
	// top of the rendered quad.
	//   TL: pos(0,0) uv(0,1)   TR: pos(1,0) uv(1,1)
	//   BL: pos(0,1) uv(0,0)   BR: pos(1,1) uv(1,0)
	const verts = new Float32Array([
		// aPos.x, aPos.y, aUV.x, aUV.y
		0,
		0,
		0,
		1, // TL
		1,
		0,
		1,
		1, // TR
		0,
		1,
		0,
		0, // BL
		0,
		1,
		0,
		0, // BL
		1,
		0,
		1,
		1, // TR (was 1,0,1,0, broken)
		1,
		1,
		1,
		0, // BR
	]);
	const vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
	gl.enableVertexAttribArray(aPos);
	gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
	gl.enableVertexAttribArray(aUV);
	gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 16, 8);

	const texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	// Plain bilinear, no mipmaps. Even at our moderate angles (<=22deg) the receding
	// edge picks a smaller mip level, softening the rounded-corner AA ramp and shadow
	// falloff (corners look hard, shadows grimy). Sampling level 0 keeps source crispness.
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	// Anisotropic filtering still helps without mipmaps: at oblique angles it samples
	// multiple texels along the gradient at level 0, recovering detail bilinear loses.
	// Cap to the device max (16x typical).
	const anisoExt =
		gl.getExtension("EXT_texture_filter_anisotropic") ||
		gl.getExtension("MOZ_EXT_texture_filter_anisotropic") ||
		gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
	if (anisoExt) {
		const maxAniso = gl.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number;
		gl.texParameterf(gl.TEXTURE_2D, anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, maxAniso));
	}
	gl.uniform1i(uTex, 0);

	let currentSize = { width, height };

	const frameMap: Record<string, number> = {
		none: 0,
		glass: 1,
		macbook: 2,
		browser: 3,
		phone: 4,
	};

	const apply = (
		srcCanvas: HTMLCanvasElement | OffscreenCanvas,
		rot: Rotation3D,
	): HTMLCanvasElement => {
		gl.viewport(0, 0, currentSize.width, currentSize.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(program);
		gl.bindVertexArray(vao);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			srcCanvas as TexImageSource,
		);

		const mvp = isRotation3DIdentity(rot)
			? buildMvpMatrix(
					{ rotationX: 0, rotationY: 0, rotationZ: 0 },
					currentSize.width,
					currentSize.height,
				)
			: buildMvpMatrix(rot, currentSize.width, currentSize.height);
		gl.uniformMatrix4fv(uMvp, false, mvp);
		gl.uniform2f(uSize, currentSize.width, currentSize.height);

		const frameStyleCode = frameMap[rot.deviceFrame ?? "none"] ?? 0;
		gl.uniform1i(uDeviceFrame, frameStyleCode);
		gl.uniform1f(uGlareIntensity, rot.glareIntensity ?? 0.3);
		gl.uniform3f(uRotAngles, rot.rotationX, rot.rotationY, rot.rotationZ);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
		return canvas;
	};

	const resize = (w: number, h: number) => {
		if (w === currentSize.width && h === currentSize.height) return;
		canvas.width = w;
		canvas.height = h;
		currentSize = { width: w, height: h };
	};

	const readPixels = (): Uint8ClampedArray => {
		const w = currentSize.width;
		const h = currentSize.height;
		const buf = new Uint8Array(w * h * 4);
		gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
		// readPixels is bottom-up, so flip to top-down. Also un-premultiply: the
		// framebuffer is premultiplied (UNPACK_PREMULTIPLY_ALPHA_WEBGL on upload) but
		// ImageData expects non-premultiplied, else semi-transparent pixels read too dark.
		const rowSize = w * 4;
		const out = new Uint8ClampedArray(buf.length);
		for (let row = 0; row < h; row += 1) {
			const src = (h - 1 - row) * rowSize;
			const dst = row * rowSize;
			for (let col = 0; col < rowSize; col += 4) {
				const r = buf[src + col];
				const g = buf[src + col + 1];
				const b = buf[src + col + 2];
				const a = buf[src + col + 3];
				if (a === 0) {
					out[dst + col] = 0;
					out[dst + col + 1] = 0;
					out[dst + col + 2] = 0;
					out[dst + col + 3] = 0;
				} else if (a === 255) {
					out[dst + col] = r;
					out[dst + col + 1] = g;
					out[dst + col + 2] = b;
					out[dst + col + 3] = 255;
				} else {
					const inv = 255 / a;
					out[dst + col] = Math.min(255, Math.round(r * inv));
					out[dst + col + 1] = Math.min(255, Math.round(g * inv));
					out[dst + col + 2] = Math.min(255, Math.round(b * inv));
					out[dst + col + 3] = a;
				}
			}
		}
		return out;
	};

	const destroy = () => {
		gl.deleteProgram(program);
		gl.deleteBuffer(vbo);
		gl.deleteVertexArray(vao);
		gl.deleteTexture(texture);
	};

	return { apply, readPixels, resize, destroy };
}
