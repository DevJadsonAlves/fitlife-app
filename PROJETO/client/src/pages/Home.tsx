import { useMemo } from "react";
import {
  CUSTOM_HABIT_CATEGORIES,
  CUSTOM_HABIT_DIFFICULTIES,
  isCustomHabitComplete,
  useHabits,
} from "@/contexts/HabitsContext";
import ProgressRing from "@/components/ProgressRing";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Droplets,
  Dumbbell,
  Flame,
  ListChecks,
  Moon,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  UtensilsCrossed,
  Weight,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

const COLORS = {
  water: "#22d3ee",
  workout: "#f97316",
  food: "#84cc16",
  sleep: "#818cf8",
  weight: "#f59e0b",
  fasting: "#10b981",
  custom: "#14b8a6",
  focus: "#22c55e",
  warning: "#f59e0b",
};

type SmartAction = {
  id: string;
  title: string;
  detail: string;
  color: string;
  icon: LucideIcon;
  href?: string;
  actionLabel: string;
  onClick?: () => void | Promise<void>;
  priority: number;
  done: boolean;
  xpPotential?: number;
};

type RadarItem = {
  id: string;
  title: string;
  value: string;
  detail: string;
  percent: number;
  color: string;
  icon: LucideIcon;
  href: string;
};

type SignalItem = {
  id: string;
  title: string;
  text: string;
  color: string;
  icon: LucideIcon;
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: index * 0.05,
      duration: 0.4,
      ease: [0, 0, 0.2, 1] as const,
    },
  }),
};

function getPercent(current: number, target: number) {
  if (target <= 0) return current > 0 ? 100 : 0;
  return Math.min(100, Math.max(0, (current / target) * 100));
}

