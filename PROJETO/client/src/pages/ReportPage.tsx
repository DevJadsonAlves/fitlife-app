import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CUSTOM_HABIT_CATEGORIES,
  isCustomHabitComplete,
  useHabits,
} from "@/contexts/HabitsContext";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  ChevronDown,
  Droplets,
  Dumbbell,
  Flame,
  ListChecks,
  Minus,
  Moon,
  Scale,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type RangeOption = 7 | 30 | 90;
type TrendDirection = "up" | "down" | "stable";
type SectionKey =
  | "water"
  | "workout"
  | "food"
  | "sleep"
  | "weight"
  | "fasting"
  | "custom";

type TrendMeta = {
  direction: TrendDirection;
  label: string;
  detail: string;
};

type DayPoint = {
  dateStr: string;
  label: string;
};

type HabitMetric = {
  label: string;
  value: string;
};

type ReportSection = {
  key: SectionKey;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  primary: string;
  secondary: string;
  trend: TrendMeta;
  metrics: HabitMetric[];
  miniValues: number[];
  miniMax: number;
  children?: ReactNode;
};

const RANGE_OPTIONS: RangeOption[] = [7, 30, 90];

const COLORS = {
  water: "#22d3ee",
  workout: "#f97316",
  food: "#84cc16",
  sleep: "#818cf8",
  weight: "#f59e0b",
  fasting: "#ef4444",
  custom: "#14b8a6",
};

const DEFAULT_EXPANDED: Record<SectionKey, boolean> = {
  water: true,
  workout: false,
  food: false,
  sleep: false,
  weight: false,
  fasting: false,
  custom: false,
};

function getDaysArray(range: number, baseDate: Date): DayPoint[] {
  const days: DayPoint[] = [];

  for (let i = range - 1; i >= 0; i -= 1) {
    const date = new Date(baseDate);
    date.setHours(12, 0, 0, 0);
    date.setDate(baseDate.getDate() - i);

    const dateStr = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    days.push({
      dateStr,
      label: `${String(date.getDate()).padStart(2, "0")}/${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`,
    });
  }

  return days;
}

function getDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getTimestamp(entry: { created_at?: string; date?: string }): number {
  const source =
    entry.created_at || (entry.date ? `${entry.date}T23:59:59.999` : "");
  const timestamp = Date.parse(source);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toPercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function getTrendMeta(
  currentValue: number,
  previousValue: number,
  unit = "pts"
): TrendMeta {
  const delta = currentValue - previousValue;

  if (Math.abs(delta) < 3) {
    return {
      direction: "stable",
      label: "Estavel",
      detail: `${Math.abs(delta).toFixed(0)} ${unit} de variacao`,
    };
  }

  if (delta > 0) {
    return {
      direction: "up",
      label: "Subindo",
      detail: `+${delta.toFixed(0)} ${unit} no recorte`,
    };
  }

  return {
    direction: "down",
    label: "Caindo",
    detail: `${delta.toFixed(0)} ${unit} no recorte`,
  };
}

function getBestStreak(flags: boolean[]): number {
  let best = 0;
  let current = 0;

  for (const flag of flags) {
    if (flag) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }

  return best;
}

function formatHours(value: number): string {
  if (value <= 0) return "0h";
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);

  if (minutes === 0) return `${hours}h`;
  if (hours === 0) return `${minutes}min`;

  return `${hours}h ${minutes}min`;
}

