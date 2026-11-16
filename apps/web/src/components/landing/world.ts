/**
 * Scroll-driven "world" engine for the landing page.
 *
 * Sections are stops on a path through a 3D space. The camera flies from stop
 * to stop while DOM elements are projected from world coordinates onto the
 * viewport, so type and imagery drift in depth instead of scrolling linearly.
 * A canvas behind the elements draws the path itself.
 *
 * The maths follows the same model as the reference: a depth unit `p`, camera
 * position `zc` derived from scroll, and a perspective projection per element.
 */

type Pair = [number, number];
type RGB = [number, number, number];

type Stop = {
  sec: HTMLElement;
  id: string;
  label: string;
  z: number;
  gap: number;
  hold: number;
  ease: number;
  ax: number;
  ay: number;
  dark: boolean;
  product: boolean;
  end: boolean;
  sHold: number;
  holdPx: number;
};

type Item = {
  el: HTMLElement;
  abs: number;
  st: Stop;
  x: number;
  y: number;
  zo: number;
  z: number;
  ff: number;
  fx: number;
  fy: number;
  r: number;
  vis: boolean;
  w0: number;
  h0: number;
  fill: HTMLElement | null;
  chars: { el: HTMLElement; start: number; width: number }[];
  fillPct: number;
};

type PathPoint = { z: number; x: number; y: number };

export type World = {
  destroy: () => void;
  goTo: (id: string) => void;
  refresh: () => void;
};

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

const smooth = (t: number) => {
  const v = clamp(t, 0, 1);
  return v * v * v * (v * (v * 6 - 15) + 10);
};

const num = (v: string | undefined, fallback: number) => {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
};

const pair = (v: string | undefined, fallback: Pair): Pair => {
  const [a, b] = (v || "").split(",");
  return [num(a, fallback[0]), num(b, fallback[1])];
};

const mix = (from: RGB, to: RGB, t: number) =>
  `rgb(${Math.round(from[0] + (to[0] - from[0]) * t)},${Math.round(
    from[1] + (to[1] - from[1]) * t,
  )},${Math.round(from[2] + (to[2] - from[2]) * t)})`;

const PALETTE: Record<string, [RGB, RGB]> = {
  bg: [
    [236, 234, 226],
    [11, 18, 32],
  ],
  ink: [
    [15, 23, 42],
    [241, 241, 238],
  ],
  muted: [
    [94, 99, 96],
    [154, 160, 156],
  ],
  hair: [
    [211, 208, 198],
    [44, 47, 45],
  ],
  line: [
    [67, 56, 202],
    [129, 140, 248],
  ],
};

const LINE_DARK: RGB = [67, 56, 202];
const LINE_LIGHT: RGB = [129, 140, 248];

