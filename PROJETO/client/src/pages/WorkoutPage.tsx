import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell, Plus, Trash2, Clock, TrendingUp, Check, Minus,
  Flame, Target, BookOpen, Zap, FileDown, Mic, Map as MapIcon, Camera, Trophy,
  type LucideIcon,
} from "lucide-react";
import { RestTimer } from "@/components/workout/RestTimer";
import { ExerciseLibrary } from "@/components/workout/ExerciseLibrary";
import { LoadChart } from "@/components/workout/LoadChart";
import { VoiceLogger } from "@/components/workout/VoiceLogger";
import { ProgressiveOverload } from "@/components/workout/ProgressiveOverload";
import { MuscleMap } from "@/components/workout/MuscleMap";
import { ExerciseChallenges, ExerciseStreakBadge } from "@/components/workout/ExerciseChallenges";
import { FormCheck } from "@/components/workout/FormCheck";
import { useWorkout } from "@/hooks/workout/useWorkout";
import { EXERCISE_LIBRARY, type LibraryExercise } from "@/data/exerciseLibrary";
import { type ExerciseSet, type WorkoutEntry } from "@/contexts/HabitsContext";

const COLOR = "#f97316";

type WorkoutPlanDay = {
  id: string;
  shortLabel: string;
  title: string;
  focus: string;
  exercises: string[];
};

type CompletedExerciseMap = Record<string, boolean>;
type ExerciseAliasMap = Record<string, string[]>;

type ExerciseRecord = {
  name: string;
  muscleGroup: string;
  maxWeight: number;
  bestVolume: number;
  sessions: number;
  lastDate: string;
};

type WorkoutLevelProgress = {
  level: number;
  xp: number;
  xpGoal: number;
  percent: number;
};

const EXERCISE_NAME_ALIASES: ExerciseAliasMap = {
  "Supino reto": ["Supino reto", "Barbell Bench Press", "Bench Press"],
  "Supino inclinado": ["Supino inclinado", "Incline Bench Press", "Incline Dumbbell Press"],
  "Tríceps pulley": ["Tríceps pulley", "Triceps Pushdown", "Cable Pushdown"],
  "Crucifixo": ["Crucifixo", "Chest Fly", "Dumbbell Fly"],
  "Puxada frente": ["Puxada frente", "Lat Pulldown", "Pulldown"],
  "Remada curvada": ["Remada curvada", "Barbell Row", "Bent Over Row"],
  "Rosca direta": ["Rosca direta", "Barbell Curl", "Biceps Curl"],
  "Rosca martelo": ["Rosca martelo", "Hammer Curl"],
  "Agachamento": ["Agachamento", "Squat", "Back Squat"],
  "Leg press": ["Leg press", "Leg Press"],
  "Cadeira extensora": ["Cadeira extensora", "Leg Extension"],
  "Panturrilha": ["Panturrilha", "Calf Raise", "Standing Calf Raise"],
  "Desenvolvimento": ["Desenvolvimento", "Shoulder Press", "Overhead Press"],
  "Elevação lateral": ["Elevação lateral", "Lateral Raise"],
  "Prancha": ["Prancha", "Plank"],
  "Abdominal": ["Abdominal", "Crunch", "Sit Up"],
  "Levantamento terra": ["Levantamento terra", "Deadlift"],
  "Remada": ["Remada", "Seated Row", "Row"],
  "Agachamento goblet": ["Agachamento goblet", "Goblet Squat"],
  "Caminhada": ["Caminhada", "Walking", "Treadmill Walking"],
  "Bike": ["Bike", "Cycling", "Stationary Bike"],
  "Alongamento dinâmico": ["Alongamento dinâmico", "Dynamic Stretching"],
  "Mobilidade": ["Mobilidade", "Mobility"],
};

