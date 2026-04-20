import { ReactNode, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { Link, useLocation } from "wouter";
import { isCustomHabitComplete, useHabits } from "@/contexts/HabitsContext";
import { cn } from "@/lib/utils";
import { Calendar as DateCalendar, CalendarDayButton } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  LayoutDashboard,
  Droplets,
  Dumbbell,
  UtensilsCrossed,
  Moon,
  Weight,
  ListChecks,
  BarChart3,
  Trophy,
  User,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Zap,
  Camera,
  Timer,
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/agua", label: "Água", icon: Droplets },
  { path: "/treinos", label: "Treinos", icon: Dumbbell },
  { path: "/alimentacao", label: "Alimentação", icon: UtensilsCrossed },
  { path: "/sono", label: "Sono", icon: Moon },
  { path: "/peso", label: "Peso", icon: Weight },
  { path: "/habitos", label: "Hábitos", icon: ListChecks },
  { path: "/relatorio", label: "Relatório", icon: BarChart3 },
  { path: "/jejum", label: "Jejum", icon: Timer },
  { path: "/progresso", label: "Progresso", icon: Camera },
  { path: "/conquistas", label: "Conquistas", icon: Trophy },
  { path: "/perfil", label: "Perfil", icon: User },
];

const PAGE_COLORS: Record<string, string> = {
  "/": "#22d3ee",
  "/agua": "#22d3ee",
  "/treinos": "#f97316",
  "/alimentacao": "#84cc16",
  "/sono": "#818cf8",
  "/peso": "#f97316",
  "/habitos": "#22c55e",
  "/relatorio": "#f59e0b",
  "/conquistas": "#f59e0b",
  "/progresso": "#22c55e",
  "/jejum": "#22c55e",
  "/perfil": "#22c55e",
};

const XP_COLOR = "#84cc16";
type DayStatus = "completed" | "partial" | "empty";

