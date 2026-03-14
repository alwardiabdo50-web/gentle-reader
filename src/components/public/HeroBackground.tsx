import { useEffect, useRef } from "react";

interface Dot {
  x: number;
  y: number;
  phase: number;
  radialAlpha: number;
}

export function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SPACING = 40;
    const DOT_RADIUS = 1.4;
    // Teal accent: hsl(168 84% 49%) ≈ rgb(20, 184, 166)
    const R = 20, G = 184, B = 166;

    function buildDots() {
      const w = canvas!.width;
      const h = canvas!.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      const dots: Dot[] = [];

      for (let x = SPACING / 2; x < w; x += SPACING) {
        for (let y = SPACING / 2; y < h; y += SPACING) {
          const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
          const radialAlpha = Math.max(0, 1 - (dist / maxDist) * 1.3);
          dots.push({ x, y, phase: Math.random() * Math.PI * 2, radialAlpha });
        }
      }
      dotsRef.current = dots;
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots();
    }

    resize();
    window.addEventListener("resize", resize);

    function draw(time: number) {
      const w = canvas!.getBoundingClientRect().width;
      const h = canvas!.getBoundingClientRect().height;
      ctx!.clearRect(0, 0, w, h);

      // Radial teal glow behind dots
      const cx = w / 2;
      const cy = h / 2;
      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.5);
      grad.addColorStop(0, `rgba(${R}, ${G}, ${B}, 0.06)`);
      grad.addColorStop(0.5, `rgba(${R}, ${G}, ${B}, 0.02)`);
      grad.addColorStop(1, `rgba(${R}, ${G}, ${B}, 0)`);
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, w, h);

      // Animated dots
      const t = time * 0.001;
      for (const dot of dotsRef.current) {
        const breathe = Math.sin(t * 0.8 + dot.phase) * 0.35 + 0.65;
        const alpha = dot.radialAlpha * breathe * 0.45;
        if (alpha < 0.01) continue;
        ctx!.beginPath();
        ctx!.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${R}, ${G}, ${B}, ${alpha})`;
        ctx!.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}
