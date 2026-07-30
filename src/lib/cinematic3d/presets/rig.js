// Shared rig constants and helpers for all shot presets.
//
// UNITS: centimetres. Devices are at true real-world scale (MacBook Pro 16" is
// 35.5 cm wide; iPhone 15 Pro Max is 7.8 x 16.0 cm), so distances read physically.
//
// SIGNS — these bit repeatedly during development, keep them here:
//   * MacBook lid: 0 = shut, ~95-106 = open. Larger = more reclined.
//   * Phone pitch is NEGATIVE-back. pitch:-16 leans it back to match a 106 lid.
//   * Device yaw + turns the object's face toward frame RIGHT.
//   * Camera pitch + puts the camera ABOVE the look-at point.
//   * Easing names are the opposite of how they read on screen: an object
//     LEAVING frame that should start slow and accelerate uses ease "in".

export const C = (yaw, pitch, dist, target, fov = 26) => ({ yaw, pitch, dist, target, fov });

export const RIG = {
  lidHinge: { y: 1.72, z: -12.8 },
  lidOpenNative: 110,          // donor model's native lid angle
  lidWorking: 95,              // upright-ish, used for most shots
  lidReclined: 106,            // leans back; matches the reference's second reveal
  /** Screen centre for a given lid angle. Aim here, and make a phone coplanar with it. */
  screenCentre(lidDeg) {
    const th = (lidDeg * Math.PI) / 180;
    return { x: 0, y: this.lidHinge.y + 11.1 * Math.sin(th), z: this.lidHinge.z + 11.1 * Math.cos(th) };
  },
};
