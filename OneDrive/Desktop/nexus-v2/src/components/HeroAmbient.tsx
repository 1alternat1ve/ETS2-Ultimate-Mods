import { useEffect, useRef } from "react";

/**
 * Ambient particle background — teal signal lights (hue 165-185) floating upward.
 * Clean steel aesthetic with teal glow.
 */
export function HeroAmbient({ height = 320 }: { height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      if (!cvs) return;
      cvs.width = cvs.clientWidth * dpr;
      cvs.height = cvs.clientHeight * dpr;
      ctx?.scale(dpr, dpr);
    }
    resize();

    const N = 28;
    type P = { x: number; y: number; v: number; phase: number; size: number; hue: number };
    const W = () => cvs.clientWidth;
    const H = () => cvs.clientHeight;

    // Teal hues (165-185) + occasional teal variant
    const particles: P[] = Array.from({ length: N }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      v: 0.14 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      size: 1.2 + Math.random() * 2.0,
      hue: 165 + Math.random() * 20,
    }));

    let last = performance.now();
    function tick(ts: number) {
      const dt = Math.min(48, ts - last);
      last = ts;
      ctx!.clearRect(0, 0, W(), H());

      for (const p of particles) {
        p.y -= p.v * (dt / 16);
        p.phase += 0.010;
        if (p.y < -8) {
          p.y = H() + 8;
          p.x = Math.random() * W();
        }
        const wobbleX = p.x + Math.sin(p.phase) * 18;
        const alpha = 0.08 + 0.28 * (1 - p.y / H());
        const grad = ctx!.createRadialGradient(wobbleX, p.y, 0, wobbleX, p.y, p.size * 5);
        grad.addColorStop(0, `hsla(${p.hue},75%,65%,${alpha})`);
        grad.addColorStop(1, "hsla(170,60%,30%,0)");
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(wobbleX, p.y, p.size * 5, 0, Math.PI * 2);
        ctx!.fill();
      }

      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    const ro = new ResizeObserver(resize);
    ro.observe(cvs);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height,
        pointerEvents: "none",
        opacity: 0.8,
      }}
    />
  );
}
