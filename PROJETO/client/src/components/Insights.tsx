import { useMemo } from "react";
import { useHabits } from "@/contexts/HabitsContext";
import { motion } from "framer-motion";
import { Lightbulb, TrendingUp, AlertCircle, CheckCircle2, type LucideIcon } from "lucide-react";

type Insight = {
  title: string;
  text: string;
  icon: LucideIcon;
  color: string;
  bg: string;
};

export default function Insights() {
  const { waterEntries, workoutEntries, sleepEntries, goals, weightEntries } = useHabits();

  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];
    const today = new Date().toISOString().split("T")[0];

    const hasWorkoutToday = workoutEntries.some((entry) => entry.date === today);
    const waterToday = waterEntries
      .filter((entry) => entry.date === today)
      .reduce((sum, entry) => sum + entry.amount, 0);

    if (hasWorkoutToday && waterToday < goals.water) {
      list.push({
        title: "Hidratação e Treino",
        text: "Você treinou hoje! Lembre-se de beber mais água para repor os líquidos perdidos.",
        icon: AlertCircle,
        color: "text-amber-400",
        bg: "bg-amber-400/10",
      });
    }

    const lastSleep = sleepEntries.length > 0 ? sleepEntries[sleepEntries.length - 1] : null;
    if (lastSleep && lastSleep.duration < goals.sleepHours) {
      list.push({
        title: "Qualidade do Sono",
        text: `Você dormiu ${lastSleep.duration}h, menos que sua meta de ${goals.sleepHours}h. Isso pode afetar sua recuperação muscular.`,
        icon: Lightbulb,
        color: "text-indigo-400",
        bg: "bg-indigo-400/10",
      });
    }

    if (weightEntries.length >= 2) {
      const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const diff = last.weight - first.weight;
      const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24);

      if (days > 0) {
        const ratePerDay = diff / days;
        const remaining = goals.weightGoal - last.weight;

        if ((remaining > 0 && ratePerDay > 0) || (remaining < 0 && ratePerDay < 0)) {
          const daysToGoal = Math.abs(Math.round(remaining / ratePerDay));
          list.push({
            title: "Previsão de Meta",
            text: `No seu ritmo atual, você atingirá sua meta de ${goals.weightGoal}kg em aproximadamente ${daysToGoal} dias.`,
            icon: TrendingUp,
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
          });
        }
      }
    }

    const workoutDays = new Set(workoutEntries.map((entry) => entry.date)).size;
    if (workoutDays >= 3) {
      list.push({
        title: "Ótima Consistência!",
        text: `Você já registrou treinos em ${workoutDays} dias diferentes. Continue assim!`,
        icon: CheckCircle2,
        color: "text-lime-400",
        bg: "bg-lime-400/10",
      });
    }

    return list;
  }, [waterEntries, workoutEntries, sleepEntries, goals, weightEntries]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.42 }}
      className="fitlife-card p-5"
    >
      <div className="mb-3.5 flex items-center gap-1.5">
        <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
        <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
          Insights Inteligentes
        </h3>
      </div>

      {insights.length > 0 && (
        <div className="flex flex-col gap-2">
          {insights.map((insight, index) => {
            const Icon = insight.icon;

            return (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.08 }}
                className="flex items-start gap-3 rounded-[10px] border border-border bg-white/[0.03] p-[10px_14px]"
              >
                <div className={`rounded-lg p-1.5 ${insight.bg}`}>
                  <Icon className={`h-4 w-4 ${insight.color}`} />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold">{insight.title}</h4>
                  <p className="text-xs leading-relaxed text-muted-foreground">{insight.text}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
