/**
 * WaterPage - Ingestao de Agua (versao anterior - engrenagem toggle simples)
 */
import { useMemo, useState } from "react";
import { useHabits } from "@/contexts/HabitsContext";
import HumanSilhouette from "@/components/HumanSilhouette";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Plus, Minus, Clock, Settings, TrendingUp, Flame, Droplet } from "lucide-react";
import { toast } from "sonner";

const GLASS_SIZES = [200, 250, 300, 350, 500];
const COLOR = "#22d3ee";

function getWeekDays(currentDate: Date): { label: string; dateStr: string; isToday: boolean }[] {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dayOfWeek = currentDate.getDay();
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() - ((dayOfWeek + 6) % 7));

  const days = [];
  const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({ label: labels[i], dateStr, isToday: dateStr === todayStr });
  }
  return days;
}

export default function WaterPage() {
  const {
    waterEntries, addWaterEntry, removeLastWaterEntry, resetWaterToday,
    getTodayWaterTotal, getDayEntries, goals, setGoals, currentDate, streaks,
  } = useHabits();

  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const todayTotal = getTodayWaterTotal();
  const todayEntries = getDayEntries(waterEntries);
  const percent = Math.min((todayTotal / goals.water) * 100, 100);

  const lastEntry = todayEntries.length > 0 ? todayEntries[todayEntries.length - 1] : null;

  const timeSinceLastGlass = useMemo(() => {
    if (!lastEntry) return null;
    const now = new Date();
    const [h, m] = lastEntry.time.split(":").map(Number);
    const entryTime = new Date();
    entryTime.setHours(h, m, 0, 0);
    const diffMs = now.getTime() - entryTime.getTime();
    const diffMin = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMin < 60) return `${diffMin}min atras`;
    return `${Math.floor(diffMin / 60)}h ${diffMin % 60}min atras`;
  }, [lastEntry]);

  const hydrationStatus = useMemo(() => {
    if (percent >= 100) return { text: "Perfeitamente hidratado", color: "text-emerald-400" };
    if (percent >= 75) return { text: "Bem hidratado", color: "text-cyan-300" };
    if (percent >= 50) return { text: "Quase la...", color: "text-amber-300" };
    return { text: "Desidratado", color: "text-red-400" };
  }, [percent]);

  const todayHistory = useMemo(() => {
    return todayEntries
      .sort((a, b) => b.time.localeCompare(a.time))
      .map(entry => ({
        id: entry.id,
        time: entry.time,
        amount: entry.amount,
      }));
  }, [todayEntries]);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const weekData = useMemo(() => {
    return weekDays.map((day) => {
      const dayEntries = waterEntries.filter((e) => e.date === day.dateStr);
      const total = dayEntries.reduce((s, e) => s + e.amount, 0);
      const cups = dayEntries.length;
      const pct = Math.min((total / goals.water) * 100, 100);
      return { ...day, total, cups, pct };
    });
  }, [weekDays, waterEntries, goals.water]);

  const handleDrink = async () => {
    if (isSaving || todayTotal >= 10000) return;
    setIsSaving(true);
    try {
      await addWaterEntry(goals.glassSize);
      toast.success(`+${goals.glassSize}ml de agua!`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAdd = async (amount: number) => {
    if (isSaving || todayTotal + amount > 10000) return;
    setIsSaving(true);
    try {
      await addWaterEntry(amount);
      toast.success(`+${amount}ml!`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveLast = async () => {
    if (isSaving || todayEntries.length === 0) return;
    setIsSaving(true);
    try {
      await removeLastWaterEntry();
      toast.info("Ultimo copo removido");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Droplets className="w-6 h-6" style={{ color: COLOR }} />
            <h2 className="text-2xl font-bold" style={{ color: COLOR }}>Ingestao de Agua</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Mantenha-se hidratado ao longo do dia</p>
        </div>

        {streaks.water > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-sm font-medium">
            <Flame className="w-4 h-4" />
            {streaks.water} dias de streak
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3 rounded-2xl border border-border/50 bg-card p-6">
          <div className="flex flex-col items-center">

            {/* CONFIGURACOES NO TOPO */}
            <div className="mb-5 w-full rounded-2xl border border-border/50 bg-secondary/15 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Ajustes de hidratacao
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
                      Meta {goals.water}ml
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-bold text-foreground">
                      Copo {goals.glassSize}ml
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`inline-flex items-center justify-center gap-2 self-start rounded-xl border px-4 py-2 text-sm font-bold transition-all sm:self-center ${
                    showSettings
                      ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-300"
                      : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  {showSettings ? "Fechar ajustes" : "Ajustar"}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.28 }}
                  className="mb-8 w-full overflow-hidden"
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                            Meta diaria
                          </p>
                          <p className="mt-2 text-2xl font-black text-foreground">
                            {goals.water}ml
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Ajuste em passos de 250ml.
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/70 p-1">
                          <button
                            onClick={() => setGoals({ water: Math.max(500, goals.water - 250) })}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="min-w-[96px] text-center font-mono text-lg font-bold text-foreground">
                            {goals.water}ml
                          </span>
                          <button
                            onClick={() => setGoals({ water: goals.water + 250 })}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Tamanho do copo
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3">
                        {GLASS_SIZES.map((s) => (
                          <button
                            key={s}
                            onClick={() => setGoals({ glassSize: s })}
                            className={`rounded-xl px-3 py-2 text-xs font-mono font-bold transition-all ${
                              goals.glassSize === s
                                ? "bg-cyan-500 text-black shadow-md"
                                : "border border-border/60 bg-background/60 text-muted-foreground hover:border-cyan-400/50 hover:text-foreground"
                            }`}
                          >
                            {s}ml
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Silhueta + Status */}
            <div className="relative">
              <HumanSilhouette percent={percent} size={260} />
              {percent >= 100 && (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1.25, opacity: 0.5 }} transition={{ duration: 1.8, repeat: Infinity, repeatType: "reverse" }} className="absolute inset-0 rounded-full border-8 border-emerald-400/60 pointer-events-none" />
              )}
            </div>

            <p className={`mt-3 text-sm font-medium ${hydrationStatus.color}`}>
              {hydrationStatus.text}
            </p>

            <div className={`flex items-center gap-6 font-mono ${percent >= 100 ? "mt-8" : "mt-6"}`}>
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: COLOR }}>{todayTotal}</p>
                <p className="text-xs text-muted-foreground">ml bebidos</p>
              </div>
              <div className="w-px h-10 bg-border/50" />
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{goals.water}</p>
                <p className="text-xs text-muted-foreground">ml meta</p>
              </div>
              <div className="w-px h-10 bg-border/50" />
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: COLOR }}>
                  {todayEntries.length}/{Math.ceil(goals.water / goals.glassSize)}
                </p>
                <p className="text-xs text-muted-foreground">copos</p>
              </div>
            </div>

            {timeSinceLastGlass && (
              <div className="flex items-center gap-2 mt-6 px-4 py-2 rounded-full bg-cyan-500/10 text-sm" style={{ color: COLOR }}>
                <Clock className="w-4 h-4" />
                Ultimo copo: {timeSinceLastGlass}
              </div>
            )}

            <div className="flex items-center gap-3 mt-8">
              <button onClick={handleRemoveLast} disabled={isSaving} className="p-3 rounded-xl border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50">
                <Minus className="w-5 h-5" />
              </button>

              <button onClick={handleDrink} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-medium text-background transition-all hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: COLOR }}>
                <Plus className="w-5 h-5" />
                Beber {goals.glassSize}ml
              </button>


            </div>

            {/* Historico */}
            <div className="w-full mt-8">
              <p className="text-xs font-medium text-muted-foreground mb-3">Hoje</p>
              {todayHistory.length > 0 ? (
                <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
                  {todayHistory.map((entry) => {
                    const fillPercent = Math.min((entry.amount / 500) * 100, 100);
                    return (
                      <div key={entry.id} className="flex-shrink-0 flex flex-col items-center snap-center">
                        <span className="text-xs font-mono text-muted-foreground mb-2">{entry.time}</span>
                        <div className="relative w-11 h-14">
                          <div className="absolute inset-0 border-2 border-cyan-200 rounded-3xl rounded-b-3xl overflow-hidden bg-white/10">
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-400 to-cyan-300 transition-all" style={{ height: `${fillPercent}%` }} />
                          </div>
                        </div>
                        <span className="text-xs font-medium text-cyan-300 mt-2">+{entry.amount}ml</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-secondary/20 rounded-3xl border border-dashed border-border/50">
                  <Droplet className="w-14 h-14 text-cyan-300/40 mb-4" />
                  <p className="text-sm text-muted-foreground">Nenhum copo registrado hoje</p>
                  <p className="text-xs text-muted-foreground mt-1">Beba o primeiro para comecar!</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/50 bg-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Adicionar por Volume</h3>
            <div className="flex flex-wrap gap-3 justify-center">
              {GLASS_SIZES.map((s) => (
                <button key={s} onClick={() => handleQuickAdd(s)} disabled={isSaving} className="flex flex-col items-center gap-1 group disabled:opacity-50">
                  <div className="relative w-12 h-16 rounded-lg border-2 border-border/50 overflow-hidden group-hover:border-cyan-400">
                    <div className="absolute bottom-0 left-0 right-0 transition-all" style={{ height: `${Math.min(s / 500, 1) * 100}%`, backgroundColor: COLOR }} />
                  </div>
                  <span className="text-xs font-mono">{s}ml</span>
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/50 bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4" style={{ color: COLOR }} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resumo da Semana</h3>
            </div>
            <div className="flex justify-between gap-1">
              {weekData.map((day) => {
                const barHeight = Math.max(4, (day.pct / 100) * 80);
                const isCompleted = day.pct >= 100;
                const barColor = isCompleted ? "#22c55e" : (day.isToday ? COLOR : "rgba(34,211,238,0.3)");

                return (
                  <div key={day.dateStr} className="flex flex-col items-center gap-1 flex-1">
                    <span className={`text-[10px] font-medium ${day.isToday || isCompleted ? "font-bold" : "text-muted-foreground"}`} style={{ color: isCompleted ? "#22c55e" : (day.isToday ? COLOR : "") }}>
                      {day.label}
                    </span>
                    <div className="w-full h-20 rounded-lg bg-secondary/30 relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 right-0 rounded-lg transition-all" style={{ height: `${barHeight}px`, backgroundColor: barColor }} />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{day.cups}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

