import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Trophy, ArrowUp } from "lucide-react";
import { useHabits } from "@/contexts/HabitsContext";

interface ProgressiveOverloadProps {
  exerciseName: string;
  currentSets: number;
  currentReps: number;
  currentWeight: number;
}

export function ProgressiveOverload({
  exerciseName,
  currentSets,
  currentReps,
  currentWeight,
}: ProgressiveOverloadProps) {
  const { workoutEntries } = useHabits();

  const analysis = useMemo(() => {
    const history = workoutEntries
      .flatMap((w) =>
        w.exercises
          .filter((ex) => ex.name === exerciseName)
          .map((ex) => ({ ...ex, date: w.date }))
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    if (history.length === 0) return null;

    const maxWeight = Math.max(...history.map((h) => h.weight));
    const maxVolume = Math.max(...history.map((h) => h.sets * h.reps * h.weight));
    const lastEntry = history[history.length - 1];

    const currentVolume = currentSets * currentReps * currentWeight;

    // Suggest +2.5kg rounded to nearest 0.25
    const suggestedWeight =
      currentWeight > 0 ? Math.round((currentWeight + 2.5) * 4) / 4 : null;
    const suggestedReps = currentReps + 1;

    const isWeightPR = currentWeight > 0 && currentWeight > maxWeight;
    const isVolumePR = currentVolume > 0 && currentVolume > maxVolume;

    return {
      maxWeight,
      lastEntry,
      suggestedWeight,
      suggestedReps,
      isWeightPR,
      isVolumePR,
    };
  }, [workoutEntries, exerciseName, currentSets, currentReps, currentWeight]);

  if (!analysis) return null;

  const { isWeightPR, isVolumePR, suggestedWeight, suggestedReps, maxWeight, lastEntry } =
    analysis;

  return (
    <div className="mt-3 space-y-2">
      {/* PR badge */}
      <AnimatePresence>
        {(isWeightPR || isVolumePR) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/40"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
            <p className="text-[10px] font-bold text-yellow-500">
              {isWeightPR ? "🏆 Novo recorde de carga!" : "🏅 Novo recorde de volume!"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestion pills */}
      <div className="flex gap-1.5 flex-wrap">
        {suggestedWeight !== null && currentWeight > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/8 border border-orange-500/20">
            <TrendingUp className="w-3 h-3 text-orange-500" />
            <span className="text-[9px] text-orange-500 font-bold">
              Próx. carga: {suggestedWeight}kg
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/8 border border-blue-500/20">
          <ArrowUp className="w-3 h-3 text-blue-400" />
          <span className="text-[9px] text-blue-400 font-bold">
            Próx. reps: {suggestedReps}
          </span>
        </div>

        {maxWeight > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/8 border border-purple-500/20">
            <Trophy className="w-3 h-3 text-purple-400" />
            <span className="text-[9px] text-purple-400 font-bold">PR: {maxWeight}kg</span>
          </div>
        )}
      </div>

      {/* Last session */}
      {lastEntry && (
        <p className="text-[9px] text-muted-foreground pl-0.5">
          Última sessão: {lastEntry.sets}x{lastEntry.reps} com {lastEntry.weight}kg
        </p>
      )}
    </div>
  );
}