const WEEKLY_WORKOUT_PLAN: WorkoutPlanDay[] = [
  {
    id: "1",
    shortLabel: "Seg",
    title: "Peito e Tríceps",
    focus: "Força superior",
    exercises: ["Supino reto", "Supino inclinado", "Tríceps pulley", "Crucifixo"],
  },
  {
    id: "2",
    shortLabel: "Ter",
    title: "Costas e Bíceps",
    focus: "Puxadas e remadas",
    exercises: ["Puxada frente", "Remada curvada", "Rosca direta", "Rosca martelo"],
  },
  {
    id: "3",
    shortLabel: "Qua",
    title: "Pernas",
    focus: "Quadríceps e glúteos",
    exercises: ["Agachamento", "Leg press", "Cadeira extensora", "Panturrilha"],
  },
  {
    id: "4",
    shortLabel: "Qui",
    title: "Ombros e Core",
    focus: "Estabilidade",
    exercises: ["Desenvolvimento", "Elevação lateral", "Prancha", "Abdominal"],
  },
  {
    id: "5",
    shortLabel: "Sex",
    title: "Full Body",
    focus: "Volume geral",
    exercises: ["Levantamento terra", "Supino", "Remada", "Agachamento goblet"],
  },
  {
    id: "6",
    shortLabel: "Sáb",
    title: "Cardio e Mobilidade",
    focus: "Recuperação ativa",
    exercises: ["Caminhada", "Bike", "Alongamento dinâmico", "Mobilidade"],
  },
  {
    id: "7",
    shortLabel: "Dom",
    title: "Descanso",
    focus: "Recuperação",
    exercises: ["Hidratação", "Sono", "Alongamento leve"],
  },
];

function getWeekDays(currentDate: Date) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dayOfWeek = currentDate.getDay();
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() - ((dayOfWeek + 6) % 7));
  const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    return { label: labels[i], dateStr, isToday: dateStr === todayStr };
  });
}

function getExerciseVolume(exercise: ExerciseSet): number {
  return exercise.sets * exercise.reps * exercise.weight;
}

function getWorkoutVolume(workout: WorkoutEntry): number {
  return workout.exercises.reduce((sum, exercise) => sum + getExerciseVolume(exercise), 0);
}

function getWeekStart(date: Date): Date {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  return weekStart;
}

