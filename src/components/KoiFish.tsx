import { useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
}

interface Ripple extends Point {
  r: number;
  alpha: number;
}

const SEG_COUNT = 9;
const LAG = 5;
const WIDTHS = [9, 14, 18, 20, 19, 16, 12, 7, 2.5];

export function KoiFish() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const mouse = { x: width * 0.5, y: height * 0.4, active: false, lastMove: -1e9 };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
      mouse.lastMove = performance.now();
    };
    const onLeave = () => {
      mouse.active = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    let idleTarget: Point = { x: width * 0.5, y: height * 0.4 };
    let idleTimer = 0;
    const pickIdleTarget = () => {
      idleTarget = {
        x: width * 0.12 + Math.random() * width * 0.76,
        y: height * 0.15 + Math.random() * height * 0.7,
      };
    };
    pickIdleTarget();

    let history: Point[] = [{ x: idleTarget.x, y: idleTarget.y }];
    const historyMax = SEG_COUNT * LAG + 20;
    const head = { x: idleTarget.x, y: idleTarget.y };
    const vel = { x: 0, y: 0 };
    const ripples: Ripple[] = [];

    const getColors = () => {
      const s = getComputedStyle(document.documentElement);
      return {
        gold: s.getPropertyValue("--accent").trim(),
        shu: s.getPropertyValue("--warm").trim(),
        paper: s.getPropertyValue("--text").trim(),
        ink: s.getPropertyValue("--bg").trim(),
      };
    };

    const sampleHistory = (idx: number) => {
      const i = Math.min(Math.round(idx), history.length - 1);
      return history[i] ?? history[history.length - 1];
    };

    const drawKoi = (colors: ReturnType<typeof getColors>) => {
      if (history.length < 2) return;
      const points: Point[] = [];
      for (let i = 0; i < SEG_COUNT; i++) points.push(sampleHistory(i * LAG));

      const top: Point[] = [];
      const bottom: Point[] = [];
      for (let j = 0; j < points.length; j++) {
        const p = points[j];
        const next = points[j + 1] ?? p;
        const prev = points[j - 1] ?? p;
        const tx = prev.x - next.x;
        const ty = prev.y - next.y;
        const len = Math.hypot(tx, ty) || 1;
        const nx = -ty / len;
        const ny = tx / len;
        const w = WIDTHS[j] ?? 3;
        top.push({ x: p.x + nx * w, y: p.y + ny * w });
        bottom.push({ x: p.x - nx * w, y: p.y - ny * w });
      }

      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(top[0].x, top[0].y);
      for (let a = 1; a < top.length; a++) ctx.lineTo(top[a].x, top[a].y);
      for (let b = bottom.length - 1; b >= 0; b--) ctx.lineTo(bottom[b].x, bottom[b].y);
      ctx.closePath();

      const grad = ctx.createLinearGradient(points[0].x, points[0].y, points[points.length - 1].x, points[points.length - 1].y);
      grad.addColorStop(0, colors.paper);
      grad.addColorStop(0.5, colors.gold);
      grad.addColorStop(1, colors.shu);
      ctx.fillStyle = grad;
      ctx.fill();

      const dirx = points[0].x - points[1].x;
      const diry = points[0].y - points[1].y;
      const dl = Math.hypot(dirx, diry) || 1;
      ctx.beginPath();
      ctx.arc(points[0].x + (dirx / dl) * 5, points[0].y + (diry / dl) * 5, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = colors.ink;
      ctx.fill();
      ctx.restore();
    };

    const drawRipples = (dt: number, colors: ReturnType<typeof getColors>) => {
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += 24 * dt;
        r.alpha -= 0.55 * dt;
        if (r.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.strokeStyle = colors.gold;
        ctx.globalAlpha = Math.max(r.alpha, 0) * 0.4;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    let rafId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      const idleFor = now - mouse.lastMove;
      let target: Point;
      if (mouse.active && idleFor < 4500) {
        target = mouse;
      } else {
        idleTimer -= dt;
        if (idleTimer <= 0) {
          pickIdleTarget();
          idleTimer = 3 + Math.random() * 3;
        }
        target = idleTarget;
      }

      const stiffness = 85;
      const damping = 11.5;
      const ax = (target.x - head.x) * stiffness - vel.x * damping;
      const ay = (target.y - head.y) * stiffness - vel.y * damping;
      vel.x += ax * dt;
      vel.y += ay * dt;
      head.x += vel.x * dt;
      head.y += vel.y * dt;

      history.unshift({ x: head.x, y: head.y });
      if (history.length > historyMax) history.length = historyMax;

      const speed = Math.hypot(vel.x, vel.y);
      if (speed > 55 && Math.random() < 0.05) {
        ripples.push({ x: head.x, y: head.y, r: 2, alpha: 0.4 });
      }

      ctx.clearRect(0, 0, width, height);
      const colors = getColors();
      drawRipples(dt, colors);
      drawKoi(colors);

      rafId = requestAnimationFrame(tick);
    };

    if (reduceMotion) {
      const colors = getColors();
      history = [];
      for (let i = 0; i < 40; i++) {
        history.push({ x: width * 0.5 - i * 2.2, y: height * 0.4 + Math.sin(i * 0.3) * 3 });
      }
      drawKoi(colors);
    } else {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" />;
}