export function createWorld(root: HTMLElement): World {
  const doc = document;
  const canvas = root.querySelector<HTMLCanvasElement>("#cv");
  const ctx = canvas?.getContext("2d") ?? null;
  const spacer = root.querySelector<HTMLElement>("#spacer");
  const product = root.querySelector<HTMLElement>("#product");
  const panel = product?.querySelector<HTMLElement>(".panel") ?? null;
  const hud = root.querySelector<HTMLElement>("#hud");
  const hudNum = root.querySelector<HTMLElement>("#hud-n");
  const hudLabel = root.querySelector<HTMLElement>("#hud-l");
  const hudTicks = root.querySelector<HTMLElement>("#hud-ticks");
  const counter = root.querySelector<HTMLElement>("[data-count-to]");

  let width = 0;
  let height = 0;
  let depth = 1000;
  let mobile = false;
  let stops: Stop[] = [];
  let items: Item[] = [];
  let segments: { s: number; zc: number; ease: number }[] = [];
  let path: PathPoint[] = [];
  let total = 0;
  let lastZ = 0;
  let cameraTarget = 0;
  let smoothScroll = 0;
  let intro = 0;
  let started = 0;
  let raf = 0;
  let lastRender = -1;
  let lastScroll = -1;
  let darkMix = -1;
  let currentStop = -1;
  let counted = false;
  let countRun = 0;
  let disposed = false;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  let productOpen = false;
  let lastFrame = 0;
  let lastIntro = -1;

  const measureViewport = () =>
    window.innerHeight || doc.documentElement.clientHeight || 900;

  const fitText = () => {
    if (!root) return;
    root.querySelectorAll<HTMLElement>(".el .d").forEach((el) => {
      if (getComputedStyle(el).whiteSpace !== "nowrap") return;
      el.style.fontSize = "";
      const w = el.offsetWidth;
      const max = width * 0.9;
      if (w > max) {
        el.style.fontSize = `${((parseFloat(getComputedStyle(el).fontSize) * max) / w).toFixed(1)}px`;
      }
    });
  };

  const build = () => {
    width = window.innerWidth;
    height = measureViewport() || 900;
    mobile = width < 760;
    depth = mobile ? 900 : clamp(width * 0.8, 900, 1400);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (canvas && ctx) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    fitText();

    stops = [];
    items = [];

    let z = 0;
    const sections = Array.from(root.querySelectorAll<HTMLElement>(".st"));

    sections.forEach((sec, index) => {
      const gap = num(sec.dataset.gap, 3);
      if (index) z += gap * depth;
      const anchor = pair(
        mobile && sec.dataset.ma ? sec.dataset.ma : sec.dataset.a,
        [0, 0],
      );
      const stop: Stop = {
        sec,
        id: sec.id,
        label: sec.dataset.label || "",
        z,
        gap,
        hold: num(sec.dataset.hold, 0.6),
        ease: num(sec.dataset.ease, 1),
        ax: anchor[0],
        ay: anchor[1],
        dark: sec.dataset.dark === "1",
        product: sec.dataset.product === "1",
        end: sec.dataset.end === "1",
        sHold: 0,
        holdPx: 0,
      };
      stops.push(stop);

      sec.querySelectorAll<HTMLElement>(".el").forEach((el) => {
        const pos = pair(
          mobile && el.dataset.mp ? el.dataset.mp : el.dataset.p,
          [0, 0],
        );
        const drift = pair(el.dataset.f, [0, 0]);
        const zo = mobile && el.dataset.mz ? num(el.dataset.mz, 0) : num(el.dataset.z, 0);
        const fillEl = el.querySelector<HTMLElement>("[data-fill]");
        el.style.visibility = "hidden";
        const item: Item = {
          el,
          abs: num(el.dataset.abs, 0),
          st: stop,
          x: pos[0],
          y: pos[1],
          zo,
          z: z + zo * depth,
          ff: Math.min(1.7, Math.max(1, gap * 0.82)) * depth,
          fx: mobile ? drift[0] * 0.5 : drift[0],
          fy: drift[1],
          r: mobile ? 0 : num(el.dataset.r, 0),
          vis: false,
          w0: 0,
          h0: 0,
          fill: fillEl,
          chars: [],
          fillPct: -1,
        };
        if (fillEl) {
          item.chars = Array.from(fillEl.querySelectorAll<HTMLElement>(".c")).map(
            (char) => ({ el: char, start: 0, width: 1 }),
          );
        }
        items.push(item);
        item.w0 = el.offsetWidth;
        item.h0 = el.offsetHeight;
        el.classList.toggle("far", zo > 0.2);
      });
    });

    // Scroll timeline: where each stop rests, and how long it holds.
    segments = [];
    let s = 0;
    const step = mobile ? 0.52 : 0.46;
    stops.forEach((stop, index) => {
      const behind = stop.z - depth;
      if (index) s += stop.gap * step * height;
      const longHold = stop.dark || stop.product;
      const lead = stop.dark || index === 0 ? 0 : 0.11;
      const hold = longHold ? stop.hold * height : stop.hold * height * 0.55;
      segments.push({ s, zc: behind - lead * depth, ease: index ? stop.ease * 0.45 : 0 });
      stop.sHold = s;
      stop.holdPx = hold;
      s += hold;
      segments.push({
        s,
        zc: behind + (stop.dark ? 0 : index === 0 ? 0.18 : 0.11) * depth,
        ease: 0,
      });
    });
    total = s;
    if (spacer) spacer.style.height = `${total + height}px`;

    // Camera path anchors, with a detour between widely spaced stops.
    const anchors: { z: number; x: number; y: number }[] = [
      { z: stops[0].z, x: stops[0].ax * width, y: stops[0].ay * height },
    ];
    let side = 1;
    for (let i = 1; i < stops.length; i += 1) {
      const prev = stops[i - 1];
      const next = stops[i];
      if (next.gap >= 2.2) {
        side = -side;
        anchors.push({
          z: prev.z + (next.z - prev.z) * 0.5,
          x: side * (mobile ? 0.85 : 1.05) * width,
          y: (side > 0 ? -0.42 : 0.46) * height,
        });
      }
      anchors.push({ z: next.z, x: next.ax * width, y: next.ay * height });
    }

    const n = anchors.length;
    const tanX: number[] = [];
    const tanY: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const back = anchors[Math.max(0, i - 1)];
      const ahead = anchors[Math.min(n - 1, i + 1)];
      const span = Math.max(1, ahead.z - back.z);
      tanX[i] = i === 0 || i === n - 1 ? 0 : (ahead.x - back.x) / span;
      tanY[i] = i === 0 || i === n - 1 ? 0 : (ahead.y - back.y) / span;
    }

    path = [];
    let lastZPoint = anchors[n - 1].z;
    for (let i = 0; i < n - 1; i += 1) {
      const from = anchors[i];
      const to = anchors[i + 1];
      const span = Math.max(1, to.z - from.z);
      const steps = Math.max(24, Math.round((span / depth) * 40));
      for (let k = 0; k < steps; k += 1) {
        const t = k / steps;
        const t2 = t * t;
        const t3 = t2 * t;
        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;
        path.push({
          z: from.z + span * t,
          x: h00 * from.x + h10 * span * tanX[i] + h01 * to.x + h11 * span * tanX[i + 1],
          y: h00 * from.y + h10 * span * tanY[i] + h01 * to.y + h11 * span * tanY[i + 1],
        });
      }
    }
    const tail = anchors[n - 1];
    path.push({ z: tail.z, x: tail.x, y: tail.y });
    lastZ = tail.z;

    // Letter fill measurements.
    items.forEach((item) => {
      if (!item.fill || !item.chars.length) return;
      const box = item.fill.getBoundingClientRect();
      if (!box.width) return;
      item.chars = item.chars.map((char) => {
        const r = char.el.getBoundingClientRect();
        return {
          el: char.el,
          start: ((r.left - box.left) / box.width) * 100,
          width: Math.max(0.01, (r.width / box.width) * 100),
        };
      });
    });

    if (product) {
      const panelEl = panel;
      if (panelEl) {
        const maxH = height - (mobile ? 126 : 160);
        const natural = panelEl.offsetHeight;
        panelEl.style.setProperty(
          "--fit",
          natural > maxH && maxH > 0 ? (maxH / natural).toFixed(3) : "1",
        );
      }
    }

    hudTicks?.replaceChildren(
      ...stops
        .filter((stop, i) => i === 0 || stop.gap >= 2.2)
        .map((stop) => {
          const tick = doc.createElement("i");
          tick.className = "tk";
          tick.dataset.s = String(stop.sHold);
          tick.style.top = `${((stop.sHold / total) * 100).toFixed(2)}%`;
          return tick;
        }),
    );

    smoothScroll = window.scrollY;
    cameraTarget = -1;
    lastRender = -1;
    lastScroll = -1;
  };

  const cameraZ = (scroll: number) => {
    if (!segments.length) return 0;
    if (scroll <= segments[0].s) return segments[0].zc;
    for (let i = 1; i < segments.length; i += 1) {
      const prev = segments[i - 1];
      const next = segments[i];
      if (scroll <= next.s) {
        const raw = (scroll - prev.s) / Math.max(1, next.s - prev.s);
        const t = raw * (1 - next.ease) + smooth(raw) * next.ease;
        return prev.zc + (next.zc - prev.zc) * t;
      }
    }
    return segments[segments.length - 1].zc;
  };

  const drawPath = (zc: number) => {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const near = depth * 0.1;
    const far = Math.min(zc + intro, lastZ);
    const lineColor = mix(LINE_DARK, LINE_LIGHT, clamp(darkMix, 0, 1));

    ctx.lineCap = "butt";
    ctx.lineJoin = "round";
    ctx.strokeStyle = lineColor;

    let segment: { a: number; w: number } | null = null;
    let prev: { X: number; Y: number; dz: number; z: number } | null = null;
    let tip: { X: number; Y: number; dz: number } | null = null;

    for (let i = 0; i < path.length; i += 1) {
      let point = path[i];
      if (point.z < zc + near) {
        prev = null;
        continue;
      }
      if (point.z > far) {
        if (!prev) break;
        const before = path[i - 1];
        if (!before) break;
        const t = (far - before.z) / Math.max(1, point.z - before.z);
        point = {
          z: far,
          x: before.x + (point.x - before.x) * t,
          y: before.y + (point.y - before.y) * t,
        };
      }

      const dist = point.z - zc;
      const scale = depth / dist;
      const X = cx + point.x * scale;
      const Y = cy + point.y * scale;
      const here = { X, Y, dz: dist, z: point.z };

      if (prev && Math.abs(X - prev.X) + Math.abs(Y - prev.Y) < 1.2) {
        prev = here;
        continue;
      }

      if (prev) {
        const w = clamp(2.4 * scale, 0.5, 7);
        const alpha =
          (1 - 0.82 * smooth((dist - 1.2 * depth) / (intro - 1.2 * depth))) *
          smooth((dist - near) / (0.3 * depth));
        const a = Math.round(alpha * 40) / 40;
        const lw = Math.round(w * 4) / 4;
        if (a <= 0) {
          if (segment) {
            ctx.stroke();
            segment = null;
          }
          prev = here;
          continue;
        }
        if (!segment || segment.a !== a || segment.w !== lw) {
          if (segment) ctx.stroke();
          segment = { a, w: lw };
          ctx.globalAlpha = a;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(prev.X, prev.Y);
        }
        ctx.lineTo(X, Y);
      } else if (segment) {
        ctx.stroke();
        segment = null;
      }

      prev = here;
      tip = here;
      if (point.z >= far) break;
    }

    if (segment) ctx.stroke();
    ctx.globalAlpha = 1;

    if (tip) {
      const scale = depth / tip.dz;
      const radius = clamp(5 * scale, 2.5, 14);
      const atEnd = far >= lastZ - 1;
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(tip.X, tip.Y, atEnd ? clamp(11 * scale, 6, 22) : radius, 0, Math.PI * 2);
      ctx.fill();
      if (!atEnd) {
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.arc(tip.X, tip.Y, radius * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  };

  const renderItems = (zc: number) => {
    const cx = width / 2;
    const cy = height / 2;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const dist = item.z - zc;
      const size = depth * (1 + item.zo);
      const ahead = dist - size;

      if (dist < 0.16 * depth || ahead > 2.7 * depth) {
        if (item.vis) {
          item.el.style.visibility = "hidden";
          item.vis = false;
        }
        continue;
      }

      const scale = (item.abs ? depth * item.abs : size) / dist;
      const s = ahead > 0 ? smooth(ahead / (1.9 * depth)) : 0;
      const x = (item.x + item.fx * s) * width;
      const y = (item.y + item.fy * s) * height;
      let px = cx + x * scale;
      let py = cy + y * scale;

      // Keep the element inside the viewport on narrow or tablet layouts,
      // where wide anchor offsets would push copy past the page gutters.
      const pad = 12;
      const halfW = (item.w0 * scale) / 2;
      const halfH = (item.h0 * scale) / 2;
      px = halfW * 2 <= width - pad * 2 ? clamp(px, halfW + pad, width - halfW - pad) : width / 2;
      py = halfH * 2 <= height - pad * 2 ? clamp(py, halfH + pad, height - halfH - pad) : height / 2;

      const fadeRange = item.ff;
      const opacity =
        ahead > 0
          ? 1 - smooth((ahead - 0.45 * fadeRange) / (0.55 * fadeRange))
          : 1 - smooth((-ahead - 0.22 * depth) / (0.42 * depth));

      if (opacity < 0.01) {
        if (item.vis) {
          item.el.style.visibility = "hidden";
          item.vis = false;
        }
        continue;
      }

      if (!item.vis) {
        item.el.style.visibility = "visible";
        item.vis = true;
      }

      item.el.style.opacity = opacity.toFixed(3);
      item.el.style.transform =
        `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0) ` +
        `translate(-50%,-50%) perspective(1100px) rotateY(${(item.r * s).toFixed(2)}deg) ` +
        `scale(${scale.toFixed(4)})`;
      item.el.style.setProperty("--k", s.toFixed(3));
      item.el.style.setProperty(
        "--fp",
        clamp((0.55 * depth - ahead) / (0.65 * depth), 0, 1).toFixed(3),
      );
      item.el.style.setProperty(
        "--dp",
        smooth((-ahead - 0.03 * depth) / (0.38 * depth)).toFixed(3),
      );

      const spread = Math.max(0, (-ahead - 0.03 * depth) / (0.38 * depth));
      const sp =
        spread < 1
          ? 3 * spread * spread - 2 * spread * spread * spread + 0.35 * (spread * spread * spread - spread * spread)
          : 1 + 0.35 * (spread - 1);
      item.el.style.setProperty("--sp", sp.toFixed(3));

      item.el.style.pointerEvents =
        opacity > 0.6 && scale < 1.6 ? "auto" : "none";

      if (item.fill) {
        const p = clamp((0.55 * depth - ahead) / (0.65 * depth), 0, 1);
        const z = clamp((-ahead - 0.1 * depth) / (0.42 * depth), 0, 1);
        const pct = Math.min(100, p * 96 + z * 26);
        if (Math.abs(pct - item.fillPct) > 0.2) {
          item.fillPct = pct;
          item.chars.forEach((char) => {
            const covered = clamp((pct - char.start) / char.width, 0, 1) * 100;
            char.el.style.setProperty("--cf", `${covered.toFixed(1)}%`);
          });
        }
      }
    }
  };

  const applyTheme = (zc: number) => {
    let mixValue = 0;
    stops.forEach((stop) => {
      if (!stop.dark) return;
      const u = stop.z - zc - depth;
      mixValue = Math.max(
        mixValue,
        Math.min(
          1 - smooth((u - 0.45 * depth) / (0.85 * depth)),
          1 - smooth((-u - 0.6 * depth) / (0.65 * depth)),
        ),
      );
    });

    if (Math.abs(mixValue - darkMix) > 0.003) {
      darkMix = mixValue;
      Object.entries(PALETTE).forEach(([key, [from, to]]) => {
        root.style.setProperty(`--${key}`, mix(from, to, mixValue));
      });
    }

    if (counter) {
      const numbers = stops.find((stop) => stop.id === "numbers");
      if (numbers) {
        const u = numbers.z - zc - depth;
        if (!counted && u < 0.5 * depth && u > -0.8 * depth) {
          counted = true;
          const target = num(counter.dataset.countTo, 0);
          const startedAt = performance.now();
          const run = ++countRun;
          const tickCount = (now: number) => {
            if (run !== countRun) return;
            const t = clamp((now - startedAt) / 1100, 0, 1);
            counter.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
            if (t < 1) requestAnimationFrame(tickCount);
          };
          requestAnimationFrame(tickCount);
        } else if (counted && u > 1.4 * depth) {
          counted = false;
          countRun += 1;
          counter.textContent = counter.dataset.countTo ?? "0";
        }
      }
    }
  };

  const renderProduct = (scroll: number) => {
    if (!product || !panel) return;
    const stop = stops.find((item) => item.product);
    if (!stop) return;

    const open = smooth((scroll - (stop.sHold - 0.75 * height)) / (1.05 * height));
    const shrink = smooth(
      (scroll - (stop.sHold + stop.holdPx - 1.05 * height)) / height,
    );

    if (open <= 0 || shrink >= 1) {
      if (productOpen) {
        product.style.visibility = "hidden";
        product.style.pointerEvents = "none";
        productOpen = false;
      }
      return;
    }

    if (!productOpen) {
      product.style.visibility = "visible";
      productOpen = true;
    }

    const radius = Math.hypot(width, height) * 0.62 * open + 1;
    panel.style.clipPath =
      `circle(${radius.toFixed(1)}px at ${width / 2 + stop.ax * width}px ${height / 2 + stop.ay * height}px)`;
    const scale = 1 - 0.84 * shrink;
    panel.style.transform =
      `perspective(1200px) translate3d(0,${(-shrink * height * 0.04).toFixed(1)}px,0) ` +
      `rotateX(${(shrink * 14).toFixed(2)}deg) scale(${scale.toFixed(4)})`;
    panel.style.borderRadius = `${(shrink * 36).toFixed(1)}px`;
    panel.style.opacity = (1 - smooth((shrink - 0.7) / 0.3)).toFixed(3);

    const copyT = (scroll - (stop.sHold - 0.55 * height)) / (0.75 * height);
    root.querySelectorAll<HTMLElement>("#product .fly").forEach((el, i) => {
      el.style.setProperty("--q", (1 - smooth(copyT * 1.4 - 0.05 - i * 0.09)).toFixed(3));
    });

    product.style.pointerEvents = open > 0.98 && shrink < 0.2 ? "auto" : "none";
  };

  const renderHud = (scroll: number) => {
    if (!hud) return;
    let active = stops[0];
    let index = 0;
    let seen = 0;
    stops.forEach((stop) => {
      if (stop.gap >= 2.2 || stop === stops[0]) {
        if (scroll >= stop.sHold - 0.6 * height) {
          active = stop;
          index = seen;
        }
        seen += 1;
      }
    });

    if (currentStop !== index) {
      currentStop = index;
      if (hudLabel) hudLabel.textContent = active.label;
      if (hudNum) hudNum.textContent = String(index + 1).padStart(2, "0");
    }

    hud.style.setProperty("--p", clamp(scroll / total, 0, 1).toFixed(4));
    hudTicks?.querySelectorAll<HTMLElement>(".tk").forEach((tick) => {
      tick.classList.toggle("on", Number(tick.dataset.s) <= scroll + 2);
    });
  };

  const frame = (now: number) => {
    if (disposed) return;
    if (!started) started = now;
    const dt = Math.min(0.05, (now - (lastFrame || now)) / 1000);
    lastFrame = now;

    const scroll = window.scrollY;
    const delta = scroll - smoothScroll;
    smoothScroll += delta * (1 - Math.exp(-dt * (Math.abs(delta) > 3 * height ? 9 : 5.5)));
    if (Math.abs(delta) < 0.3) smoothScroll = scroll;

    const introT = clamp((now - started - 250) / 1700, 0, 1);
    intro = (mobile ? 3 : 3.3) * depth * smooth(introT);

    const zc = cameraZ(smoothScroll);
    const dirty =
      Math.abs(zc - cameraTarget) > 0.02 ||
      Math.abs(smoothScroll - lastScroll) > 0.2 ||
      Math.abs(intro - lastIntro) > 0.5 ||
      lastRender < 0;

    if (dirty) {
      cameraTarget = zc;
      lastIntro = intro;
      lastScroll = smoothScroll;
      lastRender = now;
      applyTheme(zc);
      drawPath(zc);
      renderItems(zc);
      renderProduct(smoothScroll);
      renderHud(smoothScroll);
    }

    raf = requestAnimationFrame(frame);
  };

  const goTo = (id: string) => {
    const stop = stops.find((item) => item.id === id);
    if (!stop) {
      const target = doc.getElementById(id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.scrollTo({ top: stop.sHold + 2, behavior: "smooth" });
  };

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const y = window.scrollY;
      build();
      window.scrollTo(0, y);
      lastRender = -1;
    }, 160);
  };

  build();
  root.classList.add("is3d");
  smoothScroll = window.scrollY;
  started = performance.now();
  raf = requestAnimationFrame(frame);

  window.addEventListener("resize", onResize, { passive: true });
  if (doc.fonts?.ready) {
    doc.fonts.ready.then(() => {
      if (disposed) return;
      const y = window.scrollY;
      build();
      window.scrollTo(0, y);
      lastRender = -1;
    }).catch(() => {});
  }

  return {
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      root.classList.remove("is3d");
      root.style.cssText = "";
      if (spacer) spacer.style.height = "";
      items.forEach((item) => {
        item.el.style.cssText = "";
      });
      stops.forEach((stop) => stop.sec.removeAttribute("style"));
      if (panel) panel.removeAttribute("style");
      if (product) product.removeAttribute("style");
      hud?.removeAttribute("style");
    },
    goTo,
    refresh() {
      build();
      lastRender = -1;
    },
  };
}