function formatSignedWeight(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}kg`;
}

function TrendBadge({ trend }: { trend: TrendMeta }) {
  const Icon =
    trend.direction === "up"
      ? TrendingUp
      : trend.direction === "down"
        ? TrendingDown
        : Minus;
  const colorClass =
    trend.direction === "up"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : trend.direction === "down"
        ? "border-red-500/30 bg-red-500/10 text-red-300"
        : "border-border/50 bg-secondary/20 text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${colorClass}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {trend.label}
    </span>
  );
}

function MiniBars({
  values,
  maxValue,
  color,
}: {
  values: number[];
  maxValue: number;
  color: string;
}) {
  return (
    <div className="flex h-10 items-end gap-1">
      {values.map((value, index) => {
        const height =
          maxValue <= 0
            ? 10
            : Math.max(10, Math.round((value / maxValue) * 100));

        return (
          <div
            key={`${index}-${value}`}
            className="min-w-0 flex-1 rounded-full bg-secondary/30"
          >
            <div
              className="w-full rounded-full transition-all"
              style={{
                backgroundColor: color,
                height: `${height}%`,
                opacity: value > 0 ? 0.95 : 0.2,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-secondary/10 px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function SecondaryChartsPanel({
  isDesktop,
  open,
  onOpenChange,
  children,
}: {
  isDesktop: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const isOpen = isDesktop || open;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={nextOpen => {
        if (!isDesktop) onOpenChange(nextOpen);
      }}
      className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-300" />
            <h3 className="font-bold text-foreground">Graficos secundarios</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Peso, agua, calorias e sono em leitura mais aberta quando voce quiser
            aprofundar.
          </p>
        </div>

        {!isDesktop ? (
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-border/60 px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-amber-400/50 hover:text-foreground"
            >
              {open ? "Esconder" : "Ver graficos"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
        ) : null}
      </div>

      <CollapsibleContent className="pt-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function SectionCard({
  section,
  isDesktop,
  expanded,
  onToggle,
}: {
  section: ReportSection;
  isDesktop: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = section.icon;
  const shouldShowContent = isDesktop || expanded;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" style={{ color: section.color }} />
            <h3 className="font-bold text-foreground">{section.title}</h3>
          </div>
          <p className="mt-1 text-lg font-black text-foreground">
            {section.primary}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {section.secondary}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <TrendBadge trend={section.trend} />
          {!isDesktop ? (
            <ChevronDown
              className={`mt-0.5 h-4 w-4 text-muted-foreground transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          ) : null}
        </div>
      </button>

      {shouldShowContent ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {section.metrics.map(metric => (
              <div
                key={metric.label}
                className="rounded-xl border border-border/50 bg-secondary/15 p-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-2 text-base font-black text-foreground">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border/50 bg-secondary/15 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Tendencia do periodo
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {section.trend.detail}
            </p>
            <div className="mt-4">
              <MiniBars
                values={section.miniValues}
                maxValue={section.miniMax}
                color={section.color}
              />
            </div>
          </div>

          {section.children}
        </div>
      ) : null}
    </motion.section>
  );
}

