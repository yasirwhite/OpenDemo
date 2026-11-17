/**
 * linden-shared.jsx — the vocabulary every linden preset is built from.
 *
 * Measured off a 25.0s generative-media launch film (1920x1080 @30fps, 751
 * frames), sampled on its own 30fps clock and mapped to the 1280x720 stage
 * (stage px = ref px / 1.5). Frame numbers in comments are reference frames,
 * f1 = t 0.
 *
 * The film is ONE wall of outputs on black, seen by ONE continuous camera:
 *
 *   WALL     ~33 rounded cards (portrait 2:3 / 3:4, some landscape) laid out
 *            in loose rows on pure black, 14-24 px gutters, corner radius
 *            ~7% of the short side, no shadows, no frame.
 *   CAMERA   the wall is a plane; every frame is a plane-to-screen homography.
 *            It was solved from the footage (SIFT matches + RANSAC, chained
 *            frame to frame and re-anchored on direct matches against f114,
 *            f250 and f530), then re-expressed as a physical lens (aim point,
 *            distance, roll, pitch, yaw) and calmed so every move is one
 *            monotone eased motion: no back-and-forth in the angles and no
 *            solve jitter. See CAM below.
 *   TYPE     after the camera dives into the gutter beside the hero card, three
 *            white lines fade in on black, one at a time, centred.
 *
 * The wall's coordinates are the reference's own f114 frame (where the wall is
 * square to the camera), scaled to stage px. Every card position in LAYOUT
 * was read off that frame or, for cards outside it, off a mosaic of the whole
 * wall stitched with the same homographies.
 *
 * Every export is a pure function of its props / t.
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";

// ── type ──────────────────────────────────────────────────────────────────

/** Neutral grotesk for every line (the reference sets a geometric sans). */
export const SANS = `"Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif`;

// ── colour ────────────────────────────────────────────────────────────────

