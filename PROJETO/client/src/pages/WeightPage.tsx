/**
 * WeightPage — Peso Corporal
 * Ref: Cards Atual/Variação/Meta/Falta, peso meta ajustável com +/-, formulário com peso/gordura/obs,
 * gráfico de evolução com filtros 7D/30D/90D/Tudo, histórico
 */
import { useState, useMemo, useEffect } from "react";
import { useHabits } from "@/contexts/HabitsContext";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Plus, Minus, Trash2, TrendingUp, TrendingDown, Target, ArrowRight, BarChart3, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";

const COLOR = "#f97316";

export default function WeightPage() {
  const { weightEntries, addWeightEntry, removeWeightEntry, goals, setGoals } = useHabits();

  const [showForm, setShowForm] = useState(false);
  const [weightVal, setWeightVal] = useState("");

  // Update weightVal when goals.weightGoal changes (e.g. after profile save)
  useEffect(() => {
    if (!weightVal) {
      setWeightVal(goals.weightGoal.toString());
    }
  }, [goals.weightGoal]);
  const [bodyFat, setBodyFat] = useState("");
  const [weightNotes, setWeightNotes] = useState("");
  const [chartRange, setChartRange] = useState<"7" | "30" | "90" | "all">("30");

  const sortedEntries = useMemo(() => {
    return [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  }, [weightEntries]);

  const latest = sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1] : null;
  const previous = sortedEntries.length > 1 ? sortedEntries[sortedEntries.length - 2] : null;
  const variation = latest && previous ? parseFloat((latest.weight - previous.weight).toFixed(1)) : null;
  const distanceToGoal = latest ? parseFloat((latest.weight - goals.weightGoal).toFixed(1)) : null;

  const chartData = useMemo(() => {
    let filtered = sortedEntries;
    if (chartRange !== "all") {
      const days = parseInt(chartRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split("T")[0];
      filtered = sortedEntries.filter((e) => e.date >= cutoffStr);
    }
    return filtered.map((e) => ({
      date: e.date.slice(5),
      peso: e.weight,
    }));
  }, [sortedEntries, chartRange]);

  const handleSave = () => {
    const w = parseFloat(weightVal);
    if (!w || w < 20 || w > 500) {
      toast.error("Peso inválido");
      return;
    }
    const bf = bodyFat ? parseFloat(bodyFat) : undefined;
    addWeightEntry(w, bf, weightNotes || undefined);
    toast.success("Peso registrado!");
    setShowForm(false);
    setWeightVal(w.toString());
    setBodyFat("");
    setWeightNotes("");
  };

  const handleCancel = () => {
    setShowForm(false);
    setBodyFat("");
    setWeightNotes("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6" style={{ color: COLOR }} />
            <h2 className="text-2xl font-bold" style={{ color: COLOR }}>Peso Corporal</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe sua evolução</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-background transition-all hover:opacity-90"
            style={{ backgroundColor: COLOR }}
          >
            <Plus className="w-4 h-4" />
            Registrar
          </button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-4 h-4" style={{ color: COLOR }} />
            <span className="text-xs text-muted-foreground">Atual</span>
          </div>
          <p className="text-2xl font-mono font-bold">{latest ? `${latest.weight}kg` : "—"}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            {variation !== null && variation < 0 ? (
              <TrendingDown className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingUp className="w-4 h-4" style={{ color: COLOR }} />
            )}
            <span className="text-xs text-muted-foreground">Variação</span>
          </div>
          <p className="text-2xl font-mono font-bold" style={{ color: variation !== null ? (variation < 0 ? "#4ade80" : COLOR) : undefined }}>
            {variation !== null ? `${variation > 0 ? "+" : ""}${variation}kg` : "—"}
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-green-400" />
            <span className="text-xs text-muted-foreground">Meta</span>
          </div>
          <p className="text-2xl font-mono font-bold">{goals.weightGoal}kg</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="w-4 h-4" style={{ color: COLOR }} />
            <span className="text-xs text-muted-foreground">Falta</span>
          </div>
          <p className="text-2xl font-mono font-bold" style={{ color: COLOR }}>
            {distanceToGoal !== null ? `${Math.abs(distanceToGoal)}kg` : "—"}
          </p>
        </motion.div>
      </div>

      {/* Weight goal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/50 bg-card p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Peso meta:</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setGoals({ weightGoal: Math.max(30, goals.weightGoal - 1) })}
              className="p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-mono text-lg font-bold min-w-[60px] text-center">{goals.weightGoal}kg</span>
            <button
              onClick={() => setGoals({ weightGoal: goals.weightGoal + 1 })}
              className="p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* New record form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-border/50 bg-card p-5 space-y-4"
          >
            <h3 className="font-bold" style={{ color: COLOR }}>Novo Registro</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground mb-1 block">Peso (kg) *</span>
                <input
                  type="number"
                  step="0.1"
                  value={weightVal}
                  onChange={(e) => setWeightVal(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl bg-secondary/50 border border-border/50 text-center font-mono text-sm focus:border-orange-500/50 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-xs text-muted-foreground mb-1 block">Gordura corporal (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  placeholder="Opcional"
                  className="w-full px-3 py-3 rounded-xl bg-secondary/50 border border-border/50 text-center font-mono text-sm focus:border-orange-500/50 focus:outline-none"
                />
              </div>
            </div>

            <textarea
              value={weightNotes}
              onChange={(e) => setWeightNotes(e.target.value)}
              placeholder="Observações (opcional)"
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-sm focus:border-orange-500/50 focus:outline-none transition-colors resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm text-background transition-all hover:opacity-90"
                style={{ backgroundColor: COLOR }}
              >
                Salvar
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-3 rounded-xl border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/50 bg-card p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: COLOR }} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gráfico de Evolução</h3>
          </div>
          <div className="flex gap-1">
            {(["7", "30", "90", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setChartRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  chartRange === r
                    ? "text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={chartRange === r ? { backgroundColor: COLOR } : {}}
              >
                {r === "all" ? "Tudo" : `${r}D`}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground font-medium">Nenhum dado para exibir</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Registre seu peso para ver o gráfico de evolução</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Line type="monotone" dataKey="peso" stroke={COLOR} strokeWidth={2} dot={{ fill: COLOR, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* History */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border/50 bg-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Histórico</h3>
        </div>
        {sortedEntries.length === 0 ? (
          <div className="text-center py-12">
            <Scale className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground font-medium">Nenhum registro ainda.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Clique em "+ Registrar" para começar</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {[...sortedEntries].reverse().map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Scale className="w-4 h-4" style={{ color: COLOR }} />
                  <div>
                    <p className="text-sm font-medium font-mono">{entry.weight}kg {entry.bodyFat ? `· ${entry.bodyFat}% gordura` : ""}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{entry.date}</span>
                      {entry.notes && <span>· {entry.notes}</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    removeWeightEntry(entry.id);
                    toast.info("Registro removido");
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
