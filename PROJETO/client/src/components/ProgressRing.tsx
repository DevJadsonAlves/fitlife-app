/**
 * ProgressRing — SVG circular progress indicator with neon glow
 * Design: Neon Vitals — stroke with glow effect, animated fill
 */
import { useEffect, useState } from "react";

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  glowColor?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}

export default function ProgressRing({
  percent,
  size = 80,
  strokeWidth = 6,
  color,
  glowColor,
  label,
  sublabel,
  className = "",
}: ProgressRingProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPercent / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercent(Math.min(percent, 100));
    }, 100);
    return () => clearTimeout(timer);
  }, [percent]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <filter id={`glow-${color.replace(/[^a-z0-9]/gi, "")}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/5"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter={glowColor ? `url(#glow-${color.replace(/[^a-z0-9]/gi, "")})` : undefined}
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <span
            className="font-mono font-bold leading-none"
            style={{ color, fontSize: size * 0.22 }}
          >
            {label}
          </span>
        )}
        {sublabel && (
          <span
            className="text-muted-foreground leading-none mt-0.5"
            style={{ fontSize: size * 0.12 }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
