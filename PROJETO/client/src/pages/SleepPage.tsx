/**
 * SleepPage — Sono
 * Ref: Anel de horas com ícone lua, hora de dormir/acordar com inputs, qualidade com estrelas,
 * observações textarea, média semanal/meta ideal, sono da semana com barras
 */
import { useState, useMemo } from "react";
import { useHabits } from "@/contexts/HabitsContext";
import ProgressRing from "@/components/ProgressRing";
import { motion } from "framer-motion";
import { Moon, Sun, Clock, Star, TrendingUp, BedDouble } from "lucide-react";
import { toast } from "sonner";

const COLOR = "#818cf8";

const QUALITY_LABELS = ["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"];

function getWeekDays(currentDate: Date): { label: string; dateStr: string; isToday: boolean }[] {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dayOfWeek = currentDate.getDay();
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() - ((dayOfWeek + 6) % 7));
  const days = [];
  const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({ label: labels[i], dateStr: d.toISOString().split("T")[0], isToday: d.toISOString().split("T")[0] === todayStr });
  }
  return days;
}

export default function SleepPage() {
  const { sleepEntries, addSleepEntry, getDayEntries, goals, currentDate } = useHabits();
  const [bedtime, setBedtime] = useState("");
  const [wakeup, setWakeup] = useState("");
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState("");

  const todayEntries = getDayEntries(sleepEntries);
  const latestSleep = todayEntries.length > 0 ? todayEntries[todayEntries.length - 1] : null;
  const sleepHours = latestSleep ? latestSleep.duration : 0;
  const percent = Math.min((sleepHours / goals.sleepHours) * 100, 100);

  const calcDuration = (bed: string, wake: string): number => {
    if (!bed || !wake) return 0;
    const [bh, bm] = bed.split(":").map(Number);
    const [wh, wm] = wake.split(":").map(Number);
    let bedMin = bh * 60 + bm;
    let wakeMin = wh * 60 + wm;
    if (wakeMin <= bedMin) wakeMin += 24 * 60;
    return parseFloat(((wakeMin - bedMin) / 60).toFixed(1));
  };

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const weekData = useMemo(() => {
    return weekDays.map((day) => {
      const dayEntries = sleepEntries.filter((e) => e.date === day.dateStr);
      const lastEntry = dayEntries.length > 0 ? dayEntries[dayEntries.length - 1] : null;
      const hours = lastEntry ? lastEntry.duration : 0;
      const qualityVal = lastEntry ? lastEntry.quality : 0;
      return { ...day, hours, quality: qualityVal };
    });
  }, [weekDays, sleepEntries]);

  const weekAverage = useMemo(() => {
    const withData = weekData.filter((d) => d.hours > 0);
    if (withData.length === 0) return 0;
    return parseFloat((withData.reduce((s, d) => s + d.hours, 0) / withData.length).toFixed(1));
  }, [weekData]);

  const handleSave = () => {
    if (!bedtime || !wakeup) {
      toast.error("Preencha os horários de dormir e acordar");
      return;
    }
    const duration = calcDuration(bedtime, wakeup);
    if (duration <= 0 || duration > 24) {
      toast.error("Horários inválidos");
      return;
    }
    addSleepEntry({ bedtime, wakeup, quality, duration, notes });
    toast.success("Sono registrado!");
    setBedtime("");
    setWakeup("");
    setQuality(3);
    setNotes("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Moon className="w-6 h-6" style={{ color: COLOR }} />
          <h2 className="text-2xl font-bold" style={{ color: COLOR }}>Sono</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Monitore a qualidade do seu descanso</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Sleep ring + quality + stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-6"
        >
          <div className="flex flex-col items-center">
            {/* Progress ring */}
            <ProgressRing
              percent={percent}
              size={180}
              strokeWidth={10}
              color={COLOR}
              glowColor={COLOR}
              label={`${sleepHours.toFixed(1)}`}
              sublabel="horas"
            />

            {/* Quality stars */}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">Qualidade do sono</p>
              <div className="flex gap-1 justify-center">
                {([1, 2, 3, 4, 5] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuality(s)}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className="w-6 h-6"
                      fill={quality >= s ? "#eab308" : "transparent"}
                      style={{ color: quality >= s ? "#eab308" : "var(--muted-foreground)" }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mt-5">
              <div className="text-center">
                <p className="text-lg font-mono font-bold" style={{ color: COLOR }}>{weekAverage}h</p>
                <p className="text-[10px] text-muted-foreground">Média semanal</p>
              </div>
              <div className="w-px h-8 bg-border/50" />
              <div className="text-center">
                <p className="text-lg font-mono font-bold text-foreground">{goals.sleepHours}h</p>
                <p className="text-[10px] text-muted-foreground">Meta ideal</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right: Inputs */}
        <div className="lg:col-span-3 space-y-4">
          {/* Bedtime */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border/50 bg-card p-5"
          >
            <div className="flex items-center gap-3 mb-1">
              <BedDouble className="w-5 h-5" style={{ color: COLOR }} />
              <div>
                <h3 className="text-sm font-bold">Hora de Dormir</h3>
                <p className="text-xs text-muted-foreground">Quando você foi para a cama</p>
              </div>
            </div>
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              placeholder="--:--"
              className="w-full mt-2 px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-sm font-mono focus:border-indigo-500/50 focus:outline-none transition-colors"
            />
          </motion.div>

          {/* Wakeup */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/50 bg-card p-5"
          >
            <div className="flex items-center gap-3 mb-1">
              <Sun className="w-5 h-5 text-yellow-400" />
              <div>
                <h3 className="text-sm font-bold">Hora de Acordar</h3>
                <p className="text-xs text-muted-foreground">Quando você levantou</p>
              </div>
            </div>
            <input
              type="time"
              value={wakeup}
              onChange={(e) => setWakeup(e.target.value)}
              placeholder="--:--"
              className="w-full mt-2 px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-sm font-mono focus:border-indigo-500/50 focus:outline-none transition-colors"
            />
          </motion.div>

          {/* Notes */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border/50 bg-card p-5"
          >
            <h3 className="text-sm font-bold mb-2">Observações</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Como foi seu sono? Sonhou? Acordou durante a noite?"
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-sm focus:border-indigo-500/50 focus:outline-none transition-colors resize-none"
            />
          </motion.div>

          {/* Save button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={handleSave}
            className="w-full py-3 rounded-xl font-medium text-sm text-background transition-all hover:opacity-90"
            style={{ backgroundColor: COLOR }}
          >
            Salvar Registro de Sono
          </motion.button>
        </div>
      </div>

      {/* Week summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl border border-border/50 bg-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4" style={{ color: COLOR }} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sono da Semana</h3>
        </div>
        <div className="flex justify-between gap-1">
          {weekData.map((day) => {
            const barHeight = Math.max(4, (day.hours / 12) * 80);
            return (
              <div key={day.dateStr} className="flex flex-col items-center gap-1 flex-1">
                <span
                  className={`text-[10px] font-medium ${day.isToday ? "font-bold" : "text-muted-foreground"}`}
                  style={day.isToday ? { color: COLOR } : {}}
                >
                  {day.label}
                </span>
                <div className="w-full max-w-[32px] h-20 rounded-lg bg-secondary/30 relative overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-500"
                    style={{
                      height: `${barHeight}px`,
                      backgroundColor: day.isToday ? COLOR : "rgba(129,140,248,0.25)",
                    }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground font-mono">
                  {day.hours > 0 ? `${day.hours}h` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