function isWorkoutInWeek(workout: WorkoutEntry, currentDate: Date): boolean {
  const workoutDate = new Date(`${workout.date}T00:00:00`);
  const weekStart = getWeekStart(currentDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return workoutDate >= weekStart && workoutDate < weekEnd;
}

function formatVolume(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k kg`;
  return `${Math.round(value)} kg`;
}

function getWorkoutXp(workouts: WorkoutEntry[]): number {
  return workouts.reduce((sum, workout) => {
    const volume = getWorkoutVolume(workout);
    const exerciseXp = workout.exercises.length * 8;
    const minuteXp = Math.min(50, Math.floor(workout.duration / 5) * 3);
    const volumeXp = Math.min(80, Math.floor(volume / 250));

    return sum + 35 + exerciseXp + minuteXp + volumeXp;
  }, 0);
}

function getWorkoutLevelProgress(totalXp: number): WorkoutLevelProgress {
  let level = 1;
  let xp = Math.max(0, totalXp);
  let xpGoal = 100;

  while (xp >= xpGoal) {
    xp -= xpGoal;
    level += 1;
    xpGoal += 100;
  }

  return {
    level,
    xp,
    xpGoal,
    percent: Math.min(100, Math.round((xp / xpGoal) * 100)),
  };
}

function getExerciseRecords(workouts: WorkoutEntry[]): ExerciseRecord[] {
  const records = new Map<string, ExerciseRecord>();

  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const volume = getExerciseVolume(exercise);
      const current = records.get(exercise.name);

      if (!current) {
        records.set(exercise.name, {
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          maxWeight: exercise.weight,
          bestVolume: volume,
          sessions: 1,
          lastDate: workout.date,
        });
        return;
      }

      records.set(exercise.name, {
        ...current,
        maxWeight: Math.max(current.maxWeight, exercise.weight),
        bestVolume: Math.max(current.bestVolume, volume),
        sessions: current.sessions + 1,
        lastDate: workout.date > current.lastDate ? workout.date : current.lastDate,
      });
    });
  });

  return Array.from(records.values()).sort((a, b) => {
    const volumeDiff = b.bestVolume - a.bestVolume;
    if (volumeDiff !== 0) return volumeDiff;
    return b.maxWeight - a.maxWeight;
  });
}

type WorkoutMetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

function WorkoutMetricCard({ label, value, detail, icon: Icon }: WorkoutMetricCardProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-orange-500" />
      </div>
      <p className="text-xl font-black text-orange-500">{value}</p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

export default function WorkoutPage() {
  const {
    workoutEntries,
    todayWorkouts,
    currentExercises,
    duration,
    setDuration,
    showLibrary,
    setShowLibrary,
    addExerciseFromLibrary,
    updateExercise,
    removeExercise,
    handleSaveWorkout,
    removeWorkoutEntry,
    currentDate,
  } = useWorkout();

  const [showVoice, setShowVoice] = useState(false);
  const [showMuscleMap, setShowMuscleMap] = useState(false);
  const [formCheckEx, setFormCheckEx] = useState<string | null>(null);
  const [expandedGif, setExpandedGif] = useState<{ name: string; gifUrl: string } | null>(null);
  const [selectedPlanDay, setSelectedPlanDay] = useState<number>(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [completedExercises, setCompletedExercises] = useState<CompletedExerciseMap>({});
  const [durationInput, setDurationInput] = useState(String(duration));
  const [exerciseDrafts, setExerciseDrafts] = useState<
    Record<string, { reps?: string; weight?: string }>
  >({});

  useEffect(() => {
    setDurationInput(String(duration));
  }, [duration]);

  useEffect(() => {
    setExerciseDrafts((prev) => {
      const validIds = new Set(currentExercises.map((exercise) => exercise.id));
      let changed = false;
      const next = Object.entries(prev).reduce<
        Record<string, { reps?: string; weight?: string }>
      >((acc, [exerciseId, draft]) => {
        if (validIds.has(exerciseId)) {
          acc[exerciseId] = draft;
        } else {
          changed = true;
        }
        return acc;
      }, {});
      return changed ? next : prev;
    });
  }, [currentExercises]);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const selectedWorkoutPlan = WEEKLY_WORKOUT_PLAN[selectedPlanDay];

  const completedCount = useMemo(
    () => currentExercises.filter((ex) => completedExercises[ex.id]).length,
    [currentExercises, completedExercises]
  );

  const completionProgress = useMemo(() => {
    if (currentExercises.length === 0) return 0;
    return Math.round((completedCount / currentExercises.length) * 100);
  }, [completedCount, currentExercises.length]);

  const workoutProgress = useMemo(
    () => getWorkoutLevelProgress(getWorkoutXp(workoutEntries)),
    [workoutEntries]
  );

  const workoutsThisWeek = useMemo(
    () => workoutEntries.filter((workout) => isWorkoutInWeek(workout, currentDate)),
    [workoutEntries, currentDate]
  );

  const weeklyVolume = useMemo(
    () => workoutsThisWeek.reduce((sum, workout) => sum + getWorkoutVolume(workout), 0),
    [workoutsThisWeek]
  );

  const weeklyMinutes = useMemo(
    () => workoutsThisWeek.reduce((sum, workout) => sum + workout.duration, 0),
    [workoutsThisWeek]
  );

  const weeklyExerciseCount = useMemo(
    () => workoutsThisWeek.reduce((sum, workout) => sum + workout.exercises.length, 0),
    [workoutsThisWeek]
  );

  const weeklyTrainingDays = useMemo(
    () => new Set(workoutsThisWeek.map((workout) => workout.date)).size,
    [workoutsThisWeek]
  );

  const currentWorkoutVolume = useMemo(
    () => currentExercises.reduce((sum, exercise) => sum + getExerciseVolume(exercise), 0),
    [currentExercises]
  );

  const exerciseRecords = useMemo(() => getExerciseRecords(workoutEntries).slice(0, 5), [workoutEntries]);
  const latestWorkout = useMemo(
    () => [...workoutEntries].sort((a, b) => b.date.localeCompare(a.date) || (b.created_at || "").localeCompare(a.created_at || ""))[0],
    [workoutEntries]
  );

  const markExerciseDone = useCallback((exerciseId: string) => {
    setCompletedExercises((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  }, []);

  const setExerciseDraftValue = useCallback(
    (exerciseId: string, field: "reps" | "weight", value: string) => {
      setExerciseDrafts((prev) => ({
        ...prev,
        [exerciseId]: {
          ...(prev[exerciseId] || {}),
          [field]: value,
        },
      }));
    },
    []
  );

  const clearExerciseDraftValue = useCallback(
    (exerciseId: string, field: "reps" | "weight") => {
      setExerciseDrafts((prev) => {
        const current = prev[exerciseId];
        if (!current || current[field] === undefined) return prev;

        const nextEntry = { ...current };
        delete nextEntry[field];

        if (Object.keys(nextEntry).length === 0) {
          const { [exerciseId]: _removed, ...rest } = prev;
          return rest;
        }

        return {
          ...prev,
          [exerciseId]: nextEntry,
        };
      });
    },
    []
  );

  const normalizeExerciseName = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const loadPlanIntoWorkout = useCallback(() => {
    const normalizedCurrentNames = new Set(
      currentExercises.map((exercise) => normalizeExerciseName(exercise.name))
    );

    let addedCount = 0;

    selectedWorkoutPlan.exercises.forEach((exerciseName) => {
      const candidateNames = EXERCISE_NAME_ALIASES[exerciseName] ?? [exerciseName];
      const libraryExercise = EXERCISE_LIBRARY.find((exercise) =>
        candidateNames.some(
          (candidate) => normalizeExerciseName(candidate) === normalizeExerciseName(exercise.name)
        )
      );

      if (!libraryExercise) return;

      const normalizedName = normalizeExerciseName(libraryExercise.name);
      if (normalizedCurrentNames.has(normalizedName)) return;

      addExerciseFromLibrary(libraryExercise);
      normalizedCurrentNames.add(normalizedName);
      addedCount += 1;
    });

    if (addedCount === 0) {
      window.alert("Nenhum exercício da ficha foi encontrado na biblioteca ou todos já foram adicionados.");
    }
  }, [addExerciseFromLibrary, currentExercises, selectedWorkoutPlan]);

  const handleVoiceDetected = useCallback(
    (parsed: { name: string; sets: number; reps: number; weight: number; muscleGroup: string }) => {
      const libEx = EXERCISE_LIBRARY.find((e) => e.name === parsed.name);
      if (!libEx) return;
      addExerciseFromLibrary({ ...libEx, suggestedSets: parsed.sets });
      setTimeout(() => {}, 50);
    },
    [addExerciseFromLibrary]
  );

  const handleMuscleSelect = useCallback(
    (ex: LibraryExercise) => addExerciseFromLibrary(ex),
    [addExerciseFromLibrary]
  );

  const exportToPDF = (workoutToExport?: WorkoutEntry) => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    const dateStr = workoutToExport
      ? new Date(workoutToExport.date).toLocaleDateString("pt-BR")
      : currentDate.toLocaleDateString("pt-BR");
    const exs: ExerciseSet[] = workoutToExport ? workoutToExport.exercises : currentExercises;
    const dur = workoutToExport ? workoutToExport.duration : duration;

    pw.document.write(`<!DOCTYPE html><html><head><title>Treino</title>
    <style>
      body{font-family:sans-serif;padding:40px;color:#111}
      h1{color:#f97316;border-bottom:3px solid #f97316;padding-bottom:10px}
      .meta{display:flex;gap:40px;background:#f8f9fa;padding:15px;border-radius:8px;margin:20px 0}
      .mi label{font-size:10px;text-transform:uppercase;color:#999;font-weight:700}
      .mi p{font-size:16px;font-weight:700;margin:2px 0}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .card{border:1px solid #eee;border-radius:10px;padding:16px}
      .card h3{color:#f97316;margin:0 0 10px}
      .stats{display:flex;gap:8px}
      .s{flex:1;text-align:center}
      .sl{font-size:9px;text-transform:uppercase;color:#aaa}
      .sv{font-size:14px;font-weight:700}
    </style></head><body>
    <h1>FitLife v4 Cloud — Ficha de Treino</h1>
    <div class="meta">
      <div class="mi"><label>Data</label><p>${dateStr}</p></div>
      <div class="mi"><label>Duração</label><p>${dur} min</p></div>
      <div class="mi"><label>Exercícios</label><p>${exs.length}</p></div>
    </div>
    <div class="grid">
      ${exs.map((e) => `<div class="card"><h3>${e.name}</h3>
        <div class="stats">
          <div class="s"><div class="sl">Séries</div><div class="sv">${e.sets}</div></div>
          <div class="s"><div class="sl">Reps</div><div class="sv">${e.reps}</div></div>
          <div class="s"><div class="sl">Carga</div><div class="sv">${e.weight}kg</div></div>
        </div></div>`).join("")}
    </div>
    <p style="margin-top:40px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px">
      Gerado em ${new Date().toLocaleString("pt-BR")} • FitLife v4 Cloud</p>
    <script>window.print();</script></body></html>`);
    pw.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500/10">
            <Dumbbell className="w-5 h-5" style={{ color: COLOR }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: COLOR }}>Treinos</h2>
            <p className="text-sm text-muted-foreground">Registre sua atividade física</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowVoice(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 text-orange-500 text-sm font-bold transition-all"
            title="Logging por Voz"
          >
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Voz</span>
          </button>
          <button
            onClick={() => setShowMuscleMap(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm font-bold transition-all"
            title="Mapa de Músculos"
          >
            <MapIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Músculos</span>
          </button>
          {currentExercises.length > 0 && (
            <button
              onClick={() => exportToPDF()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm font-bold transition-all"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          )}
          <button
            onClick={() => setShowLibrary(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
          >
            <BookOpen className="w-4 h-4" />
            Biblioteca
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <button
            key={day.dateStr}
            onClick={() => setSelectedPlanDay(weekDays.findIndex((item) => item.dateStr === day.dateStr))}
            className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
              day.isToday
                ? "border-orange-500/50 bg-orange-500/5"
                : "border-border/50 bg-card"
            } ${selectedWorkoutPlan.shortLabel === day.label ? "ring-2 ring-orange-500/30" : ""}`}
          >
            <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
              {day.label}
            </span>
            <span className={`text-sm font-bold ${day.isToday ? "text-orange-500" : ""}`}>
              {day.dateStr.split("-")[2]}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-background p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-orange-500">
              Ficha semanal
            </p>
            <h3 className="text-lg font-bold mt-1">{selectedWorkoutPlan.shortLabel} · {selectedWorkoutPlan.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{selectedWorkoutPlan.focus}</p>
          </div>
          <button
            onClick={loadPlanIntoWorkout}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
          >
            Carregar treino do dia
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
          {selectedWorkoutPlan.exercises.map((exercise) => (
            <div
              key={exercise}
              className="rounded-xl border border-border/50 bg-card/80 p-3 shadow-sm"
            >
              <p className="text-sm font-semibold text-foreground">{exercise}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Exercício sugerido para este dia</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <WorkoutMetricCard
          label="Treinos na semana"
          value={String(workoutsThisWeek.length)}
          detail={`${weeklyTrainingDays} dia${weeklyTrainingDays === 1 ? "" : "s"} ativo${weeklyTrainingDays === 1 ? "" : "s"}`}
          icon={Dumbbell}
        />
        <WorkoutMetricCard
          label="Volume semanal"
          value={formatVolume(weeklyVolume)}
          detail={`${weeklyExerciseCount} exercícios registrados`}
          icon={TrendingUp}
        />
        <WorkoutMetricCard
          label="Minutos semanais"
          value={`${weeklyMinutes}m`}
          detail={weeklyMinutes >= 150 ? "Meta saudável batida" : "Rumo aos 150m"}
          icon={Clock}
        />
        <WorkoutMetricCard
          label="Último treino"
          value={latestWorkout ? new Date(`${latestWorkout.date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "-"}
          detail={latestWorkout ? `${latestWorkout.exercises.length} exercícios` : "Sem histórico ainda"}
          icon={Trophy}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm"
          >
            <div className="p-5 border-b border-border/50 flex items-center justify-between bg-secondary/20">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" />
                <h3 className="font-bold">Novo Treino</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowVoice(true)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 hover:bg-orange-500/20 transition-all"
                  title="Adicionar por voz"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">Voz</span>
                </button>
                <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-lg border border-border/50">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="number"
                    value={durationInput}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      setDurationInput(rawValue);
                      if (rawValue.trim() === "") return;

                      const parsed = Number.parseInt(rawValue, 10);
                      if (Number.isFinite(parsed)) {
                        setDuration(Math.max(0, parsed));
                      }
                    }}
                    onBlur={() => {
                      const parsed = Number.parseInt(durationInput, 10);
                      const normalized = Number.isFinite(parsed)
                        ? Math.max(0, parsed)
                        : Math.max(0, duration);
                      setDuration(normalized);
                      setDurationInput(String(normalized));
                    }}
                    className="w-10 bg-transparent text-sm font-mono focus:outline-none"
                  />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">min</span>
                </div>
              </div>
            </div>

            {currentExercises.length > 0 && (
              <div className="px-5 pt-5">
                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">Progresso do treino</p>
                      <p className="text-xs text-muted-foreground">
                        {completedCount} de {currentExercises.length} exercícios concluídos · {formatVolume(currentWorkoutVolume)} de volume
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-orange-500">{completionProgress}%</p>
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-orange-500/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all duration-300"
                      style={{ width: `${completionProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="p-5 space-y-4">
              {currentExercises.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-border/50 rounded-2xl">
                  <Dumbbell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm mb-4">Nenhum exercício adicionado</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => setShowLibrary(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-orange-500/50 text-orange-500 text-sm font-bold hover:bg-orange-500/5 transition-all"
                    >
                      <BookOpen className="w-4 h-4" /> Biblioteca
                    </button>
                    <button
                      onClick={() => setShowVoice(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-orange-500/50 text-orange-500 text-sm font-bold hover:bg-orange-500/5 transition-all"
                    >
                      <Mic className="w-4 h-4" /> Por Voz
                    </button>
                    <button
                      onClick={() => setShowMuscleMap(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-muted-foreground text-sm font-bold hover:bg-muted transition-all"
                    >
                      <MapIcon className="w-4 h-4" /> Por Músculo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentExercises.map((ex, idx) => {
                    const libEx = EXERCISE_LIBRARY.find((l) => l.name === ex.name);
                    const exerciseGifUrl = libEx?.gifUrl;
                    const isDone = !!completedExercises[ex.id];

                    return (
                      <motion.div
                        key={ex.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 rounded-2xl border group transition-all shadow-sm ${
                          isDone
                            ? "bg-green-500/5 border-green-500/30"
                            : "bg-secondary/30 border-border/50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              onClick={() => markExerciseDone(ex.id)}
                              className={`mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                                isDone
                                  ? "bg-green-500 border-green-500 text-white"
                                  : "border-border/70 bg-background text-transparent hover:border-green-500"
                              }`}
                              title={isDone ? "Marcar como pendente" : "Marcar como concluído"}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <h4 className={`font-bold text-sm truncate ${isDone ? "line-through text-muted-foreground" : ""}`}>
                                {ex.name}
                              </h4>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                {ex.muscleGroup}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {exerciseGifUrl && (
                              <button
                                onClick={() => setExpandedGif({ name: ex.name, gifUrl: exerciseGifUrl })}
                                className="w-10 h-10 rounded-lg overflow-hidden border border-border/50 bg-black/5 hover:scale-105 transition-all"
                                title="Ampliar demonstração"
                              >
                                <img
                                  src={exerciseGifUrl}
                                  alt={ex.name}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            )}
                            <button
                              onClick={() => setFormCheckEx(ex.name)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-all opacity-0 group-hover:opacity-100"
                              title="Form Check com câmera"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeExercise(ex.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                              Séries
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateExercise(ex.id, { sets: Math.max(1, ex.sets - 1) })}
                                className="p-1 rounded bg-background border border-border/50"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-mono w-4 text-center">{ex.sets}</span>
                              <button
                                onClick={() => updateExercise(ex.id, { sets: ex.sets + 1 })}
                                className="p-1 rounded bg-background border border-border/50"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                              Reps
                            </label>
                            <input
                              type="number"
                              value={exerciseDrafts[ex.id]?.reps ?? String(ex.reps)}
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                setExerciseDraftValue(ex.id, "reps", rawValue);
                                if (rawValue.trim() === "") return;

                                const parsed = Number.parseInt(rawValue, 10);
                                if (Number.isFinite(parsed)) {
                                  updateExercise(ex.id, { reps: Math.max(0, parsed) });
                                }
                              }}
                              onBlur={() => {
                                const rawValue = exerciseDrafts[ex.id]?.reps;
                                if (rawValue === undefined) return;

                                const parsed = Number.parseInt(rawValue, 10);
                                const normalized = Number.isFinite(parsed)
                                  ? Math.max(0, parsed)
                                  : Math.max(0, ex.reps);
                                updateExercise(ex.id, { reps: normalized });
                                clearExerciseDraftValue(ex.id, "reps");
                              }}
                              className="w-full bg-background border border-border/50 rounded-lg px-2 py-1 text-sm font-mono focus:outline-none focus:border-orange-500/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                              Peso (kg)
                            </label>
                            <input
                              type="number"
                              value={exerciseDrafts[ex.id]?.weight ?? String(ex.weight)}
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                setExerciseDraftValue(ex.id, "weight", rawValue);
                                if (rawValue.trim() === "") return;

                                const parsed = Number.parseFloat(
                                  rawValue.replace(",", ".")
                                );
                                if (Number.isFinite(parsed)) {
                                  updateExercise(ex.id, { weight: Math.max(0, parsed) });
                                }
                              }}
                              onBlur={() => {
                                const rawValue = exerciseDrafts[ex.id]?.weight;
                                if (rawValue === undefined) return;

                                const parsed = Number.parseFloat(
                                  rawValue.replace(",", ".")
                                );
                                const normalized = Number.isFinite(parsed)
                                  ? Math.max(0, parsed)
                                  : Math.max(0, ex.weight);
                                updateExercise(ex.id, { weight: normalized });
                                clearExerciseDraftValue(ex.id, "weight");
                              }}
                              className="w-full bg-background border border-border/50 rounded-lg px-2 py-1 text-sm font-mono focus:outline-none focus:border-orange-500/50"
                            />
                          </div>
                        </div>

                        <ProgressiveOverload
                          exerciseName={ex.name}
                          currentSets={ex.sets}
                          currentReps={ex.reps}
                          currentWeight={ex.weight}
                        />

                        <ExerciseStreakBadge exerciseName={ex.name} />

                        <div className="mt-4">
                          <LoadChart exerciseName={ex.name} />
                        </div>
                      </motion.div>
                    );
                  })}

                  <div className="pt-4 flex gap-3">
                    <button
                      onClick={() => setShowLibrary(true)}
                      className="flex-1 py-3 rounded-xl border border-dashed border-border hover:border-orange-500/50 hover:bg-orange-500/5 text-muted-foreground hover:text-orange-500 transition-all text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Exercício
                    </button>
                    <button
                      onClick={() => {
                        handleSaveWorkout();
                        setCompletedExercises({});
                      }}
                      className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Finalizar Treino
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              <h3 className="font-bold">Histórico do Dia</h3>
            </div>
            {todayWorkouts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum treino registrado hoje.</p>
            ) : (
              <div className="space-y-3">
                {todayWorkouts.map((workout) => (
                  <div
                    key={workout.id}
                    className="p-4 rounded-2xl border border-border/50 bg-card group hover:border-orange-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <Dumbbell className="w-4 h-4 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">
                            {workout.exercises.length} exercícios realizados
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {workout.time} · {workout.duration} min · {" "}
                            {new Date(workout.date).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => exportToPDF(workout)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Exportar"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeWorkoutEntry(workout.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {workout.exercises.map((ex) => (
                        <span
                          key={ex.id}
                          className="text-[10px] px-2 py-1 rounded-lg bg-secondary/50 border border-border/50 text-muted-foreground flex items-center gap-1.5"
                        >
                          <div className="w-1 h-1 rounded-full bg-orange-500" />
                          <span className="font-bold text-foreground/80">{ex.name}</span>
                          <span className="opacity-60">
                            {ex.sets}x{ex.reps} · {ex.weight}kg
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <RestTimer />

          <ExerciseChallenges />

          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Recordes
                </h3>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">
                {exerciseRecords.length} ativos
              </span>
            </div>

            {exerciseRecords.length > 0 ? (
              <div className="space-y-2">
                {exerciseRecords.map((record) => (
                  <div key={record.name} className="rounded-xl border border-border/50 bg-secondary/30 p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{record.name}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {record.muscleGroup} · {record.sessions} {record.sessions === 1 ? "sessão" : "sessões"}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-orange-500">{record.maxWeight}kg</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                      <span>Volume PR {formatVolume(record.bestVolume)}</span>
                      <span>{new Date(`${record.lastDate}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                Finalize treinos com carga para criar seus recordes.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Estatísticas
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                  Total Hoje
                </p>
                <p className="text-xl font-mono font-bold text-orange-500">
                  {todayWorkouts.length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                  Minutos
                </p>
                <p className="text-xl font-mono font-bold text-orange-500">
                  {todayWorkouts.reduce((a, c) => a + c.duration, 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 col-span-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                  Progresso atual
                </p>
                <p className="text-xl font-mono font-bold text-orange-500">
                  {completionProgress}%
                </p>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-orange-500" />
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">
                    Progressão
                  </p>
                </div>
                <p className="mb-3 text-[11px] text-muted-foreground">
                  Calculada pelos treinos salvos.
                </p>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Nível</p>
                    <p className="text-xl font-mono font-bold text-orange-500">{workoutProgress.level}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">XP</p>
                    <p className="text-xl font-mono font-bold text-orange-500">{workoutProgress.xp} <span className="text-gray-400 text-base">/ {workoutProgress.xpGoal}</span></p>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-orange-500/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-500"
                    style={{ width: `${workoutProgress.percent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Dica do Dia
              </h3>
            </div>
            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
              <p className="text-xs text-muted-foreground leading-relaxed">
                "A constância é mais importante que a intensidade. Mesmo um treino curto de 15
                minutos mantém o hábito vivo e o metabolismo ativo."
              </p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showLibrary && (
          <ExerciseLibrary
            onSelect={addExerciseFromLibrary}
            onClose={() => setShowLibrary(false)}
          />
        )}
        {showVoice && (
          <VoiceLogger
            onExerciseDetected={handleVoiceDetected}
            onClose={() => setShowVoice(false)}
          />
        )}
        {showMuscleMap && (
          <MuscleMap
            onSelectExercise={handleMuscleSelect}
            onClose={() => setShowMuscleMap(false)}
          />
        )}
        {formCheckEx && (
          <FormCheck
            exerciseName={formCheckEx}
            onClose={() => setFormCheckEx(null)}
          />
        )}
        {expandedGif && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setExpandedGif(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-xl rounded-3xl border border-border bg-card p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-orange-500">
                    Demonstração do exercício
                  </p>
                  <h4 className="text-lg font-bold">{expandedGif.name}</h4>
                </div>
                <button
                  onClick={() => setExpandedGif(null)}
                  className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted transition-all text-sm font-medium"
                >
                  Fechar
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden border border-border/50 bg-black/10 flex items-center justify-center min-h-[320px]">
                <img
                  src={expandedGif.gifUrl}
                  alt={expandedGif.name}
                  className="max-h-[70vh] w-auto object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