function formatHourValue(value: number) {
  const safeValue = Math.max(0, value);
  const totalMinutes = Math.round(safeValue * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

function formatWeightValue(value: number) {
  const normalized = Math.round(value * 10) / 10;
  return Number.isInteger(normalized) ? `${normalized}` : normalized.toFixed(1);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const {
    currentDate,
    userProfile,
    achievements,
    getProgressPercent,
    getCompletedHabits,
    getTodayWaterTotal,
    getTodayWorkoutMinutes,
    getTodayCalories,
    getTodayMacros,
    getTodaySleep,
    addWaterEntry,
    getDayEntries,
    getTotalHabits,
    fastingSessions,
    startFasting,
    endFasting,
    workoutEntries,
    foodEntries,
    weightEntries,
    goals,
    streaks,
    customHabits,
    customHabitLogs,
    setCustomHabitLog,
    xp,
    level,
    xpToNextLevel,
  } = useHabits();

  const currentHour = new Date().getHours();
  const progress = getProgressPercent();
  const completed = getCompletedHabits();
  const totalHabits = getTotalHabits();
  const waterTotal = getTodayWaterTotal();
  const workoutMin = getTodayWorkoutMinutes();
  const calories = getTodayCalories();
  const todayMacros = getTodayMacros();
  const sleep = getTodaySleep();
  const todayWorkouts = getDayEntries(workoutEntries);
  const todayFood = getDayEntries(foodEntries);
  const todayWeightEntries = getDayEntries(weightEntries);
  const todayCustomLogs = getDayEntries(customHabitLogs);
  const activeCustomHabits = customHabits.filter(habit => habit.isActive);
  const completedCustomHabits = activeCustomHabits.filter(habit => {
    const log = todayCustomLogs.find(entry => entry.habitId === habit.id);
    return isCustomHabitComplete(habit, log);
  });
  const activeFasting = fastingSessions.find(session => session.isActive);
  const activeFastingStart = activeFasting
    ? new Date(activeFasting.startTime)
    : null;
  const activeFastingHasStarted = activeFastingStart
    ? Date.now() >= activeFastingStart.getTime()
    : false;
  const fastingElapsedHours = activeFasting
    ? Math.max(
        0,
        (Date.now() - new Date(activeFasting.startTime).getTime()) /
          (1000 * 60 * 60)
      )
    : 0;
  const fastingGoalReached =
    !!activeFasting && fastingElapsedHours >= activeFasting.targetDuration;
  const fastingPercent = activeFasting
    ? getPercent(fastingElapsedHours, activeFasting.targetDuration)
    : 0;
  const unlockedAchievements = achievements.filter(
    achievement => achievement.unlocked
  ).length;
  const customXpToday = completedCustomHabits.reduce(
    (sum, habit) => sum + habit.xp,
    0
  );
  const waterPercent = getPercent(waterTotal, goals.water);
  const workoutPercent = getPercent(workoutMin, goals.workoutMinutes);
  const foodPercent =
    todayFood.length > 0 ? getPercent(calories, goals.calories) : 0;
  const sleepPercent = sleep
    ? getPercent(sleep.duration, goals.sleepHours)
    : 0;
  const customPercent = activeCustomHabits.length
    ? getPercent(completedCustomHabits.length, activeCustomHabits.length)
    : 0;
  const proteinPercent = getPercent(todayMacros.protein, goals.protein);
  const waterDone = waterTotal >= goals.water;
  const workoutDone = workoutMin >= goals.workoutMinutes;
  const foodDone = calories > 0 && calories <= goals.calories;
  const sleepDone = !!sleep;
  const smartCompletedCount =
    [waterDone, workoutDone, foodDone, sleepDone, fastingGoalReached].filter(
      Boolean
    ).length + completedCustomHabits.length;
  const smartTotalCount = 5 + activeCustomHabits.length;
  const pendingCoreCount =
    [waterDone, workoutDone, foodDone, sleepDone, fastingGoalReached].filter(
      done => !done
    ).length;
  const xpForCurrentLevel = Math.max(0, (level - 1) * 100);
  const xpNeededThisLevel = Math.max(1, xpToNextLevel - xpForCurrentLevel);
  const xpProgressPercent = Math.min(
    100,
    Math.max(0, ((xp - xpForCurrentLevel) / xpNeededThisLevel) * 100)
  );
  const xpMissing = Math.max(0, xpToNextLevel - xp);
  const dayLabel = currentDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const displayName = userProfile?.name?.trim()?.split(" ")[0] || "Você";
  const bestStreak = useMemo(() => {
    const streakItems = [
      { label: "Água", value: streaks.water, color: COLORS.water },
      { label: "Treino", value: streaks.workout, color: COLORS.workout },
      { label: "Alimentação", value: streaks.food, color: COLORS.food },
      { label: "Sono", value: streaks.sleep, color: COLORS.sleep },
      { label: "Peso", value: streaks.weight, color: COLORS.weight },
    ];

    return [...streakItems].sort((left, right) => right.value - left.value)[0];
  }, [streaks]);
  const sortedWeightEntries = useMemo(
    () =>
      [...weightEntries].sort((left, right) => {
        const dateCompare = left.date.localeCompare(right.date);
        if (dateCompare !== 0) return dateCompare;
        return (left.created_at || "").localeCompare(right.created_at || "");
      }),
    [weightEntries]
  );
  const latestWeightEntry =
    sortedWeightEntries.length > 0
      ? sortedWeightEntries[sortedWeightEntries.length - 1]
      : undefined;
  const previousWeightEntry =
    sortedWeightEntries.length > 1
      ? sortedWeightEntries[sortedWeightEntries.length - 2]
      : undefined;
  const weightDelta =
    latestWeightEntry && previousWeightEntry
      ? latestWeightEntry.weight - previousWeightEntry.weight
      : null;

  const getCustomCompletionValue = (
    habit: (typeof activeCustomHabits)[number]
  ) => {
    if (habit.type === "boolean") return 1;
    if (habit.type === "limit") return 0;
    return habit.target;
  };

  const reminderToMinutes = (time?: string) => {
    if (!time) return Number.POSITIVE_INFINITY;
    const [hours, minutes] = time.split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const pendingCustomActions: SmartAction[] = activeCustomHabits
    .filter(habit => {
      const log = todayCustomLogs.find(entry => entry.habitId === habit.id);
      return !isCustomHabitComplete(habit, log);
    })
    .map(habit => {
      const category = CUSTOM_HABIT_CATEGORIES[habit.category];
      const reminderDue =
        habit.reminderEnabled &&
        reminderToMinutes(habit.reminderTime) <= currentMinutes;

      return {
        id: `custom-${habit.id}`,
        title: habit.name,
        detail: reminderDue
          ? `Lembrete ${habit.reminderTime} já passou`
          : `${category.label} · +${habit.xp} XP`,
        color: habit.color,
        icon: ListChecks,
        href: "/habitos",
        actionLabel: "Concluir",
        priority: reminderDue ? 12 : 60,
        done: false,
        xpPotential: habit.xp,
        onClick: async () => {
          await setCustomHabitLog(habit.id, getCustomCompletionValue(habit));
          toast.success(`${habit.name} concluído`);
        },
      };
    });

  const smartActions: SmartAction[] = [
    {
      id: "water",
      title: "Água",
      detail: waterDone
        ? "Meta fechada"
        : `Faltam ${Math.max(goals.water - waterTotal, 0)} ml`,
      color: COLORS.water,
      icon: Droplets,
      href: "/agua",
      actionLabel: `Beber ${goals.glassSize} ml`,
      priority:
        waterDone ? 99 : currentHour >= 14 && waterPercent < 50 ? 8 : 24,
      done: waterDone,
      xpPotential: waterDone ? undefined : 10,
      onClick: () => {
        addWaterEntry(goals.glassSize);
        toast.success(`+${goals.glassSize} ml de água`);
      },
    },
    {
      id: "food",
      title: "Alimentação",
      detail:
        calories === 0
          ? "Nenhuma refeição registrada"
          : calories > goals.calories
            ? "Meta calórica estourada"
            : `${calories}/${goals.calories} kcal`,
      color: COLORS.food,
      icon: UtensilsCrossed,
      href: "/alimentacao",
      actionLabel:
        calories === 0 ? "Registrar refeição" : "Ajustar alimentação",
      priority:
        foodDone
          ? 99
          : calories === 0 && currentHour >= 12
            ? 10
            : proteinPercent < 55 && calories > 0
              ? 18
              : 38,
      done: foodDone,
      xpPotential: calories === 0 ? 10 : undefined,
    },
    {
      id: "workout",
      title: "Treino",
      detail: workoutDone
        ? "Meta de minutos batida"
        : `${workoutMin}/${goals.workoutMinutes} min registrados`,
      color: COLORS.workout,
      icon: Dumbbell,
      href: "/treinos",
      actionLabel: "Registrar treino",
      priority:
        workoutDone ? 99 : currentHour >= 17 && workoutMin === 0 ? 14 : 34,
      done: workoutDone,
      xpPotential: workoutDone ? undefined : 50,
    },
    {
      id: "sleep",
      title: "Sono",
      detail: sleep
        ? `${formatHourValue(sleep.duration)}h registradas`
        : "Ainda sem registro de sono",
      color: COLORS.sleep,
      icon: Moon,
      href: "/sono",
      actionLabel: "Registrar sono",
      priority: sleepDone ? 99 : currentHour >= 9 ? 16 : 46,
      done: sleepDone,
      xpPotential: sleepDone ? undefined : 20,
    },
    {
      id: "fasting",
      title: "Jejum",
      detail: activeFasting
        ? fastingGoalReached
          ? `Meta de ${activeFasting.targetDuration}h batida`
          : activeFastingHasStarted
            ? `${formatHourValue(fastingElapsedHours)}/${activeFasting.targetDuration}h em andamento`
            : `Começa ${formatDateTime(activeFasting.startTime)}`
        : "Nenhum jejum ativo",
      color: COLORS.fasting,
      icon: Flame,
      href: "/jejum",
      actionLabel: fastingGoalReached
        ? "Encerrar jejum"
        : activeFasting
          ? "Abrir jejum"
          : "Iniciar 16:8",
      priority: fastingGoalReached ? 9 : activeFasting ? 58 : 82,
      done: fastingGoalReached,
      xpPotential: fastingGoalReached ? 50 : undefined,
      onClick: fastingGoalReached
        ? async () => {
            await endFasting();
            toast.success("Jejum encerrado");
          }
        : !activeFasting
          ? async () => {
              await startFasting({ durationHours: 16 });
              toast.success("Jejum de 16h iniciado");
            }
          : undefined,
    },
    ...pendingCustomActions,
  ].sort(
    (left, right) => Number(left.done) - Number(right.done) || left.priority - right.priority
  );

  const pendingActions = smartActions.filter(action => !action.done);
  const nextAction = pendingActions[0];
  const possibleXpToday = pendingActions.reduce(
    (sum, action) => sum + (action.xpPotential || 0),
    0
  );

  const coachText = nextAction
    ? nextAction.id === "water"
      ? "Seu dia pede hidratação agora. Tirar esse atraso cedo deixa o resto mais leve."
      : nextAction.id === "food"
        ? calories === 0
          ? "A alimentação ainda não entrou no jogo. Uma refeição bem lançada organiza o resto do dia."
          : "Ajustar a comida agora evita terminar o dia no improviso."
        : nextAction.id === "workout"
          ? "O treino ainda está em aberto. Registrar isso muda o peso do seu dia."
          : nextAction.id === "sleep"
            ? "Fechar o sono mantém seu histórico consistente e melhora o contexto dos relatórios."
            : nextAction.id === "fasting"
              ? fastingGoalReached
                ? "Seu jejum já entregou o que precisava. Encerrar agora limpa o fluxo e garante o bônus."
                : "O jejum pode virar uma boa peça de consistência hoje."
              : "Seu próximo ganho está nos hábitos extras. Resolver isso agora rende XP e limpeza mental."
    : "A base do dia está redonda. Agora é só sustentar o ritmo sem desperdiçar a sequência.";
  const radarItems: RadarItem[] = [
    {
      id: "water",
      title: "Água",
      value: `${waterTotal}/${goals.water} ml`,
      detail: waterDone
        ? "Meta batida"
        : `${Math.max(goals.water - waterTotal, 0)} ml restantes`,
      percent: waterPercent,
      color: COLORS.water,
      icon: Droplets,
      href: "/agua",
    },
    {
      id: "workout",
      title: "Treino",
      value: `${workoutMin}/${goals.workoutMinutes} min`,
      detail:
        todayWorkouts.length > 0
          ? `${todayWorkouts.length} registro${todayWorkouts.length > 1 ? "s" : ""} hoje`
          : "Nenhum treino hoje",
      percent: workoutPercent,
      color: COLORS.workout,
      icon: Dumbbell,
      href: "/treinos",
    },
    {
      id: "food",
      title: "Alimentação",
      value: `${calories}/${goals.calories} kcal`,
      detail: `${todayMacros.protein}/${goals.protein}g proteína`,
      percent: foodPercent,
      color: COLORS.food,
      icon: UtensilsCrossed,
      href: "/alimentacao",
    },
    {
      id: "sleep",
      title: "Sono",
      value: sleep ? `${formatHourValue(sleep.duration)}h` : "--",
      detail: sleep ? `Qualidade ${sleep.quality}/5` : "Sem registro hoje",
      percent: sleepPercent,
      color: COLORS.sleep,
      icon: Moon,
      href: "/sono",
    },
    {
      id: "fasting",
      title: "Jejum",
      value: activeFasting
        ? `${formatHourValue(fastingElapsedHours)}/${activeFasting.targetDuration}h`
        : "Nenhum ativo",
      detail: activeFasting
        ? fastingGoalReached
          ? "Meta já batida"
          : activeFastingHasStarted
            ? "Sessão em andamento"
            : `Começa ${formatDateTime(activeFasting.startTime)}`
        : "Pronto para iniciar",
      percent: fastingPercent,
      color: COLORS.fasting,
      icon: Flame,
      href: "/jejum",
    },
    {
      id: "custom",
      title: "Hábitos extras",
      value: activeCustomHabits.length
        ? `${completedCustomHabits.length}/${activeCustomHabits.length}`
        : "0 ativos",
      detail: activeCustomHabits.length
        ? `+${customXpToday} XP hoje`
        : "Crie seu primeiro hábito",
      percent: customPercent,
      color: COLORS.custom,
      icon: ListChecks,
      href: "/habitos",
    },
  ];

  const signalItems = useMemo<SignalItem[]>(() => {
    const items: SignalItem[] = [];

    if (currentHour >= 12 && waterPercent < 50) {
      items.push({
        id: "water-late",
        title: "Água ficou para trás",
        text: `Você ainda está em ${Math.round(waterPercent)}% da meta. Fechar alguns copos agora evita correr no fim do dia.`,
        color: COLORS.warning,
        icon: ShieldAlert,
      });
    }

    if (calories === 0 && currentHour >= 12) {
      items.push({
        id: "food-missing",
        title: "Dia sem alimentação lançada",
        text: "A aba de alimentação ainda está vazia. Um registro já destrava melhor leitura de déficit e proteína.",
        color: COLORS.food,
        icon: UtensilsCrossed,
      });
    } else if (calories > 0 && proteinPercent < 55) {
      items.push({
        id: "protein-low",
        title: "Proteína abaixo do ritmo",
        text: `Você está em ${todayMacros.protein}/${goals.protein}g. Vale puxar uma refeição mais forte nisso.`,
        color: COLORS.food,
        icon: TrendingUp,
      });
    }

    if (!sleep) {
      items.push({
        id: "sleep-missing",
        title: "Sono ainda sem contexto",
        text: "Registrar como você dormiu ajuda o app a cruzar energia, treino e consistência com mais precisão.",
        color: COLORS.sleep,
        icon: Moon,
      });
    }

    if (fastingGoalReached) {
      items.push({
        id: "fasting-ready",
        title: "Jejum pronto para fechar",
        text: `A meta de ${activeFasting?.targetDuration}h já foi cumprida. Encerrar agora organiza histórico e bônus.`,
        color: COLORS.fasting,
        icon: Flame,
      });
    }

    if (workoutDone) {
      items.push({
        id: "workout-done",
        title: "Treino já entrou no placar",
        text: `${workoutMin} minutos registrados hoje. Esse bloco do dia já está defendido.`,
        color: COLORS.workout,
        icon: CheckCircle2,
      });
    }

    if (progress >= 80) {
      items.push({
        id: "progress-strong",
        title: "Dia forte",
        text: `Você já fechou ${completed}/${totalHabits} hábitos. Falta pouco para deixar o painel limpo.`,
        color: COLORS.focus,
        icon: Sparkles,
      });
    }

    if (
      activeCustomHabits.length > 0 &&
      completedCustomHabits.length < activeCustomHabits.length
    ) {
      const remaining = activeCustomHabits.length - completedCustomHabits.length;
      items.push({
        id: "custom-open",
        title: "Hábitos extras ainda rendem XP",
        text: `Restam ${remaining} hábito${remaining > 1 ? "s" : ""} extra${remaining > 1 ? "s" : ""} em aberto.`,
        color: COLORS.custom,
        icon: ListChecks,
      });
    }

    if (items.length === 0) {
      items.push({
        id: "all-good",
        title: "Painel limpo",
        text: "Seu básico está bem amarrado hoje. Agora é manter constância e fechar bonito.",
        color: COLORS.focus,
        icon: Sparkles,
      });
    }

    return items.slice(0, 4);
  }, [
    activeCustomHabits.length,
    activeFasting?.targetDuration,
    calories,
    completed,
    completedCustomHabits.length,
    currentHour,
    fastingGoalReached,
    goals.protein,
    progress,
    proteinPercent,
    sleep,
    todayMacros.protein,
    totalHabits,
    waterPercent,
    workoutDone,
    workoutMin,
  ]);

  const topCustomHabits = activeCustomHabits.slice(0, 4);
  const quickLinks = [
    {
      href: "/agua",
      label: "Água",
      sublabel: `${Math.floor(waterTotal / goals.glassSize)} copos`,
      icon: Droplets,
      color: COLORS.water,
    },
    {
      href: "/treinos",
      label: "Treino",
      sublabel: `${workoutMin} min`,
      icon: Dumbbell,
      color: COLORS.workout,
    },
    {
      href: "/alimentacao",
      label: "Alimentação",
      sublabel: `${todayFood.length} refeição${todayFood.length === 1 ? "" : "es"}`,
      icon: UtensilsCrossed,
      color: COLORS.food,
    },
    {
      href: "/jejum",
      label: "Jejum",
      sublabel: activeFasting ? "em andamento" : "abrir fluxo",
      icon: Flame,
      color: COLORS.fasting,
    },
    {
      href: "/habitos",
      label: "Extras",
      sublabel: `${completedCustomHabits.length}/${activeCustomHabits.length || 0}`,
      icon: ListChecks,
      color: COLORS.custom,
    },
    {
      href: "/relatorio",
      label: "Relatórios",
      sublabel: "ver tendências",
      icon: BarChart3,
      color: "#a78bfa",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10">
            <Target className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-[24px] font-extrabold leading-tight text-foreground">
              Central do Dia
            </h2>
            <p className="text-sm text-muted-foreground">
              {displayName}, hoje é {dayLabel}. Fecha o básico e deixa o app trabalhar a seu favor.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <motion.section
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={0}
          className="rounded-lg border border-border/50 bg-card p-5"
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.2px] text-emerald-400">
                  <Zap className="h-3.5 w-3.5" />
                  Prioridade do dia
                </div>
                <h3 className="text-xl font-black text-foreground">
                  {nextAction ? nextAction.title : "Tudo alinhado"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {nextAction ? `${nextAction.detail}. ${coachText}` : coachText}
                </p>
              </div>
              <ProgressRing
                percent={progress}
                size={96}
                strokeWidth={9}
                color={COLORS.focus}
                glowColor={COLORS.focus}
                label={`${progress}%`}
                sublabel="do dia"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricPill
                label="Em ordem"
                value={`${smartCompletedCount}/${smartTotalCount}`}
                color={COLORS.focus}
              />
              <MetricPill
                label="XP disponível"
                value={`+${possibleXpToday}`}
                color={possibleXpToday > 0 ? "#a3e635" : "#94a3b8"}
              />
              <MetricPill
                label="Pendências fortes"
                value={`${pendingCoreCount}`}
                color={pendingCoreCount > 0 ? COLORS.warning : COLORS.focus}
              />
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-secondary/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[1.4px] text-muted-foreground">
                    Próximo passo
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {nextAction ? "Faz isso agora e o painel já muda de cara." : "A base de hoje está limpa."}
                  </p>
                </div>
                {nextAction ? (
                  <SmartActionButton action={nextAction} compact={false} />
                ) : (
                  <Link href="/relatorio">
                    <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-black text-background transition-opacity hover:opacity-90">
                      Ver relatórios
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {pendingActions.slice(0, 3).map(action => (
                  <PendingRow key={action.id} action={action} />
                ))}
                {pendingActions.length === 0 && (
                  <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300 sm:col-span-2 xl:col-span-3">
                    Sem pendências críticas agora. O resto é manutenção fina.
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard
            custom={1}
            label="Consistência geral"
            value={`${progress}%`}
            detail={`${completed}/${totalHabits} hábitos fechados hoje`}
            icon={CheckCircle2}
            color={COLORS.focus}
            progress={progress}
          />
          <KpiCard
            custom={2}
            label="Próximo nível"
            value={`Lv ${level}`}
            detail={`${xpMissing} XP restantes`}
            icon={Zap}
            color="#a3e635"
            progress={xpProgressPercent}
          />
          <KpiCard
            custom={3}
            label="Melhor sequência"
            value={`${bestStreak.value}d`}
            detail={bestStreak.value > 0 ? `${bestStreak.label} está puxando o ritmo` : "Ainda sem embalo forte"}
            icon={Trophy}
            color={bestStreak.color}
          />
          <KpiCard
            custom={4}
            label="Peso"
            value={latestWeightEntry ? `${formatWeightValue(latestWeightEntry.weight)}kg` : "--"}
            detail={
              weightDelta === null
                ? todayWeightEntries.length > 0
                  ? "Pesagem feita hoje"
                  : "Sem leitura suficiente"
                : weightDelta === 0
                  ? "Estável vs. último registro"
                  : weightDelta < 0
                    ? `${formatWeightValue(Math.abs(weightDelta))}kg abaixo do anterior`
                    : `${formatWeightValue(weightDelta)}kg acima do anterior`
            }
            icon={
              weightDelta !== null && weightDelta > 0
                ? TrendingUp
                : weightDelta !== null && weightDelta < 0
                  ? TrendingDown
                  : Weight
            }
            color={COLORS.weight}
          />
        </div>
      </section>

      <motion.section
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={5}
        className="rounded-lg border border-border/50 bg-card p-5"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-300" />
              <h3 className="text-base font-black text-foreground">Radar do dia</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Um panorama rápido do que já andou e do que ainda pede atenção.
            </p>
          </div>
          <span className="rounded-lg border border-border/60 bg-white/[0.03] px-3 py-2 text-xs font-bold text-muted-foreground">
            {pendingActions.length === 0
              ? "Sem gargalos agora"
              : `${pendingActions.length} frente${pendingActions.length > 1 ? "s" : ""} aberta${pendingActions.length > 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {radarItems.map(item => (
            <Link key={item.id} href={item.href}>
              <span className="block rounded-lg border border-border/50 bg-secondary/20 p-4 transition-colors hover:border-border/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div
                      className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border"
                      style={{
                        borderColor: `${item.color}45`,
                        backgroundColor: `${item.color}18`,
                      }}
                    >
                      <item.icon className="h-4 w-4" style={{ color: item.color }} />
                    </div>
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <p
                      className="mt-1 font-mono text-xl font-black"
                      style={{ color: item.color }}
                    >
                      {item.value}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {Math.round(item.percent)}%
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-md bg-white/5">
                  <div
                    className="h-full rounded-md transition-all"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>

                <p className="mt-3 text-xs text-muted-foreground">{item.detail}</p>
              </span>
            </Link>
          ))}
        </div>
      </motion.section>
      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <motion.section
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={6}
          className="rounded-lg border border-border/50 bg-card p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-300" />
            <h3 className="text-base font-black text-foreground">Sinais do dia</h3>
          </div>

          <div className="space-y-3">
            {signalItems.map(item => (
              <div
                key={item.id}
                className="rounded-lg border border-border/50 bg-secondary/20 p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                    style={{
                      borderColor: `${item.color}45`,
                      backgroundColor: `${item.color}16`,
                    }}
                  >
                    <item.icon className="h-4 w-4" style={{ color: item.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={7}
          className="rounded-lg border border-border/50 bg-card p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-orange-300" />
            <h3 className="text-base font-black text-foreground">Embalo e extras</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[1.4px] text-muted-foreground">
                Sequências
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  {
                    label: "Água",
                    value: streaks.water,
                    color: COLORS.water,
                    icon: Droplets,
                  },
                  {
                    label: "Treino",
                    value: streaks.workout,
                    color: COLORS.workout,
                    icon: Dumbbell,
                  },
                  {
                    label: "Alimentação",
                    value: streaks.food,
                    color: COLORS.food,
                    icon: UtensilsCrossed,
                  },
                  {
                    label: "Sono",
                    value: streaks.sleep,
                    color: COLORS.sleep,
                    icon: Moon,
                  },
                  {
                    label: "Peso",
                    value: streaks.weight,
                    color: COLORS.weight,
                    icon: Weight,
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    className="min-w-[106px] rounded-lg border border-border/50 bg-background/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                      <span className="text-[11px] font-bold text-muted-foreground">
                        {item.label}
                      </span>
                    </div>
                    <p
                      className="mt-2 font-mono text-2xl font-black"
                      style={{
                        color:
                          item.value > 0 ? item.color : "rgba(148,163,184,0.7)",
                      }}
                    >
                      {item.value}d
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[1.4px] text-muted-foreground">
                Hábitos extras
              </p>
              <div className="mt-3 space-y-2">
                {topCustomHabits.length > 0 ? (
                  topCustomHabits.map(habit => {
                    const log = todayCustomLogs.find(
                      entry => entry.habitId === habit.id
                    );
                    const done = isCustomHabitComplete(habit, log);
                    const category = CUSTOM_HABIT_CATEGORIES[habit.category];
                    const difficulty =
                      CUSTOM_HABIT_DIFFICULTIES[habit.difficulty];

                    return (
                      <div
                        key={habit.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/30 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">
                            {habit.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {category.label} · {difficulty.label} · {habit.xp} XP
                          </p>
                        </div>
                        <span
                          className="rounded-md px-2 py-1 text-[10px] font-bold"
                          style={{
                            backgroundColor: done
                              ? `${habit.color}20`
                              : "rgba(255,255,255,0.04)",
                            color: done ? habit.color : "rgba(148,163,184,0.9)",
                          }}
                        >
                          {done ? "Feito" : "Pendente"}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed border-border/50 p-4 text-sm text-muted-foreground">
                    Você ainda não ativou hábitos extras.
                  </div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <MiniStat
                  label="Conquistas"
                  value={`${unlockedAchievements}`}
                  color="#facc15"
                />
                <MiniStat
                  label="XP hoje"
                  value={`+${customXpToday}`}
                  color={COLORS.custom}
                />
              </div>
            </div>
          </div>
        </motion.section>
      </section>

      <motion.section
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={8}
        className="rounded-lg border border-border/50 bg-card p-5"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-cyan-300" />
              <h3 className="text-base font-black text-foreground">Atalhos úteis</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Entradas rápidas e caminhos curtos para o que você mais usa.
            </p>
          </div>
          <span className="rounded-lg border border-border/60 bg-white/[0.03] px-3 py-2 text-xs font-bold text-muted-foreground">
            Nível {level} · {xp}/{xpToNextLevel} XP
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <QuickSurfaceButton
            label={`+${goals.glassSize} ml`}
            sublabel="água instantânea"
            icon={Droplets}
            color={COLORS.water}
            onClick={() => {
              addWaterEntry(goals.glassSize);
              toast.success(`+${goals.glassSize} ml de água`);
            }}
          />

          {fastingGoalReached ? (
            <QuickSurfaceButton
              label="Encerrar jejum"
              sublabel="meta já batida"
              icon={Flame}
              color={COLORS.fasting}
              onClick={async () => {
                await endFasting();
                toast.success("Jejum encerrado");
              }}
            />
          ) : !activeFasting ? (
            <QuickSurfaceButton
              label="Iniciar 16:8"
              sublabel="jejum rápido"
              icon={Flame}
              color={COLORS.fasting}
              onClick={async () => {
                await startFasting({ durationHours: 16 });
                toast.success("Jejum de 16h iniciado");
              }}
            />
          ) : (
            <QuickLinkCard
              href="/jejum"
              label="Abrir jejum"
              sublabel="sessão ativa"
              icon={Flame}
              color={COLORS.fasting}
            />
          )}

          {quickLinks.map(item => (
            <QuickLinkCard
              key={item.href}
              href={item.href}
              label={item.label}
              sublabel={item.sublabel}
              icon={item.icon}
              color={item.color}
            />
          ))}
        </div>
      </motion.section>
    </div>
  );
}
type KpiCardProps = {
  custom: number;
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  color: string;
  progress?: number;
};

function KpiCard({
  custom,
  label,
  value,
  detail,
  icon: Icon,
  color,
  progress,
}: KpiCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={custom}
      className="rounded-lg border border-border/50 bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[1.3px] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-mono text-2xl font-black" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg border"
          style={{
            borderColor: `${color}45`,
            backgroundColor: `${color}16`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{detail}</p>
      {typeof progress === "number" && (
        <div className="mt-4 h-2 overflow-hidden rounded-md bg-white/5">
          <div
            className="h-full rounded-md transition-all"
            style={{ width: `${progress}%`, backgroundColor: color }}
          />
        </div>
      )}
    </motion.div>
  );
}

type SmartActionButtonProps = {
  action: SmartAction;
  compact: boolean;
};

function SmartActionButton({ action, compact }: SmartActionButtonProps) {
  const content = (
    <>
      <span>{action.actionLabel}</span>
      <ArrowRight className="h-3.5 w-3.5" />
    </>
  );

  if (action.onClick) {
    return (
      <button
        type="button"
        onClick={() => {
          void Promise.resolve(action.onClick?.()).catch(error =>
            console.error(error)
          );
        }}
        className={`inline-flex items-center justify-center gap-2 rounded-lg text-xs font-black text-background transition-opacity hover:opacity-90 ${compact ? "px-3 py-2" : "min-h-10 px-4 py-2"}`}
        style={{ backgroundColor: action.color }}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={action.href || "/"}>
      <span
        className={`inline-flex items-center justify-center gap-2 rounded-lg text-xs font-black text-background transition-opacity hover:opacity-90 ${compact ? "px-3 py-2" : "min-h-10 px-4 py-2"}`}
        style={{ backgroundColor: action.color }}
      >
        {content}
      </span>
    </Link>
  );
}

function PendingRow({ action }: { action: SmartAction }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/30 p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
          style={{
            borderColor: `${action.color}45`,
            backgroundColor: `${action.color}15`,
          }}
        >
          <action.icon className="h-4 w-4" style={{ color: action.color }} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-foreground">
            {action.title}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {action.detail}
          </p>
        </div>
      </div>
      <SmartActionButton action={action} compact />
    </div>
  );
}

function MetricPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-secondary/20 px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-black" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/30 px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-black" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function QuickLinkCard({
  href,
  label,
  sublabel,
  icon: Icon,
  color,
}: {
  href: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <Link href={href}>
      <span className="flex min-h-[84px] items-center justify-between gap-3 rounded-lg border border-border/50 bg-secondary/20 p-4 transition-colors hover:border-border/80">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
          style={{
            borderColor: `${color}45`,
            backgroundColor: `${color}16`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </span>
    </Link>
  );
}

function QuickSurfaceButton({
  label,
  sublabel,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  sublabel: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void Promise.resolve(onClick()).catch(error => console.error(error));
      }}
      className="flex min-h-[84px] items-center justify-between gap-3 rounded-lg border border-border/50 bg-secondary/20 p-4 text-left transition-colors hover:border-border/80"
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
      </div>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
        style={{
          borderColor: `${color}45`,
          backgroundColor: `${color}16`,
        }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
    </button>
  );
}