export default function ReportPage() {
  const {
    waterEntries,
    workoutEntries,
    foodEntries,
    sleepEntries,
    weightEntries,
    fastingSessions,
    customHabits,
    customHabitLogs,
    goals,
    currentDate,
  } = useHabits();

  const [range, setRange] = useState<RangeOption>(7);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showSecondaryCharts, setShowSecondaryCharts] = useState(false);
  const [expandedSections, setExpandedSections] =
    useState<Record<SectionKey, boolean>>(DEFAULT_EXPANDED);

  const handleSectionToggle = (key: SectionKey) => {
    setExpandedSections(prev => {
      if (isDesktop) {
        return { ...prev, [key]: !prev[key] };
      }

      const next = Object.keys(prev).reduce(
        (acc, currentKey) => {
          acc[currentKey as SectionKey] = false;
          return acc;
        },
        {} as Record<SectionKey, boolean>
      );

      if (!prev[key]) next[key] = true;
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setIsDesktop(media.matches);
      if (media.matches) setShowSecondaryCharts(true);
    };

    sync();
    media.addEventListener("change", sync);

    return () => media.removeEventListener("change", sync);
  }, []);

  const days = useMemo(
    () => getDaysArray(range, currentDate),
    [currentDate, range]
  );
  const daySet = useMemo(() => new Set(days.map(day => day.dateStr)), [days]);
  const activeCustomHabits = useMemo(
    () => customHabits.filter(habit => habit.isActive),
    [customHabits]
  );

  const customLogMap = useMemo(() => {
    const map = new Map<string, (typeof customHabitLogs)[number]>();

    customHabitLogs.forEach(log => {
      const key = `${log.habitId}:${log.date}`;
      const current = map.get(key);

      if (!current || getTimestamp(log) >= getTimestamp(current)) {
        map.set(key, log);
      }
    });

    return map;
  }, [customHabitLogs]);

  const completedFastingSessions = useMemo(
    () =>
      fastingSessions.filter(
        session =>
          !session.isActive &&
          !!session.endTime &&
          daySet.has(getDateKey(session.endTime))
      ),
    [daySet, fastingSessions]
  );

  const successfulFastingSessions = useMemo(
    () =>
      completedFastingSessions.filter(session => {
        if (!session.endTime) return false;

        const elapsedHours =
          (new Date(session.endTime).getTime() -
            new Date(session.startTime).getTime()) /
          (1000 * 60 * 60);

        return elapsedHours >= session.targetDuration;
      }),
    [completedFastingSessions]
  );

  const dailyData = useMemo(() => {
    return days.map(day => {
      const waterTotal = waterEntries
        .filter(entry => entry.date === day.dateStr)
        .reduce((sum, entry) => sum + entry.amount, 0);

      const workoutMinutes = workoutEntries
        .filter(entry => entry.date === day.dateStr)
        .reduce((sum, entry) => sum + entry.duration, 0);

      const caloriesTotal = foodEntries
        .filter(entry => entry.date === day.dateStr)
        .reduce((sum, entry) => sum + entry.calories, 0);

      const sleepForDay = sleepEntries
        .filter(entry => entry.date === day.dateStr)
        .sort((left, right) => getTimestamp(right) - getTimestamp(left))[0];

      const sleepHours = sleepForDay?.duration ?? 0;

      const fastingAttempts = completedFastingSessions.filter(
        session =>
          session.endTime && getDateKey(session.endTime) === day.dateStr
      );

      const successfulFasts = successfulFastingSessions.filter(
        session =>
          session.endTime && getDateKey(session.endTime) === day.dateStr
      );

      const customCompletedCount = activeCustomHabits.reduce((sum, habit) => {
        const log = customLogMap.get(`${habit.id}:${day.dateStr}`);
        return sum + (isCustomHabitComplete(habit, log) ? 1 : 0);
      }, 0);

      const customExpectedCount = activeCustomHabits.length;
      const customCompletionRate =
        customExpectedCount === 0
          ? 0
          : Math.round((customCompletedCount / customExpectedCount) * 100);

      const waterDone = waterTotal >= goals.water;
      const workoutDone = workoutMinutes >= goals.workoutMinutes;
      const foodDone = caloriesTotal > 0 && caloriesTotal <= goals.calories;
      const sleepDone = Boolean(sleepForDay);
      const fastingScore =
        fastingAttempts.length > 0
          ? (successfulFasts.length / fastingAttempts.length) * 100
          : null;

      const scoreInputs = [
        waterDone ? 100 : 0,
        workoutDone ? 100 : 0,
        foodDone ? 100 : 0,
        sleepDone ? 100 : 0,
        ...(fastingScore === null ? [] : [fastingScore]),
        ...(customExpectedCount > 0 ? [customCompletionRate] : []),
      ];

      return {
        ...day,
        waterTotal,
        workoutMinutes,
        caloriesTotal,
        sleepHours,
        fastingAttempts: fastingAttempts.length,
        successfulFasts: successfulFasts.length,
        customCompletedCount,
        customExpectedCount,
        customCompletionRate,
        waterDone,
        workoutDone,
        foodDone,
        sleepDone,
        fastingDone: successfulFasts.length > 0,
        customAllDone:
          customExpectedCount > 0 &&
          customCompletedCount === customExpectedCount,
        dayScore: average(scoreInputs),
      };
    });
  }, [
    activeCustomHabits,
    completedFastingSessions,
    customLogMap,
    days,
    foodEntries,
    goals.calories,
    goals.water,
    goals.workoutMinutes,
    sleepEntries,
    successfulFastingSessions,
    waterEntries,
    workoutEntries,
  ]);

  const splitIndex = Math.max(1, Math.floor(dailyData.length / 2));
  const firstHalf = dailyData.slice(0, splitIndex);
  const secondHalf = dailyData.slice(splitIndex);

  const waterConsistency = toPercent(
    dailyData.filter(day => day.waterDone).length,
    dailyData.length
  );
  const workoutConsistency = toPercent(
    dailyData.filter(day => day.workoutDone).length,
    dailyData.length
  );
  const foodConsistency = toPercent(
    dailyData.filter(day => day.foodDone).length,
    dailyData.length
  );
  const sleepConsistency = toPercent(
    dailyData.filter(day => day.sleepDone).length,
    dailyData.length
  );
  const fastingConsistency =
    completedFastingSessions.length === 0
      ? 0
      : toPercent(
          successfulFastingSessions.length,
          completedFastingSessions.length
        );

  const customCompletionTotal = dailyData.reduce(
    (sum, day) => sum + day.customCompletedCount,
    0
  );
  const customExpectedTotal = dailyData.reduce(
    (sum, day) => sum + day.customExpectedCount,
    0
  );
  const customConsistency =
    customExpectedTotal === 0
      ? 0
      : toPercent(customCompletionTotal, customExpectedTotal);

  const consistencyInputs = [
    waterConsistency,
    workoutConsistency,
    foodConsistency,
    sleepConsistency,
    fastingConsistency,
    ...(activeCustomHabits.length > 0 ? [customConsistency] : []),
  ];
  const overallConsistency = Math.round(average(consistencyInputs));

  const totalCheckpointHits =
    dailyData.filter(day => day.waterDone).length +
    dailyData.filter(day => day.workoutDone).length +
    dailyData.filter(day => day.foodDone).length +
    dailyData.filter(day => day.sleepDone).length +
    successfulFastingSessions.length +
    customCompletionTotal;
  const totalCheckpointOpportunities =
    dailyData.length * 4 +
    completedFastingSessions.length +
    customExpectedTotal;

  const dailyFlags = {
    water: dailyData.map(day => day.waterDone),
    workout: dailyData.map(day => day.workoutDone),
    food: dailyData.map(day => day.foodDone),
    sleep: dailyData.map(day => day.sleepDone),
    fasting: dailyData.map(day => day.fastingDone),
    custom: activeCustomHabits.length
      ? dailyData.map(day => day.customAllDone)
      : [],
  };

  const streakCandidates = [
    { label: "Agua", days: getBestStreak(dailyFlags.water) },
    { label: "Treino", days: getBestStreak(dailyFlags.workout) },
    { label: "Alimentacao", days: getBestStreak(dailyFlags.food) },
    { label: "Sono", days: getBestStreak(dailyFlags.sleep) },
    { label: "Jejum", days: getBestStreak(dailyFlags.fasting) },
    ...(activeCustomHabits.length
      ? [{ label: "Habitos", days: getBestStreak(dailyFlags.custom) }]
      : []),
  ].sort((left, right) => right.days - left.days);
  const bestStreak = streakCandidates[0];

  const overallTrend = getTrendMeta(
    average(secondHalf.map(day => day.dayScore)),
    average(firstHalf.map(day => day.dayScore))
  );

  const consistencyByHabit = [
    { label: "Agua", value: waterConsistency },
    { label: "Treino", value: workoutConsistency },
    { label: "Alimentacao", value: foodConsistency },
    { label: "Sono", value: sleepConsistency },
    { label: "Jejum", value: fastingConsistency },
    ...(activeCustomHabits.length
      ? [{ label: "Habitos", value: customConsistency }]
      : []),
  ];
  const bestHabit = [...consistencyByHabit].sort(
    (left, right) => right.value - left.value
  )[0];
  const mostFragileHabit = [...consistencyByHabit].sort(
    (left, right) => left.value - right.value
  )[0];

  const waterAverage = Math.round(
    average(dailyData.map(day => day.waterTotal))
  );
  const waterTrend = getTrendMeta(
    average(secondHalf.map(day => day.waterTotal)),
    average(firstHalf.map(day => day.waterTotal)),
    "ml"
  );

  const workoutDays = dailyData.filter(day => day.workoutMinutes > 0).length;
  const workoutTotalMinutes = dailyData.reduce(
    (sum, day) => sum + day.workoutMinutes,
    0
  );
  const workoutAverageMinutes =
    workoutDays === 0 ? 0 : Math.round(workoutTotalMinutes / workoutDays);
  const workoutTrend = getTrendMeta(
    average(secondHalf.map(day => day.workoutMinutes)),
    average(firstHalf.map(day => day.workoutMinutes)),
    "min"
  );

  const caloriesWithFood = dailyData.filter(day => day.caloriesTotal > 0);
  const averageCalories = caloriesWithFood.length
    ? Math.round(
        caloriesWithFood.reduce((sum, day) => sum + day.caloriesTotal, 0) /
          caloriesWithFood.length
      )
    : 0;
  const aboveGoalDays = dailyData.filter(
    day => day.caloriesTotal > goals.calories
  ).length;
  const foodTrend = getTrendMeta(
    average(secondHalf.map(day => day.caloriesTotal)),
    average(firstHalf.map(day => day.caloriesTotal)),
    "kcal"
  );

  const sleepDays = dailyData.filter(day => day.sleepHours > 0);
  const averageSleep = average(sleepDays.map(day => day.sleepHours));
  const bestSleep = sleepDays.length
    ? Math.max(...sleepDays.map(day => day.sleepHours))
    : 0;
  const worstSleep = sleepDays.length
    ? Math.min(...sleepDays.map(day => day.sleepHours))
    : 0;
  const sleepTrend = getTrendMeta(
    average(secondHalf.map(day => day.sleepHours)),
    average(firstHalf.map(day => day.sleepHours)),
    "h"
  );

  const weightPoints = useMemo(() => {
    const latestByDay = new Map<string, (typeof weightEntries)[number]>();

    weightEntries.forEach(entry => {
      if (!daySet.has(entry.date)) return;
      const current = latestByDay.get(entry.date);
      if (!current || getTimestamp(entry) >= getTimestamp(current)) {
        latestByDay.set(entry.date, entry);
      }
    });

    return Array.from(latestByDay.values())
      .sort((left, right) => left.date.localeCompare(right.date))
      .map(entry => ({
        date: entry.date,
        label: entry.date.slice(5).split("-").reverse().join("/"),
        weight: entry.weight,
      }));
  }, [daySet, weightEntries]);

  const weightDelta =
    weightPoints.length >= 2
      ? weightPoints[weightPoints.length - 1].weight - weightPoints[0].weight
      : null;
  const weightTrend = getTrendMeta(
    weightPoints.length >= 2 ? weightPoints[weightPoints.length - 1].weight : 0,
    weightPoints.length >= 2 ? weightPoints[0].weight : 0,
    "kg"
  );

  const fastingDurations = completedFastingSessions.map(session => {
    const endTime = session.endTime ? new Date(session.endTime).getTime() : 0;
    const startTime = new Date(session.startTime).getTime();
    return Math.max(0, (endTime - startTime) / (1000 * 60 * 60));
  });
  const averageFast = average(fastingDurations);
  const bestFast = fastingDurations.length ? Math.max(...fastingDurations) : 0;
  const fastingTrend = getTrendMeta(
    average(
      secondHalf.map(day =>
        day.fastingAttempts
          ? (day.successfulFasts / day.fastingAttempts) * 100
          : 0
      )
    ),
    average(
      firstHalf.map(day =>
        day.fastingAttempts
          ? (day.successfulFasts / day.fastingAttempts) * 100
          : 0
      )
    )
  );

  const customXpPeriod = dailyData.reduce((sum, day) => {
    return (
      sum +
      activeCustomHabits.reduce((habitSum, habit) => {
        const log = customLogMap.get(`${habit.id}:${day.dateStr}`);
        return habitSum + (isCustomHabitComplete(habit, log) ? habit.xp : 0);
      }, 0)
    );
  }, 0);

  const customCategoryStats = Object.entries(CUSTOM_HABIT_CATEGORIES)
    .map(([category, meta]) => {
      const habits = activeCustomHabits.filter(
        habit => habit.category === category
      );
      const opportunities = habits.length * days.length;
      const completions = dailyData.reduce((sum, day) => {
        return (
          sum +
          habits.reduce((habitSum, habit) => {
            const log = customLogMap.get(`${habit.id}:${day.dateStr}`);
            return habitSum + (isCustomHabitComplete(habit, log) ? 1 : 0);
          }, 0)
        );
      }, 0);

      return {
        category,
        label: meta.label,
        color: meta.color,
        habits: habits.length,
        completions,
        opportunities,
        rate: opportunities === 0 ? 0 : toPercent(completions, opportunities),
      };
    })
    .filter(item => item.habits > 0)
    .sort((left, right) => right.rate - left.rate);

  const topCustomCategory = customCategoryStats[0];

  const insights = [
    {
      title: "Melhor aderencia",
      value: `${bestHabit.label} em ${bestHabit.value}%`,
      detail: "Esse foi o sistema mais consistente no periodo.",
      color: "text-emerald-300",
    },
    {
      title: "Mais instavel",
      value: `${mostFragileHabit.label} em ${mostFragileHabit.value}%`,
      detail: "Aqui existe a maior chance de melhorar seu painel inteiro.",
      color: "text-red-300",
    },
    {
      title: "Leitura geral",
      value: overallTrend.label,
      detail: overallTrend.detail,
      color:
        overallTrend.direction === "up"
          ? "text-emerald-300"
          : overallTrend.direction === "down"
            ? "text-red-300"
            : "text-slate-300",
    },
    {
      title: "Jejum",
      value:
        completedFastingSessions.length > 0
          ? `${formatHours(bestFast)} de melhor sessao`
          : "Sem jejum concluido",
      detail:
        completedFastingSessions.length > 0
          ? `${fastingConsistency}% das sessoes bateram a meta.`
          : "Quando voce fechar sessoes, elas entram aqui.",
      color: "text-red-300",
    },
    {
      title: "Habitos personalizados",
      value: topCustomCategory
        ? `${topCustomCategory.label} em ${topCustomCategory.rate}%`
        : "Nenhum habito ativo",
      detail: topCustomCategory
        ? "Categoria com melhor constancia no periodo."
        : "Ative habitos personalizados para entrar no painel.",
      color: "text-teal-300",
    },
  ];

  const sections: ReportSection[] = [
    {
      key: "water",
      title: "Agua",
      subtitle: "Meta e regularidade diaria",
      icon: Droplets,
      color: COLORS.water,
      primary: `${waterAverage}ml/dia`,
      secondary: `${dailyData.filter(day => day.waterDone).length}/${days.length} dias na meta`,
      trend: waterTrend,
      metrics: [
        { label: "Consistencia", value: `${waterConsistency}%` },
        { label: "Meta diaria", value: `${goals.water}ml` },
        {
          label: "Melhor dia",
          value: `${Math.max(...dailyData.map(day => day.waterTotal), 0)}ml`,
        },
        { label: "Media", value: `${waterAverage}ml` },
      ],
      miniValues: dailyData.map(day => day.waterTotal),
      miniMax: Math.max(
        goals.water,
        ...dailyData.map(day => day.waterTotal),
        1
      ),
      children: (
        <p className="text-sm text-muted-foreground">
          Quanto mais perto da meta todos os dias, mais estavel fica sua semana.
        </p>
      ),
    },
    {
      key: "workout",
      title: "Treino",
      subtitle: "Dias ativos e volume",
      icon: Dumbbell,
      color: COLORS.workout,
      primary: `${workoutTotalMinutes} min`,
      secondary: `${workoutDays} dias treinados no recorte`,
      trend: workoutTrend,
      metrics: [
        { label: "Consistencia", value: `${workoutConsistency}%` },
        { label: "Media por dia", value: `${workoutAverageMinutes} min` },
        { label: "Meta diaria", value: `${goals.workoutMinutes} min` },
        {
          label: "Melhor dia",
          value: `${Math.max(...dailyData.map(day => day.workoutMinutes), 0)} min`,
        },
      ],
      miniValues: dailyData.map(day => day.workoutMinutes),
      miniMax: Math.max(
        goals.workoutMinutes,
        ...dailyData.map(day => day.workoutMinutes),
        1
      ),
    },
    {
      key: "food",
      title: "Alimentacao",
      subtitle: "Calorias sob controle",
      icon: UtensilsCrossed,
      color: COLORS.food,
      primary: `${averageCalories || 0} kcal/dia`,
      secondary: `${aboveGoalDays} dias acima da meta`,
      trend: foodTrend,
      metrics: [
        { label: "Consistencia", value: `${foodConsistency}%` },
        { label: "Meta diaria", value: `${goals.calories} kcal` },
        { label: "Dias registrados", value: `${caloriesWithFood.length}` },
        { label: "Acima da meta", value: `${aboveGoalDays} dias` },
      ],
      miniValues: dailyData.map(day => day.caloriesTotal),
      miniMax: Math.max(
        goals.calories,
        ...dailyData.map(day => day.caloriesTotal),
        1
      ),
    },
    {
      key: "sleep",
      title: "Sono",
      subtitle: "Presenca e regularidade",
      icon: Moon,
      color: COLORS.sleep,
      primary: `${averageSleep.toFixed(1)}h de media`,
      secondary: `${sleepDays.length} noites registradas`,
      trend: sleepTrend,
      metrics: [
        { label: "Consistencia", value: `${sleepConsistency}%` },
        {
          label: "Melhor noite",
          value: bestSleep ? `${bestSleep.toFixed(1)}h` : "--",
        },
        {
          label: "Pior noite",
          value: worstSleep ? `${worstSleep.toFixed(1)}h` : "--",
        },
        { label: "Meta alvo", value: `${goals.sleepHours}h` },
      ],
      miniValues: dailyData.map(day => day.sleepHours),
      miniMax: Math.max(
        goals.sleepHours,
        ...dailyData.map(day => day.sleepHours),
        1
      ),
    },
    {
      key: "weight",
      title: "Peso",
      subtitle: "Direcao do periodo",
      icon: Scale,
      color: COLORS.weight,
      primary: formatSignedWeight(weightDelta),
      secondary: `${weightPoints.length} registros usados no recorte`,
      trend: weightTrend,
      metrics: [
        { label: "Variacao", value: formatSignedWeight(weightDelta) },
        {
          label: "Inicio",
          value: weightPoints.length
            ? `${weightPoints[0].weight.toFixed(1)}kg`
            : "--",
        },
        {
          label: "Atual",
          value: weightPoints.length
            ? `${weightPoints[weightPoints.length - 1].weight.toFixed(1)}kg`
            : "--",
        },
        { label: "Meta", value: `${goals.weightGoal}kg` },
      ],
      miniValues: weightPoints.map(point => point.weight),
      miniMax:
        weightPoints.length > 0
          ? Math.max(...weightPoints.map(point => point.weight))
          : 1,
    },
    {
      key: "fasting",
      title: "Jejum",
      subtitle: "Aderencia das sessoes",
      icon: Flame,
      color: COLORS.fasting,
      primary: `${completedFastingSessions.length} sessoes`,
      secondary: `${fastingConsistency}% bateram a meta`,
      trend: fastingTrend,
      metrics: [
        { label: "Taxa de sucesso", value: `${fastingConsistency}%` },
        { label: "Media real", value: formatHours(averageFast) },
        { label: "Melhor jejum", value: formatHours(bestFast) },
        {
          label: "Sessoes concluidas",
          value: `${completedFastingSessions.length}`,
        },
      ],
      miniValues: dailyData.map(day => day.successfulFasts),
      miniMax: Math.max(1, ...dailyData.map(day => day.successfulFasts)),
    },
    {
      key: "custom",
      title: "Habitos personalizados",
      subtitle: "Constancia e XP",
      icon: ListChecks,
      color: COLORS.custom,
      primary: `${customXpPeriod} XP`,
      secondary: `${customCompletionTotal}/${customExpectedTotal || 0} checkpoints concluidos`,
      trend: getTrendMeta(
        average(secondHalf.map(day => day.customCompletionRate)),
        average(firstHalf.map(day => day.customCompletionRate))
      ),
      metrics: [
        { label: "Consistencia", value: `${customConsistency}%` },
        { label: "Habitos ativos", value: `${activeCustomHabits.length}` },
        { label: "XP no periodo", value: `${customXpPeriod}` },
        {
          label: "Melhor categoria",
          value: topCustomCategory ? topCustomCategory.label : "--",
        },
      ],
      miniValues: dailyData.map(day => day.customCompletionRate),
      miniMax: 100,
      children: topCustomCategory ? (
        <p className="text-sm text-muted-foreground">
          {topCustomCategory.label} lidera com {topCustomCategory.rate}% de
          constancia no periodo.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ative habitos personalizados para ganhar leitura por categoria aqui.
        </p>
      ),
    },
  ];

  const waterChartData = dailyData.map(day => ({
    date: day.label,
    total: day.waterTotal,
  }));
  const caloriesChartData = dailyData.map(day => ({
    date: day.label,
    total: day.caloriesTotal,
  }));
  const sleepChartData = dailyData.map(day => ({
    date: day.label,
    hours: day.sleepHours,
  }));

  return (
    <div className="space-y-5 pb-20">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" style={{ color: "#f59e0b" }} />
            <h2 className="text-2xl font-extrabold text-foreground">
              Relatorios 2.0
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Leitura compacta da sua consistencia, tendencias e sistemas que mais
            merecem atencao.
          </p>
        </div>

        <div className="flex w-full gap-1 rounded-xl border border-border/50 bg-secondary/20 p-1 sm:w-fit">
          {RANGE_OPTIONS.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:flex-none ${
                range === option
                  ? "bg-amber-400 text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option} dias
            </button>
          ))}
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-amber-300" />
          <h3 className="font-bold text-foreground">Resumo principal</h3>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Consistencia geral",
              value: `${overallConsistency}%`,
              detail: "Media consolidada dos sistemas monitorados.",
              color: "text-amber-300",
            },
            {
              label: "Metas batidas",
              value: `${totalCheckpointHits}/${totalCheckpointOpportunities || 0}`,
              detail: "Checkpoints concluidos no periodo.",
              color: "text-cyan-300",
            },
            {
              label: "Melhor sequencia",
              value: `${bestStreak.days} dias`,
              detail: bestStreak.days
                ? `${bestStreak.label} foi o melhor streak.`
                : "Sem sequencia forte ainda.",
              color: "text-emerald-300",
            },
            {
              label: "Tendencia geral",
              value: overallTrend.label,
              detail: overallTrend.detail,
              color:
                overallTrend.direction === "up"
                  ? "text-emerald-300"
                  : overallTrend.direction === "down"
                    ? "text-red-300"
                    : "text-slate-300",
            },
          ].map(card => (
            <div
              key={card.label}
              className="rounded-xl border border-border/50 bg-secondary/15 p-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {card.label}
              </p>
              <p className={`mt-3 text-2xl font-black ${card.color}`}>
                {card.value}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {card.detail}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-300" />
          <h3 className="font-bold text-foreground">Destaques inteligentes</h3>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {insights.map(item => (
            <div
              key={item.title}
              className="rounded-xl border border-border/50 bg-secondary/15 p-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {item.title}
              </p>
              <p className={`mt-2 text-base font-black ${item.color}`}>
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      <div className="space-y-3">
        {sections.map(section => (
          <SectionCard
            key={section.key}
            section={section}
            isDesktop={isDesktop}
            expanded={expandedSections[section.key]}
            onToggle={() => handleSectionToggle(section.key)}
          />
        ))}
      </div>

      <SecondaryChartsPanel
        isDesktop={isDesktop}
        open={showSecondaryCharts}
        onOpenChange={setShowSecondaryCharts}
      >
      <div className="grid gap-4 xl:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Droplets className="h-4 w-4" style={{ color: COLORS.water }} />
            <h3 className="font-bold text-foreground">Agua no periodo</h3>
          </div>

          {waterChartData.some(item => item.total > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={waterChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [
                    `${Math.round(value)}ml`,
                    "Agua",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={COLORS.water}
                  fill="rgba(34,211,238,0.12)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Sem dados de agua nesse recorte ainda." />
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <UtensilsCrossed
              className="h-4 w-4"
              style={{ color: COLORS.food }}
            />
            <h3 className="font-bold text-foreground">Calorias por dia</h3>
          </div>

          {caloriesChartData.some(item => item.total > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={caloriesChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [
                    `${Math.round(value)} kcal`,
                    "Calorias",
                  ]}
                />
                <Bar dataKey="total" fill={COLORS.food} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Sem refeicoes registradas nesse periodo." />
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Scale className="h-4 w-4" style={{ color: COLORS.weight }} />
            <h3 className="font-bold text-foreground">Linha de peso</h3>
          </div>

          {weightPoints.length >= 2 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weightPoints}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [
                    `${value.toFixed(1)}kg`,
                    "Peso",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke={COLORS.weight}
                  strokeWidth={2}
                  dot={{ fill: COLORS.weight, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Voce precisa de pelo menos dois registros de peso nesse recorte." />
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Moon className="h-4 w-4" style={{ color: COLORS.sleep }} />
            <h3 className="font-bold text-foreground">Sono no periodo</h3>
          </div>

          {sleepChartData.some(item => item.hours > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={sleepChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [
                    `${value.toFixed(1)}h`,
                    "Sono",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke={COLORS.sleep}
                  strokeWidth={2}
                  dot={{ fill: COLORS.sleep, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Sem noites registradas nesse periodo." />
          )}
        </motion.section>
      </div>
      </SecondaryChartsPanel>
    </div>
  );
}

