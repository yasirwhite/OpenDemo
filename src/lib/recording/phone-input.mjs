/**
 * Visible touch affordances for headless phone recordings.
 *
 * A headless capture draws no pointer, and on a phone a pointer would be wrong
 * anyway — the gestures a viewer must be able to read are TAPS and SWIPES. This
 * injects both into the page so they land in the recording itself.
 *
 *   import { installPhoneInput, tap, swipe } from "../src/lib/recording/phone-input.mjs";
 *
 *   const ctx = await browser.newContext({
 *     viewport: { width: 412, height: 915 },
 *     bypassCSP: true,                 // REQUIRED — see below
 *     recordVideo: { dir: "…", size: { width: 412, height: 915 } },
 *   });
 *   const page = await ctx.newPage();
 *   await installPhoneInput(page);     // before goto
 *   …
 *   await tap(page, locator);
 *   await swipe(page, { dy: -520 });   // swipe up = scroll down
 *
 * ── bypassCSP is not optional ──────────────────────────────────────────────
 * Any app shipping `style-src 'self'` (nextly.tv does, src/index.js) silently
 * drops BOTH an injected <style> element and every inline `el.style.x = …`
 * assignment. The nodes still appear in the DOM and listeners still fire, so it
 * looks like it works — the effects are simply never painted, and the only
 * symptom is a recording with no visible feedback. Diagnose it by reading
 * getComputedStyle on an effect node: unstyled ones come back with the class's
 * rules missing (z-index "auto", height 0).
 *
 * ── why transform/opacity only ─────────────────────────────────────────────
 * Both effects animate `transform` and `opacity` and nothing else, so the
 * compositor runs them off the main thread. Animating width/height/box-shadow
 * forces layout every frame, which is what makes hand-rolled ripples stutter.
 */

/** Injected into the page. Exposes window.__demoTap / __demoSwipe. */
function bootstrap() {
  const CSS = `
    .__fx{position:fixed;z-index:2147483647;pointer-events:none;will-change:transform,opacity}
    .__fx-ring{width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;
      background:radial-gradient(circle,rgba(0,0,0,.30) 0%,rgba(0,0,0,.20) 52%,rgba(0,0,0,0) 70%);
      transform:scale(.2);opacity:1}
    .__fx-ring.go{transform:scale(1);opacity:0;
      transition:transform .52s cubic-bezier(.2,.6,.35,1),opacity .52s cubic-bezier(.3,0,.6,1)}
    .__fx-dot{width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;
      background:rgba(0,0,0,.34);box-shadow:0 0 0 2px rgba(255,255,255,.5);
      transform:scale(1);opacity:.95}
    .__fx-dot.go{transform:scale(.55);opacity:0;
      transition:transform .34s ease-out,opacity .34s ease-out}
    /* swipe: a finger dot that travels, trailing a soft capsule */
    .__fx-finger{width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;
      background:rgba(0,0,0,.30);box-shadow:0 0 0 2px rgba(255,255,255,.45);opacity:0}
    /* kept translucent: it has to read as a gesture over the UI, not hide it */
    .__fx-trail{width:20px;margin:0 0 0 -10px;border-radius:10px;
      background:linear-gradient(rgba(0,0,0,.16),rgba(0,0,0,.02));opacity:0;transform-origin:50% 0}`;

  const ready = () => document.body && document.head;
  const install = () => {
    if (!ready() || document.getElementById('__fxstyle')) return true;
    const st = document.createElement('style');
    st.id = '__fxstyle';
    st.textContent = CSS;
    document.head.appendChild(st);
    return true;
  };

  const mk = (cls, x, y) => {
    const el = document.createElement('div');
    el.className = '__fx ' + cls;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    return el;
  };
  const go = (el, life) => {
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('go')));
    setTimeout(() => el.remove(), life);
  };

  window.__demoTap = (x, y) => {
    install();
    go(mk('__fx-ring', x, y), 800);
    go(mk('__fx-dot', x, y), 600);
  };

  /** Finger travels x0,y0 -> x1,y1 over ms, trailing a capsule behind it. */
  window.__demoSwipe = (x0, y0, x1, y1, ms) => {
    install();
    const f = mk('__fx-finger', x0, y0);
    const t = mk('__fx-trail', x0, Math.min(y0, y1));
    const len = Math.abs(y1 - y0);
    t.style.height = len + 'px';
    t.style.opacity = '0';
    f.style.opacity = '0';
    requestAnimationFrame(() => {
      // easeOutQuart, matching the momentum curve the wheel deltas follow — the
      // finger and the content must decelerate together or the gesture reads as
      // sliding across a screen that is moving on its own.
      f.style.transition = `transform ${ms}ms cubic-bezier(.25,1,.5,1), opacity .12s linear`;
      t.style.transition = `opacity .16s linear`;
      f.style.opacity = '.95';
      t.style.opacity = '.9';
      f.style.transform = `translate(${x1 - x0}px, ${y1 - y0}px)`;
      setTimeout(() => {
        f.style.transition = 'opacity .22s linear';
        t.style.transition = 'opacity .22s linear';
        f.style.opacity = '0'; t.style.opacity = '0';
      }, ms);
    });
    setTimeout(() => { f.remove(); t.remove(); }, ms + 500);
  };

  /**
   * Scroll, animated IN THE PAGE at the display's refresh rate.
   *
   * Driving this from Playwright with mouse.wheel() cannot be smooth: every
   * wheel event is a CDP round trip, so the ceiling is ~30 events/second —
   * at or below the capture frame rate. The scroll then advances in visible
   * chunks no matter how the deltas are shaped, because each captured frame
   * lands on a different discrete wheel step.
   *
   * Animating scrollTop under requestAnimationFrame instead produces a value
   * for every frame the compositor draws, so the recording's own fps is the
   * only thing limiting it.
   */
  const scroller = () => {
    let best = document.scrollingElement || document.documentElement, bestOver = 0;
    const over = (e) => e.scrollHeight - e.clientHeight;
    bestOver = over(best);
    document.querySelectorAll('*').forEach((e) => {
      const o = over(e);
      if (o > bestOver) {
        const oy = getComputedStyle(e).overflowY;
        if (oy === 'auto' || oy === 'scroll') { best = e; bestOver = o; }
      }
    });
    return best;
  };

  window.__demoScroll = (dist, ms) => new Promise((done) => {
    const el = scroller();
    const from = el.scrollTop;
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    const to = Math.max(0, Math.min(max, from + dist));
    const t0 = performance.now();
    // easeOutCubic: a flick's decay, gentle enough that the first frames do not
    // leap. easeOutQuart put ~44% of the distance in the first 15% of the time,
    // which reads as a jump however many samples you take.
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      el.scrollTop = from + (to - from) * ease(t);
      if (t < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });

  // Any real click also draws a tap, so page-driven clicks are covered too.
  addEventListener('mousedown', (e) => window.__demoTap(e.clientX, e.clientY), true);

  document.addEventListener('DOMContentLoaded', install);
  setTimeout(install, 0);
}