function formatDateBR(date: Date): string {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const day = days[date.getDay()];
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}, ${d}/${m}`;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DateStatusButton({
  status,
  className,
  ...props
}: ComponentProps<typeof CalendarDayButton> & {
  status?: DayStatus;
}) {
  return (
    <CalendarDayButton
      {...props}
      className={cn(
        className,
        status
          ? "relative overflow-visible after:absolute after:-bottom-0.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:content-['']"
          : "",
        status === "completed" && "after:bg-emerald-400",
        status === "partial" && "after:bg-amber-400",
        status === "empty" && "after:bg-red-400"
      )}
    />
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const [showNavFadeLeft, setShowNavFadeLeft] = useState(false);
  const [showNavFadeRight, setShowNavFadeRight] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const {
    currentDate,
    setCurrentDate,
    xp,
    level,
    xpToNextLevel,
    waterEntries,
    workoutEntries,
    foodEntries,
    sleepEntries,
    weightEntries,
    fastingSessions,
    customHabits,
    customHabitLogs,
    goals,
  } = useHabits();

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    const today = new Date();
    if (d <= today) setCurrentDate(d);
  };

  const pageColor = PAGE_COLORS[location] || PAGE_COLORS["/"];
  const xpForCurrentLevel = Math.max(0, (level - 1) * 100);
  const xpNeededThisLevel = Math.max(1, xpToNextLevel - xpForCurrentLevel);
  const xpProgressPercent = Math.min(
    100,
    Math.max(0, ((xp - xpForCurrentLevel) / xpNeededThisLevel) * 100)
  );
  const dayStatusMap = useMemo(() => {
    const activeCustomHabits = customHabits.filter(habit => habit.isActive);
    const totalHabits = 4 + activeCustomHabits.length;
    const signalDates = Array.from(
      new Set<string>([
      ...waterEntries.map(entry => entry.date),
      ...workoutEntries.map(entry => entry.date),
      ...foodEntries.map(entry => entry.date),
      ...sleepEntries.map(entry => entry.date),
      ...weightEntries.map(entry => entry.date),
      ...customHabitLogs.map(entry => entry.date),
      ...fastingSessions.flatMap(session => {
        const dates = [formatDateKey(new Date(session.startTime))];
        if (session.endTime) dates.push(formatDateKey(new Date(session.endTime)));
        return dates;
      }),
      ])
    ).sort();
    const nextStatusMap = new Map<string, DayStatus>();

    if (signalDates.length === 0) return nextStatusMap;

    const cursor = new Date(`${signalDates[0]}T12:00:00`);
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    while (cursor <= today) {
      const dateKey = formatDateKey(cursor);
      const waterTotal = waterEntries
        .filter(entry => entry.date === dateKey)
        .reduce((sum, entry) => sum + entry.amount, 0);
      const workoutTotal = workoutEntries
        .filter(entry => entry.date === dateKey)
        .reduce((sum, entry) => sum + entry.duration, 0);
      const caloriesTotal = foodEntries
        .filter(entry => entry.date === dateKey)
        .reduce((sum, entry) => sum + entry.calories, 0);
      const hasSleep = sleepEntries.some(entry => entry.date === dateKey);
      const dayCustomLogs = customHabitLogs.filter(entry => entry.date === dateKey);
      const customCompleted = activeCustomHabits.map(habit => {
        const log = dayCustomLogs.find(entry => entry.habitId === habit.id);
        return isCustomHabitComplete(habit, log);
      });
      const completedCount = [
        waterTotal >= goals.water,
        workoutTotal >= goals.workoutMinutes,
        caloriesTotal > 0 && caloriesTotal <= goals.calories,
        hasSleep,
        ...customCompleted,
      ].filter(Boolean).length;
      const usedSignals = [
        waterTotal > 0,
        workoutTotal > 0,
        caloriesTotal > 0,
        hasSleep,
        weightEntries.some(entry => entry.date === dateKey),
        dayCustomLogs.length > 0,
        fastingSessions.some(session => {
          const startKey = formatDateKey(new Date(session.startTime));
          const endKey = session.endTime
            ? formatDateKey(new Date(session.endTime))
            : null;
          return startKey === dateKey || endKey === dateKey;
        }),
      ];

      if (completedCount === totalHabits) {
        nextStatusMap.set(dateKey, "completed");
      } else if (usedSignals.some(Boolean)) {
        nextStatusMap.set(dateKey, "partial");
      } else {
        nextStatusMap.set(dateKey, "empty");
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return nextStatusMap;
  }, [
    customHabitLogs,
    customHabits,
    fastingSessions,
    foodEntries,
    goals.calories,
    goals.water,
    goals.workoutMinutes,
    sleepEntries,
    waterEntries,
    weightEntries,
    workoutEntries,
  ]);
  const completedDates = useMemo(
    () =>
      Array.from(dayStatusMap.entries())
        .filter(([, status]) => status === "completed")
        .map(([date]) => new Date(`${date}T12:00:00`)),
    [dayStatusMap]
  );
  const partialDates = useMemo(
    () =>
      Array.from(dayStatusMap.entries())
        .filter(([, status]) => status === "partial")
        .map(([date]) => new Date(`${date}T12:00:00`)),
    [dayStatusMap]
  );
  const emptyDates = useMemo(
    () =>
      Array.from(dayStatusMap.entries())
        .filter(([, status]) => status === "empty")
        .map(([date]) => new Date(`${date}T12:00:00`)),
    [dayStatusMap]
  );

  useEffect(() => {
    const element = navScrollRef.current;
    if (!element) return;

    const updateNavFades = () => {
      const maxScrollLeft = element.scrollWidth - element.clientWidth;
      setShowNavFadeLeft(element.scrollLeft > 8);
      setShowNavFadeRight(maxScrollLeft - element.scrollLeft > 8);
    };

    const activeItem = element.querySelector<HTMLElement>("[data-nav-active='true']");
    if (activeItem) {
      const useSmoothScroll =
        typeof window !== "undefined" &&
        !window.matchMedia("(max-width: 768px), (prefers-reduced-motion: reduce)").matches;
      activeItem.scrollIntoView({
        behavior: useSmoothScroll ? "smooth" : "auto",
        block: "nearest",
        inline: "center",
      });
    }

    updateNavFades();
    element.addEventListener("scroll", updateNavFades, { passive: true });
    window.addEventListener("resize", updateNavFades);

    return () => {
      element.removeEventListener("scroll", updateNavFades);
      window.removeEventListener("resize", updateNavFades);
    };
  }, [location]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(min-width: 640px)");
    const sync = () => setIsDesktopViewport(media.matches);

    sync();
    media.addEventListener("change", sync);

    return () => media.removeEventListener("change", sync);
  }, []);

  const renderDatePickerControl = () => (
    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-1 transition-colors hover:bg-white/[0.04]"
        >
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="whitespace-nowrap text-[12px] font-semibold sm:text-[13px]">
            {formatDateBR(currentDate)}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-auto overflow-hidden rounded-xl border-border bg-card p-0"
      >
        <div className="border-b border-border/70 px-4 py-3">
          <p className="text-sm font-bold text-foreground">Escolha o dia</p>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Dia completo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Parcial
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              Sem rotina
            </span>
          </div>
        </div>
        <DateCalendar
          mode="single"
          selected={currentDate}
          month={currentDate}
          onSelect={date => {
            if (!date) return;
            setCurrentDate(date);
            setIsDatePickerOpen(false);
          }}
          disabled={date => date > new Date()}
          modifiers={{
            completed: completedDates,
            partial: partialDates,
            empty: emptyDates,
          }}
          components={{
            DayButton: props => (
              <DateStatusButton
                {...props}
                status={dayStatusMap.get(formatDateKey(props.day.date))}
              />
            ),
          }}
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="px-5">
          <div className="flex min-h-[54px] flex-wrap items-center justify-between gap-3 py-3 sm:h-[54px] sm:flex-nowrap sm:py-0">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex shrink-0 items-center gap-2">
                <div
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] transition-all duration-500"
                  style={{
                    background: `linear-gradient(135deg, ${pageColor}, ${pageColor}99)`,
                  }}
                >
                  <Zap className="h-4 w-4 text-background" fill="currentColor" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-[17px] font-black leading-none">
                    <span className="text-foreground">Fit</span>
                    <span
                      className="transition-colors duration-500"
                      style={{ color: pageColor }}
                    >
                      Life
                    </span>
                  </h1>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-2 border-l border-border pl-3">
                <div className="relative shrink-0">
                  <div
                    className="flex h-[28px] items-center justify-center gap-1 rounded-lg px-[9px] text-xs font-extrabold"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.07)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#e2e8f0",
                    }}
                  >
                    {level}
                    <Zap className="h-2.5 w-2.5" style={{ color: XP_COLOR }} fill={XP_COLOR} />
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground sm:text-[11px]">
                    {xp} XP
                  </span>
                  <div
                    className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-full sm:max-w-[90px]"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.07)" }}
                  >
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${xpProgressPercent}%` }}
                      className="h-full"
                      style={{
                        background: `linear-gradient(90deg, ${pageColor}, ${XP_COLOR})`,
                      }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {xpToNextLevel}
                    <span className="hidden sm:inline"> XP</span>
                  </span>
                </div>
              </div>
            </div>

            {isDesktopViewport ? (
            <div className="min-w-0 items-center justify-end sm:flex">
              <div className="flex items-center gap-1 rounded-[10px] border border-border bg-white/[0.04] px-2 py-1">
                <button
                  onClick={prevDay}
                  className="rounded px-1 text-[15px] leading-none text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {renderDatePickerControl()}
                <button
                  onClick={nextDay}
                  className="rounded px-1 text-[15px] leading-none text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            ) : null}

            {!isDesktopViewport ? (
            <div className="flex w-full items-center justify-end sm:hidden">
              <div className="flex items-center gap-1 rounded-[10px] border border-border bg-white/[0.04] px-2 py-1">
                <button
                  onClick={prevDay}
                  className="rounded px-1 text-[15px] leading-none text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {renderDatePickerControl()}
                <button
                  onClick={nextDay}
                  className="rounded px-1 text-[15px] leading-none text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            ) : null}
          </div>
        </div>

        <div className="relative border-t border-border">
          <div
            ref={navScrollRef}
            className="overflow-x-auto px-3.5 [scrollbar-width:none] sm:[scrollbar-width:auto] [&::-webkit-scrollbar]:hidden sm:[&::-webkit-scrollbar]:block"
          >
            <nav className="-mb-px flex gap-0 pb-0 sm:snap-none snap-x snap-mandatory">
            {navItems.map((item) => {
              const isActive = location === item.path;
              const Icon = item.icon;
              const itemColor = PAGE_COLORS[item.path] || PAGE_COLORS["/"];
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    data-nav-active={isActive ? "true" : "false"}
                    className={`relative snap-start flex items-center gap-1.5 whitespace-nowrap px-[13px] py-2.5 text-[13px] transition-colors ${
                      isActive ? "font-bold" : "font-medium text-muted-foreground hover:text-foreground"
                    }`}
                    style={isActive ? { color: itemColor } : undefined}
                  >
                    <Icon className="h-[15px] w-[15px]" />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                        style={{ backgroundColor: itemColor }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                  </div>
                </Link>
              );
            })}
            </nav>
          </div>
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent transition-opacity sm:hidden",
              showNavFadeLeft ? "opacity-100" : "opacity-0"
            )}
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent transition-opacity sm:hidden",
              showNavFadeRight ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
      </header>

      <main className="fitlife-shell py-7">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
