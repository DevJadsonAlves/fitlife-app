import { useState, useEffect, useRef } from "react";
import { Timer, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const COLOR = "#f97316";

export function RestTimer() {
  const [seconds, setSeconds] = useState(90);
  const [initialSeconds, setInitialSeconds] = useState(90);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const presets = [30, 60, 90, 120, 180];

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, seconds]);

  useEffect(() => {
    if (isFinished) {
      toast.success("Descanso finalizado! Hora da próxima série! 💪");
      setIsFinished(false);
    }
  }, [isFinished]);

  const progress = initialSeconds > 0 ? ((initialSeconds - seconds) / initialSeconds) * 100 : 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(initialSeconds);
  };

  const handlePreset = (s: number) => {
    setIsRunning(false);
    setSeconds(s);
    setInitialSeconds(s);
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Timer className="w-4 h-4" style={{ color: COLOR }} />
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Timer de Descanso</h3>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" className="text-secondary/50" strokeWidth="4" />
              <circle
                cx="32" cy="32" r="28" fill="none" stroke={COLOR} strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-mono font-bold">{mins}:{secs.toString().padStart(2, "0")}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:opacity-80"
              style={{ backgroundColor: isRunning ? "#ef4444" : COLOR }}
            >
              {isRunning ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
            </button>
            <button
              onClick={handleReset}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 justify-end">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => handlePreset(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                initialSeconds === p && !isRunning
                  ? "text-background font-bold"
                  : "border border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              style={initialSeconds === p && !isRunning ? { backgroundColor: COLOR } : {}}
            >
              {p >= 60 ? `${p / 60}min` : `${p}s`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
