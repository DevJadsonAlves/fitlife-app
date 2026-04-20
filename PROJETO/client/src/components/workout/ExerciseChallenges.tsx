import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Flame, Target, Plus, X, Check, Zap } from "lucide-react";
import { useHabits } from "@/contexts/HabitsContext";
import { EXERCISE_LIBRARY } from "@/data/exerciseLibrary";
import { toast } from "sonner";

/* ─── Types ─── */
interface Challenge {
  id: string;
  exerciseName: string;
  goal: string;
  daysTarget: number;
  createdAt: string;
}

/* ─── LocalStorage helpers ─── */
function loadChallenges(): Challenge[] {
  try {
    return JSON.parse(localStorage.getItem("fitlife_challenges") || "[]");
  } catch {
    return [];
  }
}

function saveChallenges(list: Challenge[]) {
  localStorage.setItem("fitlife_challenges", JSON.stringify(list));
}

/* ─── Hook ─── */
function useChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>(loadChallenges);

  const add = (c: Omit<Challenge, "id" | "createdAt">) => {
    const next = [
      ...challenges,
      { ...c, id: Date.now().toString(), createdAt: new Date().toISOString().split("T")[0] },
    ];
    saveChallenges(next);
    setChallenges(next);
    toast.success("Desafio criado! 🎯");
  };

  const remove = (id: string) => {
    const next = challenges.filter((c) => c.id !== id);
    saveChallenges(next);
    setChallenges(next);
  };

  return { challenges, add, remove };
}

/* ─── Per-exercise streak util ─── */
export function useExerciseStreak(exerciseName: string) {
  const { workoutEntries } = useHabits();

  return useMemo(() => {
    const datesWithEx = new Set(
      workoutEntries
        .filter((w) => w.exercises.some((ex) => ex.name === exerciseName))
        .map((w) => w.date)
    );

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      if (datesWithEx.has(ds)) streak++;
      else if (i > 0) break;
    }

    return { streak, total: datesWithEx.size };
  }, [workoutEntries, exerciseName]);
}

/* ─── Compact streak badge (used inside exercise cards) ─── */
export function ExerciseStreakBadge({ exerciseName }: { exerciseName: string }) {
  const { streak, total } = useExerciseStreak(exerciseName);
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-2 mt-1.5">
      {streak > 0 && (
        <div className="flex items-center gap-1">
          <Flame className="w-3 h-3 text-orange-500" />
          <span className="text-[9px] font-bold text-orange-500">{streak} dias seguidos</span>
        </div>
      )}
      <span className="text-[9px] text-muted-foreground">{total} sessões</span>
    </div>
  );
}

/* ─── Challenge card ─── */
function ChallengeCard({
  challenge,
  onRemove,
}: {
  challenge: Challenge;
  onRemove: (id: string) => void;
}) {
  const { workoutEntries } = useHabits();
  const { streak } = useExerciseStreak(challenge.exerciseName);

  const progress = useMemo(() => {
    const start = new Date(challenge.createdAt);
    const daysPassed = Math.floor(
      (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const sessions = workoutEntries.filter(
      (w) =>
        w.date >= challenge.createdAt &&
        w.exercises.some((ex) => ex.name === challenge.exerciseName)
    ).length;
    const pct = Math.min((daysPassed / challenge.daysTarget) * 100, 100);
    return { daysPassed: Math.min(daysPassed, challenge.daysTarget), pct, sessions };
  }, [challenge, workoutEntries]);

  const done = progress.pct >= 100;

  return (
    <div
      className={`p-3 rounded-xl border transition-all group relative ${
        done ? "border-green-500/30 bg-green-500/5" : "border-border/50 bg-secondary/20"
      }`}
    >
      <button
        onClick={() => onRemove(challenge.id)}
        className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
      >
        <X className="w-3 h-3 text-muted-foreground" />
      </button>

      <div className="flex items-start gap-2 mb-2 pr-4">
        {done ? (
          <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
        ) : (
          <Zap className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold leading-snug">{challenge.goal}</p>
          <p className="text-[9px] text-muted-foreground">{challenge.exerciseName}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress.pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${done ? "bg-green-500" : "bg-orange-500"}`}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">
          {progress.daysPassed}/{challenge.daysTarget} dias · {progress.sessions} sessões
        </span>
        {streak > 0 && (
          <div className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-500" />
            <span className="text-[9px] font-bold text-orange-500">{streak}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export function ExerciseChallenges() {
  const { challenges, add, remove } = useChallenges();
  const [open, setOpen] = useState(false);
  const [exercise, setExercise] = useState("");
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState(30);

  const submit = () => {
    if (!exercise || !goal.trim()) return;
    add({ exerciseName: exercise, goal: goal.trim(), daysTarget: days });
    setOpen(false);
    setExercise("");
    setGoal("");
    setDays(30);
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Desafios Pessoais
          </h3>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-1.5 rounded-lg hover:bg-muted transition-all"
          title="Novo desafio"
        >
          <Plus className="w-4 h-4 text-orange-500" />
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5 p-3 rounded-xl bg-secondary/30 border border-border/50">
              <select
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-orange-500/50"
              >
                <option value="">Selecionar exercício…</option>
                {EXERCISE_LIBRARY.map((ex) => (
                  <option key={ex.id} value={ex.name}>
                    {ex.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Meta: ex. Aumentar 10kg no supino"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-orange-500/50"
              />

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-bold">Prazo:</span>
                {[7, 14, 30, 60, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                      days === d
                        ? "bg-orange-500 text-white border-orange-500"
                        : "border-border/50 hover:border-orange-500/40"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-border/50 text-xs font-bold hover:bg-muted transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={submit}
                  disabled={!exercise || !goal.trim()}
                  className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-all disabled:opacity-40"
                >
                  Criar desafio
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {challenges.length === 0 ? (
        <div className="text-center py-5 text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-1.5 opacity-25" />
          <p className="text-xs">Nenhum desafio ativo</p>
          <p className="text-[10px] mt-0.5 opacity-70">
            Crie um desafio para manter o foco!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {challenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} onRemove={remove} />
          ))}
        </div>
      )}
    </div>
  );
}
