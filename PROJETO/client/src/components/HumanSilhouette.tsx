/**
 * HumanSilhouette — SVG human body that fills with color based on hydration %
 * Versão original que você pediu (cabeça visível + verde em 100%)
 */
interface HumanSilhouetteProps {
  percent: number;
  size?: number;
}

export default function HumanSilhouette({
  percent,
  size = 280,
}: HumanSilhouetteProps) {
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const fillHeight = clampedPercent / 100;

  const fillColor = clampedPercent >= 100 ? "#22c55e" : "#22d3ee";
  const strokeColor =
    clampedPercent >= 100 ? "#4ade80" : "rgba(34,211,238,0.3)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 355" width={size} height={size} className="mx-auto">
        <defs>
          <clipPath id="bodyClip">
            <circle cx="100" cy="40" r="28" />
            <rect x="88" y="65" width="24" height="15" rx="4" />
            <path d="M60,80 Q55,80 52,90 L45,140 Q42,155 50,165 L55,170 Q58,175 60,180 L60,210 Q60,220 65,225 L70,228 Q75,230 80,230 L120,230 Q125,230 130,228 L135,225 Q140,220 140,210 L140,180 Q142,175 145,170 L150,165 Q158,155 155,140 L148,90 Q145,80 140,80 Z" />
            <path d="M52,90 Q40,95 32,110 L22,145 Q18,158 22,162 L28,165 Q34,167 38,158 L52,120 Q55,112 55,105 Z" />
            <path d="M148,90 Q160,95 168,110 L178,145 Q182,158 178,162 L172,165 Q166,167 162,158 L148,120 Q145,112 145,105 Z" />
            <path d="M65,225 Q60,230 58,240 L52,290 Q50,305 52,315 L55,325 Q58,332 65,332 L78,332 Q82,332 82,328 L82,320 Q82,315 80,310 L78,290 L82,240 Q84,232 85,228 Z" />
            <path d="M135,225 Q140,230 142,240 L148,290 Q150,305 148,315 L145,325 Q142,332 135,332 L122,332 Q118,332 118,328 L118,320 Q118,315 120,310 L122,290 L118,240 Q116,232 115,228 Z" />
          </clipPath>

          <linearGradient id="waterGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.75" />
          </linearGradient>
        </defs>

        <g clipPath="url(#bodyClip)">
          <rect x="0" y="0" width="200" height="340" fill="rgba(34,211,238,0.08)" />
          <rect
            x="0"
            y={340 - 340 * fillHeight}
            width="200"
            height={340 * fillHeight}
            fill="url(#waterGradient)"
            style={{ transition: "y 0.8s ease-out, height 0.8s ease-out" }}
          />
        </g>

        <circle
          cx="100"
          cy="40"
          r="28"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        <path
          d="M60,80 Q55,80 52,90 L45,140 Q42,155 50,165 L55,170 Q58,175 60,180 L60,210 Q60,220 65,225 L70,228 Q75,230 80,230 L120,230 Q125,230 130,228 L135,225 Q140,220 140,210 L140,180 Q142,175 145,170 L150,165 Q158,155 155,140 L148,90 Q145,80 140,80 Z"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        <path
          d="M52,90 Q40,95 32,110 L22,145 Q18,158 22,162 L28,165 Q34,167 38,158 L52,120"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        <path
          d="M148,90 Q160,95 168,110 L178,145 Q182,158 178,162 L172,165 Q166,167 162,158 L148,120"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        <path
          d="M65,225 Q60,230 58,240 L52,290 Q50,305 52,315 L55,325 Q58,332 65,332 L78,332 Q82,332 82,328 L82,320 Q82,315 80,310 L78,290 L82,240"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        <path
          d="M135,225 Q140,230 142,240 L148,290 Q150,305 148,315 L145,325 Q142,332 135,332 L122,332 Q118,332 118,328 L118,320 Q118,315 120,310 L122,290 L118,240"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`font-mono text-3xl font-bold transition-colors duration-700 ${
            clampedPercent >= 100 ? "text-emerald-400" : "text-cyan-300"
          }`}
        >
          {Math.round(clampedPercent)}%
        </span>
      </div>
    </div>
  );
}