export const rgbs = (c, a = 1) =>
	a >= 1
		? `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
		: `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, a).toFixed(4)})`;

export const mix = (a, b, p) => a.map((v, i) => lerp(v, b[i], clamp01(p)));

/** Lift a sampled colour's saturation (s) and value (v) for the drawn art. */
export function tone(c, s = 1.35, v = 1.08) {
	const m = (c[0] + c[1] + c[2]) / 3;
	return c.map((x) => Math.max(0, Math.min(255, (m + (x - m) * s) * v)));
}

// ── time ──────────────────────────────────────────────────────────────────

/** Reference frame F at film time t for scene c (c.f0 = its first ref frame). */
export const refFrame = (c, t, f0) => (t * 1000 - c.startMs) * 0.03 + (c.f0 ?? f0);

const EASE = {
	l: (p) => p,
	io: (p) => p * p * (3 - 2 * p),
	o: (p) => 1 - (1 - p) * (1 - p),
	i: (p) => p * p,
};

/**
 * A measured curve: pts [[frame, value, ease?], ...], piecewise between
 * samples (ease names the segment ENDING at that sample, default linear),
 * held flat outside.
 */
export function curve(pts, f) {
	if (f <= pts[0][0]) return pts[0][1];
	for (let i = 0; i < pts.length - 1; i++) {
		const [fa, va] = pts[i];
		const [fb, vb, e] = pts[i + 1];
		if (f <= fb) {
			const p = (EASE[e] ?? EASE.l)(clamp01((f - fa) / Math.max(1e-6, fb - fa)));
			return lerp(va, vb, p);
		}
	}
	return pts[pts.length - 1][1];
}

/** Deterministic 0..1 hash. */
export const hash = (n) => {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};

// ── the wall ──────────────────────────────────────────────────────────────

/** Hero card centre in wall px (ref f114 (469.6, 255.7) x 4/3). */
export const HERO_C = [626.13, 340.93];
/** Index of the hero card (the film opens on it and dives beside it). */
export const HERO = 16;
/** Index of the focus card the camera flies to at f330. */
export const FOCUS = 6;

/**
 * Card rects in wall px [x0, y0, x1, y1] and three sampled band colours
 * (top / middle / bottom, mean RGB of the reference card at f114 or in the
 * mosaic). The colours only seed the drawn placeholder art.
 */
export const LAYOUT = [
	{
		r: [84.0, 0.0, 190.7, 126.7],
		c: [
			[14, 17, 21],
			[55, 45, 50],
			[48, 39, 44],
		],
	}, // 0
	{
		r: [13.3, 160.0, 141.3, 233.3],
		c: [
			[54, 37, 73],
			[50, 30, 52],
			[33, 23, 35],
		],
	}, // 1
	{
		r: [241.3, 96.0, 325.3, 221.3],
		c: [
			[146, 134, 126],
			[146, 121, 103],
			[121, 102, 89],
		],
	}, // 2
	{
		r: [301.3, -50.7, 390.7, 77.3],
		c: [
			[91, 88, 74],
			[123, 115, 95],
			[50, 46, 37],
		],
	}, // 3
	{
		r: [408.0, 60.0, 522.7, 230.7],
		c: [
			[96, 106, 106],
			[56, 59, 59],
			[134, 118, 102],
		],
	}, // 4
	{
		r: [544.0, -10.7, 706.7, 234.7],
		c: [
			[56, 44, 44],
			[41, 34, 39],
			[71, 50, 51],
		],
	}, // 5
	{
		r: [726.7, 54.7, 848.0, 236.0],
		c: [
			[192, 150, 121],
			[159, 112, 82],
			[160, 118, 94],
		],
	}, // 6
	{
		r: [734.7, -80.0, 850.7, 32.0],
		c: [
			[33, 31, 32],
			[78, 79, 86],
			[64, 71, 78],
		],
	}, // 7
	{
		r: [873.3, -56.0, 949.3, 69.3],
		c: [
			[70, 76, 64],
			[79, 91, 91],
			[77, 70, 62],
		],
	}, // 8
	{
		r: [888.0, 90.7, 974.7, 220.0],
		c: [
			[74, 64, 47],
			[39, 27, 24],
			[30, 27, 21],
		],
	}, // 9
	{
		r: [1028.0, -66.7, 1133.3, 45.3],
		c: [
			[65, 50, 55],
			[127, 122, 116],
			[160, 161, 147],
		],
	}, // 10
	{
		r: [1065.3, 64.0, 1177.3, 226.7],
		c: [
			[78, 70, 107],
			[59, 41, 58],
			[88, 65, 92],
		],
	}, // 11
	{
		r: [393.3, -89.3, 513.3, 16.0],
		c: [
			[0, 0, 0],
			[17, 21, 27],
			[12, 20, 28],
		],
	}, // 12
	{
		r: [22.7, 288.0, 221.3, 400.0],
		c: [
			[70, 57, 46],
			[84, 67, 51],
			[89, 73, 56],
		],
	}, // 13
	{
		r: [256.0, 244.0, 384.0, 436.0],
		c: [
			[90, 59, 32],
			[77, 50, 31],
			[37, 26, 27],
		],
	}, // 14
	{
		r: [426.7, 260.0, 536.0, 421.3],
		c: [
			[48, 58, 60],
			[93, 88, 76],
			[95, 81, 63],
		],
	}, // 15
	{
		r: [570.0, 257.6, 682.3, 424.1],
		c: [
			[96, 128, 127],
			[122, 112, 93],
			[102, 57, 46],
		],
	}, // 16
	{
		r: [705.3, 257.3, 817.3, 424.0],
		c: [
			[197, 189, 179],
			[115, 112, 107],
			[86, 82, 79],
		],
	}, // 17
	{
		r: [873.3, 245.3, 1004.0, 434.7],
		c: [
			[114, 54, 41],
			[106, 41, 34],
			[119, 66, 54],
		],
	}, // 18
	{
		r: [1046.7, 289.3, 1146.7, 434.7],
		c: [
			[99, 103, 105],
			[84, 78, 71],
			[91, 90, 88],
		],
	}, // 19
	{
		r: [96.0, 437.3, 184.0, 570.7],
		c: [
			[89, 134, 181],
			[26, 46, 64],
			[88, 106, 131],
		],
	}, // 20
	{
		r: [253.3, 481.3, 329.3, 593.3],
		c: [
			[54, 49, 82],
			[95, 74, 105],
			[60, 57, 80],
		],
	}, // 21
	{
		r: [366.7, 454.7, 478.7, 622.7],
		c: [
			[71, 55, 39],
			[128, 113, 90],
			[133, 116, 89],
		],
	}, // 22
	{
		r: [545.3, 445.3, 705.3, 681.3],
		c: [
			[137, 142, 143],
			[68, 68, 66],
			[50, 51, 50],
		],
	}, // 23
	{
		r: [765.3, 457.3, 881.3, 628.0],
		c: [
			[169, 161, 156],
			[55, 64, 62],
			[109, 113, 111],
		],
	}, // 24
	{
		r: [953.3, 460.0, 1042.7, 588.0],
		c: [
			[161, 170, 153],
			[83, 66, 54],
			[68, 50, 39],
		],
	}, // 25
	{
		r: [1089.3, 470.7, 1250.7, 560.0],
		c: [
			[77, 94, 102],
			[76, 79, 76],
			[48, 48, 45],
		],
	}, // 26
	{
		r: [133.3, 634.7, 314.7, 800.0],
		c: [
			[10, 12, 12],
			[74, 102, 111],
			[69, 72, 66],
		],
	}, // 27
	{
		r: [386.7, 666.7, 500.0, 920.0],
		c: [
			[85, 55, 51],
			[136, 86, 81],
			[56, 37, 36],
		],
	}, // 28
	{
		r: [520.0, 706.7, 706.7, 853.3],
		c: [
			[43, 41, 38],
			[17, 14, 9],
			[137, 93, 61],
		],
	}, // 29
	{
		r: [832.0, 649.3, 961.3, 933.3],
		c: [
			[69, 70, 70],
			[155, 135, 122],
			[111, 95, 86],
		],
	}, // 30
	{
		r: [1026.7, 614.7, 1106.7, 786.7],
		c: [
			[45, 44, 45],
			[52, 50, 51],
			[58, 52, 52],
		],
	}, // 31
	{
		r: [49.3, 893.3, 284.0, 993.3],
		c: [
			[35, 42, 44],
			[55, 62, 63],
			[12, 12, 13],
		],
	}, // 32
];

/**
 * The camera: a physical pinhole (focal FOCAL stage px, centred) looking at the wall plane.
 *   CAM rows, one every 3 reference frames: [f, qx, qy, ln d]
 *     q = the wall point at the centre of the frame (wall px), d = its distance from the lens.
 *   ROLL / PITCH / YAW (degrees): the lens's turn about its axis, and its tilt off square.
 *
 * All three are re-derived from the per-frame solve (f114-f557, see reference-notes.md), then
 * calmed: the raw solve's angles ran back and forth (yaw +10 -> -33 -> +12 -> -3 degrees, pitch
 * jumping 8 degrees in 9 frames at the f252 whip, roll and pitch reversing direction 30-60 times
 * on solve noise). Now every move is ONE monotone motion between turning points:
 *   q and d follow the reference's own speed profile inside each move (so the whips at f190,
 *   f265 and f366 keep their timing), with reversals inside a move clipped, and are replayed
 *   through a monotone (no-overshoot) cubic;
 *   roll, pitch and yaw are single smoothstep moves: one turn in, one turn back, landing square
 *   on the focus card at f330, and square from there through the pull back and the dive.
 */
export const FOCAL = 1200;
export const CAM = [
	[114, 640.76, 360.52, 7.08203],
	[117, 642.48, 361.58, 7.06848],
	[120, 646.92, 364.32, 7.03278],
	[123, 651.8, 367.34, 6.99153],
	[126, 656.23, 370.36, 6.94815],
	[129, 659.62, 373.27, 6.90374],
	[132, 662.36, 375.95, 6.85917],
	[135, 665.38, 378.37, 6.8154],
	[138, 668.93, 380.49, 6.77298],
	[141, 672.67, 381.96, 6.73203],
	[144, 676.27, 382.65, 6.69292],
	[147, 679.52, 383.52, 6.65666],
	[150, 682.37, 385.22, 6.62385],
	[153, 684.36, 386.84, 6.5941],
	[156, 684.97, 388.15, 6.56707],
	[159, 685.0, 389.81, 6.54295],
	[162, 684.9, 390.86, 6.52219],
	[165, 684.5, 391.0, 6.50565],
	[168, 683.79, 390.93, 6.49421],
	[171, 682.76, 390.15, 6.48796],
	[174, 681.06, 388.05, 6.48626],
	[177, 677.91, 385.0, 6.48626],
	[180, 672.48, 380.72, 6.48626],
	[183, 664.43, 372.94, 6.48626],
	[186, 652.87, 357.84, 6.48626],
	[189, 636.55, 332.97, 6.48626],
	[192, 617.21, 302.45, 6.48625],
	[195, 599.65, 275.07, 6.48625],
	[198, 586.17, 254.3, 6.48625],
	[201, 575.8, 238.09, 6.48625],
	[204, 567.74, 225.26, 6.48625],
	[207, 561.67, 215.29, 6.48625],
	[210, 556.95, 207.14, 6.48625],
	[213, 553.01, 199.99, 6.48622],
	[216, 549.42, 193.26, 6.48532],
	[219, 545.95, 186.41, 6.48293],
	[222, 542.72, 179.16, 6.47856],
	[225, 539.89, 171.8, 6.47185],
	[228, 537.41, 165.1, 6.4633],
	[231, 535.31, 159.35, 6.45357],
	[234, 534.11, 153.94, 6.44311],
	[237, 534.0, 148.65, 6.43292],
	[240, 534.0, 144.44, 6.42388],
	[243, 534.52, 143.02, 6.41491],
	[246, 539.2, 143.0, 6.40191],
	[249, 552.68, 143.38, 6.38206],
	[252, 571.06, 145.43, 6.3624],
	[255, 590.57, 147.49, 6.35357],
	[258, 614.6, 147.99, 6.35318],
	[261, 651.11, 147.99, 6.35317],
	[264, 705.34, 147.99, 6.35317],
	[267, 769.15, 147.99, 6.35317],
	[270, 823.14, 147.99, 6.35248],
	[273, 856.23, 147.99, 6.34358],
	[276, 872.81, 147.99, 6.32726],
	[279, 881.19, 147.99, 6.30331],
	[282, 883.88, 147.99, 6.27374],
	[285, 884.0, 147.99, 6.24378],
	[288, 884.0, 147.99, 6.21105],
	[291, 884.0, 147.99, 6.1729],
	[294, 884.0, 147.99, 6.13266],
	[297, 884.0, 147.99, 6.09188],
	[300, 883.4, 147.99, 6.05089],
	[303, 882.31, 147.99, 6.01084],
	[306, 881.3, 147.99, 5.97296],
	[309, 880.42, 147.99, 5.93872],
	[312, 879.69, 147.99, 5.9092],
	[315, 878.95, 147.99, 5.88501],
	[318, 877.88, 148.0, 5.86817],
	[321, 876.48, 148.1, 5.86159],
	[324, 875.06, 148.34, 5.86079],
	[327, 873.63, 148.35, 5.86088],
	[330, 871.66, 148.36, 5.86364],
	[333, 868.79, 148.5, 5.87251],
	[336, 864.88, 149.45, 5.88528],
	[339, 859.67, 151.32, 5.89972],
	[342, 853.42, 154.04, 5.9153],
	[345, 847.15, 157.69, 5.93231],
	[348, 841.61, 162.63, 5.9514],
	[351, 836.11, 169.58, 5.97267],
	[354, 828.74, 179.72, 5.99543],
	[357, 817.69, 194.89, 6.01917],
	[360, 802.57, 218.69, 6.04402],
	[363, 782.6, 254.53, 6.06944],
	[366, 756.33, 298.57, 6.09537],
	[369, 727.95, 340.78, 6.12262],
	[372, 704.78, 374.8, 6.14853],
	[375, 688.23, 400.13, 6.17082],
	[378, 675.54, 418.73, 6.19102],
	[381, 664.41, 433.04, 6.21215],
	[384, 654.04, 444.96, 6.23492],
	[387, 644.61, 455.81, 6.25615],
	[390, 636.14, 466.13, 6.27473],
	[393, 628.28, 476.05, 6.29185],
	[396, 620.52, 485.85, 6.30839],
	[399, 612.38, 495.75, 6.3249],
	[402, 604.07, 505.71, 6.341],
	[405, 596.75, 515.45, 6.35555],
	[408, 591.08, 524.56, 6.36931],
	[411, 586.0, 532.86, 6.38542],
	[414, 580.25, 539.86, 6.40651],
	[417, 573.9, 545.44, 6.42991],
	[420, 567.62, 551.41, 6.44873],
	[423, 562.1, 557.98, 6.46346],
	[426, 557.54, 563.05, 6.4817],
	[429, 553.14, 567.16, 6.50282],
	[432, 548.54, 571.46, 6.52246],
	[435, 544.15, 575.07, 6.54177],
	[438, 540.7, 577.22, 6.56118],
	[441, 538.73, 577.93, 6.57953],
	[444, 538.07, 578.0, 6.5967],
	[447, 538.0, 577.97, 6.61291],
	[450, 538.0, 577.37, 6.62857],
	[453, 538.02, 575.19, 6.64393],
	[456, 538.48, 571.66, 6.65852],
	[459, 539.66, 567.48, 6.67238],
	[462, 541.19, 562.87, 6.68676],
	[465, 542.84, 557.77, 6.70212],
	[468, 544.6, 552.23, 6.7178],
	[471, 546.69, 546.4, 6.73337],
	[474, 549.1, 540.21, 6.74882],
	[477, 551.75, 533.63, 6.76426],
	[480, 554.64, 526.58, 6.77995],
	[483, 557.58, 518.82, 6.79614],
	[486, 560.43, 510.3, 6.81273],
	[489, 563.53, 501.41, 6.82932],
	[492, 567.13, 492.24, 6.84552],
	[495, 570.93, 482.47, 6.8609],
	[498, 574.56, 471.88, 6.87335],
	[501, 577.94, 460.53, 6.87876],
	[504, 581.63, 448.94, 6.87936],
	[507, 586.56, 437.66, 6.87864],
	[510, 593.01, 426.66, 6.87075],
	[513, 600.21, 415.51, 6.8476],
	[516, 607.34, 403.98, 6.81188],
	[519, 614.75, 392.57, 6.76615],
	[522, 622.65, 382.05, 6.70929],
	[525, 630.34, 372.1, 6.63877],
	[528, 637.28, 361.8, 6.5535],
	[531, 644.1, 351.56, 6.45466],
	[534, 651.47, 342.31, 6.34076],
	[537, 659.19, 334.51, 6.20744],
	[540, 666.7, 329.17, 6.05008],
	[543, 673.12, 327.21, 5.86217],
	[546, 678.57, 327.0, 5.63131],
	[549, 684.41, 327.0, 5.33688],
	[552, 688.78, 327.0, 4.96416],
	[555, 689.6, 327.0, 4.54864],
	[557, 689.6, 327.0, 4.29738],
	[558, 689.6, 327.0, 4.19287],
	[559, 689.6, 327.0, 4.10173],
];
export const ROLL = [
	[114, 0],
	[246, -7, "io"],
	[330, 0, "io"],
];
export const PITCH = [
	[114, 0],
	[195, -8, "io"],
	[350, 0, "io"],
];
export const YAW = [
	[114, 0],
	[165, 0],
	[252, -24, "io"],
	[330, 0, "io"],
];

/** Monotone cubic (Fritsch-Carlson) through rows [f, ...v]: never overshoots between samples. */
function monotone(rows, f) {
	const n = rows.length;
	if (f <= rows[0][0]) return rows[0].slice(1);
	if (f >= rows[n - 1][0]) return rows[n - 1].slice(1);
	let i = 0;
	while (i < n - 2 && rows[i + 1][0] < f) i++;
	const slope = (j, k) => (rows[j + 1][k] - rows[j][k]) / (rows[j + 1][0] - rows[j][0]);
	const tangent = (j, k) => {
		if (j === 0) return slope(0, k);
		if (j === n - 1) return slope(n - 2, k);
		const a = slope(j - 1, k);
		const b = slope(j, k);
		if (a * b <= 0) return 0;
		const ha = rows[j][0] - rows[j - 1][0];
		const hb = rows[j + 1][0] - rows[j][0];
		return (3 * (ha + hb)) / ((2 * hb + ha) / a + (hb + 2 * ha) / b);
	};
	const h = rows[i + 1][0] - rows[i][0];
	const t = (f - rows[i][0]) / h;
	const h00 = (1 + 2 * t) * (1 - t) * (1 - t);
	const h10 = t * (1 - t) * (1 - t);
	const h01 = t * t * (3 - 2 * t);
	const h11 = t * t * (t - 1);
	const out = [];
	for (let k = 1; k < rows[i].length; k++) {
		out.push(
			h00 * rows[i][k] +
				h10 * h * tangent(i, k) +
				h01 * rows[i + 1][k] +
				h11 * h * tangent(i + 1, k),
		);
	}
	return out;
}

/**
 * Homography (row-major 3x3) wall px -> stage px for a lens aimed at wall point (qx, qy) from
 * distance d, turned by roll / pitch / yaw (radians). R = Rz(roll) Rx(pitch) Ry(yaw).
 */
export function lensH(qx, qy, d, roll, pitch, yaw) {
	const [cr, sr] = [Math.cos(roll), Math.sin(roll)];
	const [cp, sp] = [Math.cos(pitch), Math.sin(pitch)];
	const [cy, sy] = [Math.cos(yaw), Math.sin(yaw)];
	// Rx * Ry, then Rz on the left
	const m = [
		[cy, 0, sy],
		[sp * sy, cp, -sp * cy],
		[-cp * sy, sp, cp * cy],
	];
	const R = [
		[cr * m[0][0] - sr * m[1][0], cr * m[0][1] - sr * m[1][1], cr * m[0][2] - sr * m[1][2]],
		[sr * m[0][0] + cr * m[1][0], sr * m[0][1] + cr * m[1][1], sr * m[0][2] + cr * m[1][2]],
		m[2],
	];
	// lens centre C = q - d * (third row of R); t = -R C
	const C = [qx - d * R[2][0], qy - d * R[2][1], -d * R[2][2]];
	const t = R.map((r) => -(r[0] * C[0] + r[1] * C[1] + r[2] * C[2]));
	const K = [
		[FOCAL, 0, 640],
		[0, FOCAL, 360],
		[0, 0, 1],
	];
	const cols = [[R[0][0], R[1][0], R[2][0]], [R[0][1], R[1][1], R[2][1]], t];
	const H = [0, 1, 2].map((r) => cols.map((c) => K[r][0] * c[0] + K[r][1] * c[1] + K[r][2] * c[2]));
	const w = H[2][2];
	return H.map((r) => r.map((v) => v / w));
}

const RAD = Math.PI / 180;

/** Camera homography at reference frame f (f114 onward). */
export function camAt(f) {
	const [qx, qy, ld] = monotone(CAM, f);
	return lensH(
		qx,
		qy,
		Math.exp(ld),
		curve(ROLL, f) * RAD,
		curve(PITCH, f) * RAD,
		curve(YAW, f) * RAD,
	);
}

/** Similarity about the hero centre: screen = at + k * (P - HERO_C). */
export function simAt(at, k) {
	const [cx, cy] = HERO_C;
	return [
		[k, 0, at[0] - k * cx],
		[0, k, at[1] - k * cy],
		[0, 0, 1],
	];
}

export function apply(H, x, y) {
	const w = H[2][0] * x + H[2][1] * y + H[2][2];
	return [(H[0][0] * x + H[0][1] * y + H[0][2]) / w, (H[1][0] * x + H[1][1] * y + H[1][2]) / w];
}

/** CSS matrix3d placing a w x h box (origin 0 0) whose top-left is wall (x, y). */
export function cardMatrix(H, x, y) {
	const a = H[0][0];
	const b = H[0][1];
	const c = H[0][0] * x + H[0][1] * y + H[0][2];
	const d = H[1][0];
	const e = H[1][1];
	const f = H[1][0] * x + H[1][1] * y + H[1][2];
	const g = H[2][0];
	const h = H[2][1];
	const i = H[2][0] * x + H[2][1] * y + H[2][2];
	const r = (v) => (Math.abs(v) < 1e-12 ? 0 : Number(v.toPrecision(9)));
	return `matrix3d(${r(a)},${r(d)},0,${r(g)},${r(b)},${r(e)},0,${r(h)},0,0,1,0,${r(c)},${r(f)},0,${r(i)})`;
}

// ── placeholder art ──────────────────────────────────────────────────────

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

/**
 * Drawn stand-ins for generated outputs, so the film renders complete with
 * no assets: vistas, dunes, blooms, ringed planets, night skylines, a mascot,
 * glossy objects, flowing bands, arcades and figure studies. Each is seeded by the
 * card's index and coloured from its sampled bands (saturation lifted, since
 * the samples are averages); `p` (0..1 across the film) drives a slow inner
 * drift, because the reference's cards are playing clips, not stills.
 */
export function CardArt({ kind, w, h, cols, seed, p, id }) {
	const [top, mid, bot] = cols.map((c) => tone(c, 1.7, 1.12));
	const s = Math.min(w, h);
	const r = (k) => hash(seed * 7.3 + k * 1.7);
	const gid = `la-${id}`;
	const drift = Math.sin((p * 1.5 + r(0)) * Math.PI * 2);
	const glow = mix(top, WHITE, 0.75);
	let body = null;
	let sky = [mix(top, WHITE, 0.08), mid, bot];
	if (kind === "vista") {
		const hz = h * (0.56 + 0.06 * r(1));
		sky = [mix(top, [120, 180, 230], 0.25), mix(mid, [250, 200, 160], 0.3), mid];
		body = (
			<>
				<circle
					cx={w * (0.3 + 0.4 * r(2))}
					cy={h * (0.34 - 0.06 * p)}
					r={s * 0.11}
					fill={rgbs(glow)}
				/>
				{[0, 1, 2].map((k) => (
					<ellipse
						key={k}
						cx={w * (r(10 + k) + 0.08 * drift)}
						cy={h * (0.12 + 0.1 * k)}
						rx={s * (0.18 + 0.1 * r(20 + k))}
						ry={s * 0.045}
						fill="#fff"
						opacity={0.55}
					/>
				))}
				<path
					d={`M0 ${hz} L ${w * 0.22} ${hz - h * 0.14} L ${w * 0.38} ${hz - h * 0.05} L ${w * 0.6} ${hz - h * 0.2} L ${w * 0.82} ${hz - h * 0.06} L ${w} ${hz - h * 0.1} V ${h} H 0 Z`}
					fill={rgbs(mix(mid, [70, 80, 110], 0.45))}
				/>
				<path
					d={`M0 ${hz + h * 0.06} C ${w * 0.3} ${hz} ${w * 0.6} ${hz + h * 0.12} ${w} ${hz + h * 0.04} V ${h} H 0 Z`}
					fill={rgbs(mix(bot, BLACK, 0.2))}
				/>
				{Array.from({ length: 9 }, (_, k) => (
					<circle
						key={k}
						cx={w * r(30 + k) + drift * 2}
						cy={hz + h * (0.12 + 0.3 * r(40 + k))}
						r={s * (0.025 + 0.05 * r(50 + k))}
						fill={rgbs(mix(bot, [236, 64, 48], 0.75))}
					/>
				))}
			</>
		);
	} else if (kind === "dune") {
		const sand = mix(bot, [226, 150, 92], 0.45);
		sky = [mix(top, [250, 236, 214], 0.55), mix(mid, [244, 196, 150], 0.45), sand];
		body = (
			<>
				<circle
					cx={w * (0.62 + 0.2 * r(1))}
					cy={h * (0.3 + 0.04 * p)}
					r={s * 0.2}
					fill={rgbs(mix(top, WHITE, 0.85))}
					opacity={0.9}
				/>
				{[0, 1, 2].map((k) => {
					const y = h * (0.5 + 0.14 * k);
					const sh = drift * w * 0.02 * (k + 1);
					return (
						<path
							key={k}
							d={`M${-w * 0.1 + sh} ${h} L ${-w * 0.1 + sh} ${y + h * 0.06} Q ${w * (0.25 + 0.2 * r(3 + k)) + sh} ${y - h * 0.1} ${w * 0.55 + sh} ${y} T ${w * 1.1 + sh} ${y - h * 0.02} L ${w * 1.1 + sh} ${h} Z`}
							fill={rgbs(mix(sand, BLACK, 0.12 + 0.14 * k))}
						/>
					);
				})}
			</>
		);
	} else if (kind === "bloom") {
		const n = 7 + Math.floor(r(1) * 5);
		const cx = w / 2;
		const cy = h * 0.5;
		const pr = s * 0.36;
		const rot = 360 * r(2) + 14 * drift;
		body = (
			<g transform={`rotate(${rot} ${cx} ${cy})`}>
				{Array.from({ length: n }, (_, k) => (
					<ellipse
						key={k}
						cx={cx}
						cy={cy - pr * 0.55}
						rx={pr * 0.24}
						ry={pr * 0.55}
						transform={`rotate(${(360 / n) * k} ${cx} ${cy})`}
						fill={rgbs(mix(mid, WHITE, 0.25 + 0.2 * (k % 2)))}
						opacity={0.92}
					/>
				))}
				<circle cx={cx} cy={cy} r={pr * 0.24} fill={rgbs(mix(top, [250, 200, 60], 0.7))} />
			</g>
		);
		sky = [mix(bot, BLACK, 0.3), mix(bot, BLACK, 0.1), bot];
	} else if (kind === "planet") {
		const cx = w * (0.45 + 0.1 * r(1));
		const cy = h * (0.48 + 0.04 * drift);
		const pr = s * 0.24;
		sky = [[8, 10, 22], mix(bot, [10, 12, 30], 0.7), [14, 12, 28]];
		body = (
			<>
				{Array.from({ length: 18 }, (_, k) => (
					<circle
						key={k}
						cx={w * r(60 + k)}
						cy={h * r(80 + k)}
						r={s * 0.006 + s * 0.008 * r(90 + k)}
						fill="#fff"
						opacity={0.5 + 0.5 * r(70 + k)}
					/>
				))}
				<defs>
					<radialGradient id={`${gid}-p`} cx="0.35" cy="0.3" r="0.8">
						<stop offset="0" stopColor={rgbs(mix(mid, WHITE, 0.55))} />
						<stop offset="0.6" stopColor={rgbs(mid)} />
						<stop offset="1" stopColor={rgbs(mix(mid, BLACK, 0.7))} />
					</radialGradient>
				</defs>
				<ellipse
					cx={cx}
					cy={cy}
					rx={pr * 1.9}
					ry={pr * 0.42}
					fill="none"
					stroke={rgbs(mix(top, WHITE, 0.5))}
					strokeWidth={s * 0.025}
					opacity={0.75}
					transform={`rotate(-16 ${cx} ${cy})`}
				/>
				<circle cx={cx} cy={cy} r={pr} fill={`url(#${gid}-p)`} />
			</>
		);
	} else if (kind === "city") {
		const n = 7;
		const bw = w / n;
		sky = [
			mix(top, [40, 30, 90], 0.5),
			mix(mid, [230, 110, 90], 0.45),
			mix(mid, [250, 170, 90], 0.5),
		];
		body = (
			<>
				<circle
					cx={w * 0.7}
					cy={h * 0.36}
					r={s * 0.16}
					fill={rgbs(mix(mid, [255, 210, 150], 0.7))}
				/>
				{Array.from({ length: n }, (_, k) => {
					const bh = h * (0.25 + 0.4 * r(100 + k));
					return (
						<g key={k}>
							<rect
								x={k * bw}
								y={h - bh}
								width={bw * 0.92}
								height={bh}
								fill={rgbs(mix(bot, [16, 14, 30], 0.75))}
							/>
							{Array.from({ length: 6 }, (_, j) => (
								<rect
									key={j}
									x={k * bw + bw * (0.18 + 0.4 * (j % 2))}
									y={h - bh + bh * (0.1 + 0.14 * Math.floor(j / 2))}
									width={bw * 0.16}
									height={bh * 0.05}
									fill="#ffd98a"
									opacity={r(200 + k * 7 + j) > 0.4 ? 0.9 : 0.15}
								/>
							))}
						</g>
					);
				})}
			</>
		);
	} else if (kind === "mascot") {
		const cx = w / 2;
		const cy = h * (0.56 + 0.015 * Math.sin(p * Math.PI * 10));
		const br = s * 0.32;
		const fur = mix(mid, [214, 150, 96], 0.35);
		const blink = (p * 9) % 1 < 0.04 ? 0.15 : 1;
		sky = [mix(top, WHITE, 0.3), mix(top, WHITE, 0.15), mix(bot, WHITE, 0.1)];
		body = (
			<>
				<ellipse cx={cx} cy={h * 0.9} rx={br * 1.1} ry={br * 0.16} fill="#000" opacity={0.18} />
				<ellipse
					cx={cx - br * 0.72}
					cy={cy - br * 0.92}
					rx={br * 0.34}
					ry={br * 0.6}
					fill={rgbs(fur)}
					transform={`rotate(-24 ${cx - br * 0.72} ${cy - br * 0.92})`}
				/>
				<ellipse
					cx={cx + br * 0.72}
					cy={cy - br * 0.92}
					rx={br * 0.34}
					ry={br * 0.6}
					fill={rgbs(fur)}
					transform={`rotate(24 ${cx + br * 0.72} ${cy - br * 0.92})`}
				/>
				<ellipse
					cx={cx - br * 0.72}
					cy={cy - br * 0.9}
					rx={br * 0.17}
					ry={br * 0.38}
					fill={rgbs(mix(fur, [255, 170, 170], 0.55))}
					transform={`rotate(-24 ${cx - br * 0.72} ${cy - br * 0.9})`}
				/>
				<ellipse
					cx={cx + br * 0.72}
					cy={cy - br * 0.9}
					rx={br * 0.17}
					ry={br * 0.38}
					fill={rgbs(mix(fur, [255, 170, 170], 0.55))}
					transform={`rotate(24 ${cx + br * 0.72} ${cy - br * 0.9})`}
				/>
				<ellipse cx={cx} cy={cy} rx={br} ry={br * 0.95} fill={rgbs(fur)} />
				<ellipse
					cx={cx}
					cy={cy + br * 0.3}
					rx={br * 0.55}
					ry={br * 0.42}
					fill={rgbs(mix(fur, WHITE, 0.45))}
				/>
				{[-1, 1].map((sd) => (
					<g key={sd}>
						<ellipse
							cx={cx + sd * br * 0.36}
							cy={cy - br * 0.12}
							rx={br * 0.22}
							ry={br * 0.26 * blink}
							fill="#fff"
						/>
						<circle
							cx={cx + sd * br * 0.36 + br * 0.04}
							cy={cy - br * 0.1}
							r={br * 0.14 * blink}
							fill="#1a1410"
						/>
						<circle
							cx={cx + sd * br * 0.36 + br * 0.08}
							cy={cy - br * 0.16}
							r={br * 0.045 * blink}
							fill="#fff"
						/>
					</g>
				))}
				<ellipse cx={cx} cy={cy + br * 0.14} rx={br * 0.09} ry={br * 0.06} fill="#3a2418" />
				<path
					d={`M${cx - br * 0.18} ${cy + br * 0.3} Q ${cx} ${cy + br * 0.46} ${cx + br * 0.18} ${cy + br * 0.3}`}
					stroke="#3a2418"
					strokeWidth={br * 0.04}
					fill="none"
					strokeLinecap="round"
				/>
			</>
		);
	} else if (kind === "orb") {
		const cy = h * (0.5 + 0.03 * Math.sin(p * Math.PI * 6 + seed));
		const or = s * 0.3;
		body = (
			<>
				<defs>
					<radialGradient id={`${gid}-o`} cx="0.36" cy="0.32" r="0.75">
						<stop offset="0" stopColor={rgbs(mix(mid, WHITE, 0.7))} />
						<stop offset="0.45" stopColor={rgbs(mix(mid, [90, 140, 255], 0.25))} />
						<stop offset="1" stopColor={rgbs(mix(bot, BLACK, 0.5))} />
					</radialGradient>
				</defs>
				<ellipse cx={w / 2} cy={h * 0.82} rx={or * 1.1} ry={or * 0.2} fill="#000" opacity={0.3} />
				<circle cx={w / 2} cy={cy} r={or} fill={`url(#${gid}-o)`} />
				<circle
					cx={w / 2 - or * 0.32}
					cy={cy - or * 0.36}
					r={or * 0.1}
					fill="#fff"
					opacity={0.85}
				/>
			</>
		);
	} else if (kind === "bands") {
		body = [0, 1, 2, 3, 4].map((k) => {
			const y = h * (0.18 + k * 0.17);
			const a = h * 0.08 * (0.6 + r(k));
			const ph = (p * 2 + k * 0.37) * Math.PI * 2;
			const col = [
				mix(top, [255, 120, 80], 0.4),
				mid,
				mix(mid, [60, 120, 255], 0.4),
				bot,
				mix(bot, WHITE, 0.3),
			][k];
			return (
				<path
					key={k}
					d={`M0 ${y} C ${w * 0.3} ${y - a * Math.cos(ph)} ${w * 0.6} ${y + a * Math.sin(ph)} ${w} ${y} V ${h} H 0 Z`}
					fill={rgbs(col)}
					opacity={0.85}
				/>
			);
		});
	} else if (kind === "arcade") {
		const n = 3 + Math.floor(r(1) * 2);
		const cw = w / n;
		sky = [mix(top, [150, 190, 230], 0.35), mix(mid, WHITE, 0.2), mid];
		body = (
			<>
				{Array.from({ length: n }, (_, k) => (
					<path
						key={k}
						d={`M${k * cw + cw * 0.16} ${h} V ${h * 0.5} A ${cw * 0.34} ${cw * 0.34} 0 0 1 ${k * cw + cw * 0.84} ${h * 0.5} V ${h} Z`}
						fill={rgbs(mix(top, [255, 244, 225], 0.55))}
					/>
				))}
				<rect x={0} y={h * 0.86} width={w} height={h * 0.14} fill={rgbs(mix(bot, BLACK, 0.2))} />
				<rect
					x={0}
					y={h * 0.4}
					width={w}
					height={h * 0.05}
					fill={rgbs(mix(mid, [255, 240, 220], 0.4))}
				/>
			</>
		);
	} else {
		// figure study: a lit bust against a backdrop
		const cx = w * (0.5 + 0.08 * (r(2) - 0.5)) + drift * w * 0.015;
		const hy = h * 0.42;
		const hr = s * 0.17;
		const skin = mix(mid, [232, 180, 150], 0.5);
		sky = [mix(top, WHITE, 0.15), top, mix(top, BLACK, 0.2)];
		body = (
			<>
				<circle cx={cx} cy={hy} r={s * 0.4} fill={rgbs(mix(top, WHITE, 0.5))} opacity={0.35} />
				<path
					d={`M${cx - s * 0.48} ${h} C ${cx - s * 0.46} ${hy + hr * 2.2} ${cx - hr * 1.3} ${hy + hr * 1.4} ${cx} ${hy + hr * 1.35} C ${cx + hr * 1.3} ${hy + hr * 1.4} ${cx + s * 0.46} ${hy + hr * 2.2} ${cx + s * 0.48} ${h} Z`}
					fill={rgbs(mix(bot, BLACK, 0.15))}
				/>
				<rect
					x={cx - hr * 0.4}
					y={hy + hr * 0.7}
					width={hr * 0.8}
					height={hr * 0.85}
					fill={rgbs(mix(skin, BLACK, 0.2))}
				/>
				<ellipse cx={cx} cy={hy} rx={hr * 0.84} ry={hr} fill={rgbs(skin)} />
				<path
					d={`M${cx - hr * 0.95} ${hy - hr * 0.1} C ${cx - hr} ${hy - hr * 1.3} ${cx + hr} ${hy - hr * 1.4} ${cx + hr * 0.95} ${hy - hr * 0.05} C ${cx + hr * 0.5} ${hy - hr * 0.7} ${cx - hr * 0.5} ${hy - hr * 0.7} ${cx - hr * 0.95} ${hy - hr * 0.1} Z`}
					fill={rgbs(mix(bot, BLACK, 0.45))}
				/>
				<ellipse
					cx={cx - hr * 0.35}
					cy={hy - hr * 0.25}
					rx={hr * 0.25}
					ry={hr * 0.35}
					fill="#fff"
					opacity={0.2}
				/>
			</>
		);
	}
	return (
		<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
			<defs>
				<linearGradient id={`${gid}-g`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={rgbs(sky[0])} />
					<stop offset="0.55" stopColor={rgbs(sky[1])} />
					<stop offset="1" stopColor={rgbs(sky[2])} />
				</linearGradient>
			</defs>
			<rect width={w} height={h} fill={`url(#${gid}-g)`} />
			{body}
		</svg>
	);
}

const KINDS = [
	"dune",
	"bloom",
	"arcade",
	"planet",
	"figure",
	"orb",
	"city",
	"vista",
	"orb",
	"dune",
];

/** Which drawn art a card gets: the hero a vista, the focus the mascot, landscapes vistas/bands/cities. */
export function artKind(i, w, h) {
	if (i === HERO) return "vista";
	if (i === FOCUS) return "mascot";
	if (i === HERO + 1) return "dune"; // the hero's neighbour, large in the dive
	if (w > h * 1.15) return ["vista", "bands", "city"][i % 3];
	return KINDS[i % KINDS.length];
}