/** Inject before the first navigation. Re-runs on every page load. */
export async function installPhoneInput(page) {
  await page.addInitScript(bootstrap);
}

/** Tap a locator (or a point): draws the ripple, then clicks. */
export async function tap(page, target, opts = {}) {
  let x, y;
  if (typeof target?.boundingBox === 'function') {
    const b = await target.boundingBox({ timeout: opts.timeout ?? 8000 });
    if (!b) throw new Error('tap: target has no box');
    x = b.x + b.width / 2; y = b.y + b.height / 2;
  } else { ({ x, y } = target); }
  await page.evaluate(([a, b]) => window.__demoTap(a, b), [x, y]);
  await page.waitForTimeout(90);          // let the ripple be seen before the UI reacts
  await page.mouse.click(x, y);
  await page.waitForTimeout(opts.settle ?? 260);
}

/**
 * Swipe, and scroll by the same amount, WITH MOMENTUM.
 *
 * `dy` is the FINGER's travel: negative = finger moves up = content scrolls down.
 *
 * ── why the easing matters ─────────────────────────────────────────────────
 * A flick on a real phone is a decaying velocity: the content leaves fast and
 * coasts to a stop. Emitting equal wheel deltas on a fixed interval instead
 * produces CONSTANT velocity, which starts abruptly, ends abruptly, and reads as
 * a machine dragging a scrollbar — the single thing that most gives away a
 * scripted phone recording.
 *
 * So position follows easeOutQuart (`1-(1-t)^4`) and each tick emits the
 * DERIVATIVE — the difference between successive eased positions — which is
 * large at the start and tapers to nothing. `scrollDistance` defaults to the
 * finger's travel but can exceed it: a real flick throws the content further
 * than the finger moved.
 *
 * Step count is chosen so ticks land about one per captured frame at 30fps;
 * fewer and the motion strobes, many more and they coalesce with no benefit.
 */
export async function swipe(page, {
  dy = -420, x = null, ms = 620, scrollDistance = null, settle = 240,
} = {}) {
  const vp = page.viewportSize();
  const cx = x ?? vp.width / 2;
  const y0 = dy < 0 ? vp.height * 0.72 : vp.height * 0.30;
  const y1 = y0 + dy;
  const total = scrollDistance ?? -dy * 1.35;   // a flick coasts past the finger

  await page.evaluate(([a, b, c, d, e]) => window.__demoSwipe(a, b, c, d, e), [cx, y0, cx, y1, ms]);
  await page.mouse.move(cx, y0);
  // The motion is animated in the page (see __demoScroll) rather than driven by
  // mouse.wheel: CDP tops out around 30 events/second, which is at or below the
  // capture rate, so a wheel-driven scroll advances in visible chunks no matter
  // how the deltas are shaped.
  await page.evaluate(([d, m]) => window.__demoScroll(d, m), [total, ms]);
  await page.waitForTimeout(settle);
}
