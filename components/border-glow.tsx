"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useRef } from "react";

type BorderGlowProps = {
  children: ReactNode;
  className?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  colors?: string[];
  fillOpacity?: number;
};

function parseHSL(hslStr: string) {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 190, s: 85, l: 72 };
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) };
}

function buildGlowVars(glowColor: string, intensity: number) {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ["", "-60", "-50", "-40", "-30", "-20", "-10"];
  return Object.fromEntries(
    opacities.map((opacity, index) => [
      `--glow-color${keys[index]}`,
      `hsl(${base} / ${Math.min(opacity * intensity, 100)}%)`,
    ]),
  );
}

const gradientPositions = ["80% 55%", "69% 34%", "8% 6%", "41% 38%", "86% 85%", "82% 18%", "51% 4%"];
const gradientKeys = [
  "--gradient-one",
  "--gradient-two",
  "--gradient-three",
  "--gradient-four",
  "--gradient-five",
  "--gradient-six",
  "--gradient-seven",
];
const colorMap = [0, 1, 2, 0, 1, 2, 1];

function buildGradientVars(colors: string[]) {
  const vars: Record<string, string> = {};
  for (let index = 0; index < 7; index += 1) {
    const color = colors[Math.min(colorMap[index], colors.length - 1)];
    vars[gradientKeys[index]] = `radial-gradient(at ${gradientPositions[index]}, ${color} 0px, transparent 50%)`;
  }
  vars["--gradient-base"] = `linear-gradient(${colors[0]} 0 100%)`;
  return vars;
}

export function BorderGlow({
  children,
  className = "",
  edgeSensitivity = 24,
  glowColor = "188 92 74",
  backgroundColor = "rgb(8 18 28 / 78%)",
  borderRadius = 14,
  glowRadius = 28,
  glowIntensity = 1.25,
  coneSpread = 28,
  colors = ["#22d3ee", "#f472b6", "#a7f3d0"],
  fillOpacity = 0.38,
}: BorderGlowProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
    const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
    const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    card.style.setProperty("--edge-proximity", `${(edge * 100).toFixed(3)}`);
    card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
  }, []);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerMove}
      className={`border-glow-card ${className}`}
      style={
        {
          "--card-bg": backgroundColor,
          "--edge-sensitivity": edgeSensitivity,
          "--border-radius": `${borderRadius}px`,
          "--glow-padding": `${glowRadius}px`,
          "--cone-spread": coneSpread,
          "--fill-opacity": fillOpacity,
          ...buildGlowVars(glowColor, glowIntensity),
          ...buildGradientVars(colors),
        } as CSSProperties
      }
    >
      <span className="edge-light" />
      <div className="border-glow-inner">{children}</div>
    </div>
  );
}
