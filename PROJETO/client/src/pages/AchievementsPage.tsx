/**
 * AchievementsPage — Conquistas
 * Ref: Progresso total, categorias (Água, Treino, Alimentação, Sono, Peso, Geral) com contadores,
 * badges com lock/unlock, critérios visíveis
 */
import { useHabits } from "@/contexts/HabitsContext";
import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Lock, Star, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_COLORS: Record<string, string> = {
  water: "#22d3ee",
  workout: "#f97316",
  food: "#84cc16",
  sleep: "#818cf8",
  weight: "#f97316",
  general: "#eab308",
  custom: "#22c55e",
};

const CATEGORY_LABELS: Record<string, string> = {
  water: "Água",
  workout: "Treino",
  food: "Alimentação",
  sleep: "Sono",
  weight: "Peso",
  general: "Geral",
  custom: "Hábitos",
};

const CATEGORY_ORDER = ["water", "workout", "food", "sleep", "weight", "general", "custom"];

export default function AchievementsPage() {
  const { achievements, resetAchievements } = useHabits();
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (window.confirm("Tem certeza que deseja resetar todas as suas conquistas? Esta ação não pode ser desfeita.")) {
      setIsResetting(true);
      try {
        await resetAchievements();
        toast.success("Conquistas resetadas com sucesso!");
      } catch (error) {
        console.error("Erro ao resetar conquistas:", error);
        toast.error("Não foi possível resetar as conquistas. Tente novamente.");
      } finally {
        setIsResetting(false);
      }
    }
  };

  const unlocked = achievements.filter((a) => a.unlocked);
  const totalPct = achievements.length > 0 ? Math.round((unlocked.length / achievements.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-bold text-amber-400">Conquistas</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Desbloqueie badges mantendo seus hábitos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-red-400 hover:bg-red-400/10 border border-border/50 transition-all disabled:cursor-not-allowed disabled:opacity-50"
            title="Resetar Conquistas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isResetting ? "Resetando..." : "Resetar"}
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/30 border border-border/50">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="font-mono font-bold text-amber-400">{unlocked.length}/{achievements.length}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/50 bg-card p-5"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progresso Total</span>
          <span className="text-sm font-mono text-amber-400">{totalPct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-secondary/50 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #f97316, #eab308)" }}
            initial={{ width: 0 }}
            animate={{ width: `${totalPct}%` }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      </motion.div>

      {/* Categories */}
      {CATEGORY_ORDER.map((cat) => {
        const catAchievements = achievements.filter((a) => a.category === cat);
        if (catAchievements.length === 0) return null;
        const color = CATEGORY_COLORS[cat];
        const catUnlocked = catAchievements.filter((a) => a.unlocked).length;

        return (
          <motion.div
            key={cat}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm" style={{ color }}>{CATEGORY_LABELS[cat]}</h3>
              <span className="text-xs text-muted-foreground font-mono">{catUnlocked}/{catAchievements.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catAchievements.map((achievement, i) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className={`rounded-xl border p-4 transition-all duration-300 ${
                    achievement.unlocked
                      ? "border-border/50 bg-card hover:border-border"
                      : "border-border/20 bg-card/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                      style={{
                        backgroundColor: achievement.unlocked ? `${color}15` : "rgba(255,255,255,0.03)",
                      }}
                    >
                      {achievement.unlocked ? (
                        achievement.icon
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{achievement.requirement}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
