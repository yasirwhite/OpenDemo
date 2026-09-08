import { C, RIG } from "./rig.js";

// PRESET: phone-arrive
// Phone spins in once and stays. Opener for a mobile capture — pair with
// phone-hold for the middle and something that discards it for the close.

// Tuned at 4000 ms: the spin lands at 0.30, which is ~1200 ms — the same arrival
// speed as phone-showcase's, whose spin-in is 0.126 of its 10300 ms.
export const nativeDurationMs = 4000;

export const note = 'Phone spins in once and settles, and does NOT leave. Opener for a mobile capture.';

export default /**
 * The arrival half of phone-showcase, with the exit removed.
 *
 * A device should enter the film once and leave once. Reusing a spin-in/spin-out
 * shot for every mobile scene makes the phone fly in and out on every cut, which
 * reads as a slideshow of separate adverts rather than one continuous look at a
 * product.
 *
 * Geometry is phone-showcase's verbatim so the two intercut seamlessly: the rest
 * pose is coplanar with a MacBook display at lid 106, and the look-at is solved
 * to keep the phone's full 1.7-17.1 span in a 20.3 cm frame at dist 44.
 */
function preset({ durationMs, screen, cursor }) {
  const wide = 44, T = 8.2;
  const P = (yaw, px) => ({ yaw, pitch: -16, roll: 0, px, py: 9.4, pz: -10.6 });
  return [{
    name: "phone-arrive", durationMs, device: "iphone", env: "white", screen,
    pan: { rate: 0.3, from: 0 },
    keys: [
      { at: 0.00, cam: C(19, -2.3, wide, [0, T, -10.6]), pose: P(0, -36) },
      { at: 0.30, cam: C(19, -2.3, wide, [0, T, -10.6]), pose: P(360, 0), ease: "out" },
      // settles, then keeps drifting a hair so the shot is never frozen
      { at: 1.00, cam: C(19, -2.3, wide + 0.9, [0, T - 0.5, -10.6]), pose: P(360, 0), ease: "linear" },
    ],
    cursor,
  }];
}
