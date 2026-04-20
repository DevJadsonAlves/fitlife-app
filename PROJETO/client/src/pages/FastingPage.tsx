import { useEffect, useMemo, useState } from "react";
import { useHabits } from "@/contexts/HabitsContext";
import ProgressRing from "@/components/ProgressRing";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ReactElement } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Flame,
  History,
  Pencil,
  Play,
  Settings2,
  Square,
  Target,
  Timer,
  Trash2,
  Trophy,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

const FASTING_COLOR = "#ef4444";

const FASTING_PROTOCOLS = [
  {
    name: "Equilibrado",
    duration: 14,
    description: "14 horas de jejum e 10 horas para comer.",
  },
  {
    name: "Classico",
    duration: 16,
    description: "16 horas de jejum e 8 horas para comer.",
  },
  {
    name: "Forte",
    duration: 18,
    description: "18 horas de jejum e 6 horas para comer.",
  },
  {
    name: "Avancado",
    duration: 20,
    description: "20 horas de jejum e 4 horas para comer.",
  },
];

const FASTING_MILESTONES = [
  {
    hour: 12,
    title: "12h",
    subtitle: "Primeiro marco",
    description: "Seu corpo ja atravessou um bom intervalo sem refeicao.",
  },
  {
    hour: 16,
    title: "16h",
    subtitle: "Janela classica",
    description: "Faixa mais comum para encaixar no dia a dia.",
  },
  {
    hour: 18,
    title: "18h",
    subtitle: "Mais disciplina",
    description: "Costuma pedir refeicoes mais organizadas.",
  },
  {
    hour: 20,
    title: "20h",
    subtitle: "Longo",
    description: "Melhor para quem ja sustenta o protocolo com calma.",
  },
];

type FastingPhase = {
  id: string;
  title: string;
  startHour: number;
  endHour: number | null;
  description: string;
};

type FastingPhaseStatus = "completed" | "current" | "upcoming" | "preview";
type FastingPanelKey = "milestones" | "summary" | "history";

const FASTING_PHASES: FastingPhase[] = [
  {
    id: "digestion",
    title: "Digestão",
    startHour: 0,
    endHour: 4,
    description:
      "Janela inicial em que o corpo ainda lida com a ultima refeição e a energia mais imediata.",
  },
  {
    id: "glucose-drop",
    title: "Queda de glicose",
    startHour: 4,
    endHour: 8,
    description:
      "A glicose vai baixando e a sensação de fome pode aparecer com mais clareza.",
  },
  {
    id: "metabolic-transition",
    title: "Transição Metabólica",
    startHour: 8,
    endHour: 12,
    description:
      "O corpo entra numa transição metabolica e começa a alternar melhor as fontes de energia.",
  },
  {
    id: "fat-burning",
    title: "Queima de gordura",
    startHour: 12,
    endHour: 16,
    description:
      "Faixa em que muita gente sente o jejum mais estável e bem encaixado na rotina.",
  },
  {
    id: "light-ketosis",
    title: "Cetose leve",
    startHour: 16,
    endHour: 20,
    description:
      "Protocolo mais exigente, geralmente pede hidratação boa e refeições mais organizadas.",
  },
  {
    id: "extended-fast",
    title: "Jejum prolongado",
    startHour: 20,
    endHour: null,
    description:
      "Faixa longa de jejum, melhor tratada como etapa avancada e com bastante bom senso.",
  },
];

const MOTIVATIONAL_MESSAGES = [
  "Água, café sem açucar e constância.",
  "Melhor um protocolo sustentável do que um extremo que quebra.",
  "Sono e hidratação deixam o jejum muito melhor.",
  "Você não precisa sofrer para fazer certo.",
  "Repetição boa vale mais do que um dia heróico.",
];

type TimerMode = "remaining" | "elapsed";

function getDateInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

function FastingDisclosureSection({
  title,
  icon,
  summary,
  isDesktop,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  icon: ReactElement;
  summary: string;
  isDesktop: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactElement;
}) {
  const isOpen = isDesktop || open;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={nextOpen => {
        if (!isDesktop) onOpenChange(nextOpen);
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-bold">{title}</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
        </div>

        {!isDesktop ? (
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 self-start rounded-lg border border-border/60 px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-red-400/50 hover:text-foreground"
            >
              {open ? "Esconder" : "Ver detalhes"}
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

function getTimeInputValue(date = new Date()) {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function getPresetDate(offset: -1 | 0 | 1) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return getDateInputValue(date);
}

function getDatePreset(dateValue: string): -1 | 0 | 1 | null {
  if (dateValue === getPresetDate(-1)) return -1;
  if (dateValue === getPresetDate(0)) return 0;
  if (dateValue === getPresetDate(1)) return 1;
  return null;
}

function combineDateTime(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) return null;
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const date = new Date(`${dateValue}T00:00:00`);
  date.setHours(hours, minutes, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatClock(dateString: string) {
  return new Date(dateString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatHoursMinutes(totalHours: number) {
  const safeHours = Math.max(0, totalHours);
  const hours = Math.floor(safeHours);
  const minutes = Math.floor((safeHours - hours) * 60);
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

function formatCountdown(totalMs: number) {
  const safeMs = Math.max(0, totalMs);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function getSessionElapsedHours(startTime: string, endTime?: string) {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return (end - start) / (1000 * 60 * 60);
}

function getProtocolLabel(duration: number) {
  return `${duration}:${Math.max(0, 24 - duration)}`;
}

function getProtocolMeta(duration: number) {
  const standard = FASTING_PROTOCOLS.find(
    protocol => protocol.duration === duration
  );
  return {
    name: standard?.name || "Personalizado",
    label: getProtocolLabel(duration),
    eatingWindow: Math.max(0, 24 - duration),
    description:
      standard?.description ||
      `${duration} horas de jejum e ${Math.max(0, 24 - duration)} horas para comer.`,
    isCustom: !standard,
  };
}

function clampDuration(value: number) {
  return Math.min(23, Math.max(1, Math.round(value || 0)));
}

function getPhaseRangeLabel(startHour: number, endHour: number | null) {
  return endHour === null ? `${startHour}h+` : `${startHour}-${endHour}h`;
}

export default function FastingPage() {
  const {
    fastingSessions,
    startFasting,
    updateActiveFasting,
    endFasting,
    removeFastingSession,
  } = useHabits();
  const [selectedDuration, setSelectedDuration] = useState(16);
  const [customDuration, setCustomDuration] = useState(15);
  const [planDraftDuration, setPlanDraftDuration] = useState(16);
  const [customDurationInput, setCustomDurationInput] = useState("15");
  const [planDraftDurationInput, setPlanDraftDurationInput] = useState("16");
  const [messageIndex, setMessageIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [timerMode, setTimerMode] = useState<TimerMode>("remaining");
  const [celebratedSessionId, setCelebratedSessionId] = useState<string | null>(
    null
  );
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEditPlanDialog, setShowEditPlanDialog] = useState(false);
  const [showEditStartDialog, setShowEditStartDialog] = useState(false);
  const [showPhaseDialog, setShowPhaseDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState<Record<FastingPanelKey, boolean>>({
    milestones: true,
    summary: false,
    history: false,
  });
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDateValue, setStartDateValue] = useState(() =>
    getDateInputValue()
  );
  const [startTimeValue, setStartTimeValue] = useState(() =>
    getTimeInputValue()
  );
  const [editStartDateValue, setEditStartDateValue] = useState(() =>
    getDateInputValue()
  );
  const [editStartTimeValue, setEditStartTimeValue] = useState(() =>
    getTimeInputValue()
  );
  const activeSession = useMemo(
    () => fastingSessions.find(session => session.isActive) || null,
    [fastingSessions]
  );
  const completedSessions = useMemo(
    () =>
      fastingSessions
        .filter(session => !session.isActive && session.endTime)
        .sort(
          (left, right) =>
            new Date(right.startTime).getTime() -
            new Date(left.startTime).getTime()
        ),
    [fastingSessions]
  );
  const activeMetrics = useMemo(() => {
    if (!activeSession) return null;
    const startMs = new Date(activeSession.startTime).getTime();
    if (Number.isNaN(startMs)) return null;
    const totalMs = activeSession.targetDuration * 60 * 60 * 1000;
    const hasStarted = now >= startMs;
    const untilStartMs = Math.max(0, startMs - now);
    const elapsedMs = hasStarted ? Math.max(0, now - startMs) : 0;
    const remainingMs = hasStarted ? Math.max(0, totalMs - elapsedMs) : totalMs;
    const finishAt = new Date(startMs + totalMs);
    return {
      hasStarted,
      untilStartMs,
      totalMs,
      elapsedMs,
      elapsedHours: elapsedMs / (1000 * 60 * 60),
      remainingMs,
      finishAt,
      percent: hasStarted ? Math.min(100, (elapsedMs / totalMs) * 100) : 0,
      isComplete: hasStarted && remainingMs <= 0,
      displayMs:
        timerMode === "elapsed" && hasStarted
          ? elapsedMs
          : hasStarted
            ? remainingMs
            : untilStartMs,
    };
  }, [activeSession, now, timerMode]);
  const selectedProtocol = useMemo(
    () => getProtocolMeta(selectedDuration),
    [selectedDuration]
  );
  const phaseItems = useMemo(() => {
    const elapsedHours = activeMetrics?.elapsedHours ?? 0;
    const hasActiveSession = Boolean(activeSession);
    const hasStarted = Boolean(activeMetrics?.hasStarted);

    return FASTING_PHASES.map((phase, index) => {
      const rangeLabel = getPhaseRangeLabel(phase.startHour, phase.endHour);

      if (hasActiveSession) {
        if (!hasStarted) {
          return {
            ...phase,
            index: index + 1,
            rangeLabel,
            status: "upcoming" as FastingPhaseStatus,
            statusLabel:
              phase.startHour === 0 ? "Comeca na largada" : "A seguir",
            hint:
              phase.startHour === 0
                ? "Essa fase comeca no momento em que o jejum for iniciado."
                : `Comeca depois de ${formatHoursMinutes(phase.startHour)} de jejum.`,
          };
        }

        const isCompleted =
          phase.endHour !== null && elapsedHours >= phase.endHour;
        const isCurrent =
          elapsedHours >= phase.startHour &&
          (phase.endHour === null || elapsedHours < phase.endHour);
        const status: FastingPhaseStatus = isCompleted
          ? "completed"
          : isCurrent
            ? "current"
            : "upcoming";

        const hint =
          status === "completed"
            ? `Voce ja passou por essa faixa.`
            : status === "current"
              ? phase.endHour === null
                ? "Voce entrou na fase mais longa do jejum."
                : `Faltam ${formatHoursMinutes(Math.max(0, phase.endHour - elapsedHours))} para a proxima fase.`
              : `Falta ${formatHoursMinutes(Math.max(0, phase.startHour - elapsedHours))} para chegar aqui.`;

        return {
          ...phase,
          index: index + 1,
          rangeLabel,
          status,
          statusLabel:
            status === "completed"
              ? "Concluida"
              : status === "current"
                ? "Fase atual"
                : "A seguir",
          hint,
        };
      }

      const previewCovered = selectedDuration >= phase.startHour;

      return {
        ...phase,
        index: index + 1,
        rangeLabel,
        status: (previewCovered ? "preview" : "upcoming") as FastingPhaseStatus,
        statusLabel: previewCovered ? "Coberta pelo plano" : "Fora do plano",
        hint: previewCovered
          ? `${selectedProtocol.label} alcanca esta faixa.`
          : "Seu plano atual termina antes desta fase.",
      };
    });
  }, [
    activeMetrics?.elapsedHours,
    activeMetrics?.hasStarted,
    activeSession,
    selectedDuration,
    selectedProtocol.label,
  ]);
  const selectedPhase = useMemo(
    () => phaseItems.find(phase => phase.id === selectedPhaseId) ?? null,
    [phaseItems, selectedPhaseId]
  );
  const completedCount = completedSessions.length;
  const completedGoalCount = completedSessions.filter(
    session =>
      getSessionElapsedHours(session.startTime, session.endTime) >=
      session.targetDuration
  ).length;
  const completionRate =
    completedCount === 0
      ? 0
      : Math.round((completedGoalCount / completedCount) * 100);
  const totalCompletedHours = completedSessions.reduce(
    (sum, session) =>
      sum + getSessionElapsedHours(session.startTime, session.endTime),
    0
  );
  const bestSessionHours = completedSessions.reduce((best, session) => {
    const elapsedHours = getSessionElapsedHours(
      session.startTime,
      session.endTime
    );
    return elapsedHours > best ? elapsedHours : best;
  }, 0);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    setCustomDurationInput(String(customDuration));
  }, [customDuration]);

  useEffect(() => {
    setPlanDraftDurationInput(String(planDraftDuration));
  }, [planDraftDuration]);

  useEffect(() => {
    if (!activeSession) {
      setCelebratedSessionId(null);
      setTimerMode("remaining");
      setNow(Date.now());
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    const messageTimer = window.setInterval(() => {
      setMessageIndex(prev => (prev + 1) % MOTIVATIONAL_MESSAGES.length);
    }, 20000);

    return () => {
      window.clearInterval(timer);
      window.clearInterval(messageTimer);
    };
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession || !activeMetrics?.isComplete) return;
    if (celebratedSessionId === activeSession.id) return;
    setCelebratedSessionId(activeSession.id);

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Meta de jejum atingida", {
        body: `Voce concluiu ${activeSession.targetDuration}h. Hora de finalizar e coletar o bonus.`,
        icon: "/favicon.ico",
      });
    }

    const duration = 2200;
    const animationEnd = Date.now() + duration;
    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        window.clearInterval(interval);
        return;
      }

      const particleCount = 36 * (timeLeft / duration);
      confetti({
        startVelocity: 28,
        spread: 280,
        ticks: 60,
        zIndex: 1000,
        particleCount,
        origin: { x: 0.2, y: 0.2 },
      });
      confetti({
        startVelocity: 28,
        spread: 280,
        ticks: 60,
        zIndex: 1000,
        particleCount,
        origin: { x: 0.8, y: 0.2 },
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, [activeMetrics?.isComplete, activeSession, celebratedSessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(media.matches);

    sync();
    media.addEventListener("change", sync);

    return () => media.removeEventListener("change", sync);
  }, []);

  const openStartDialog = () => {
    const baseDate = new Date();
    setStartDateValue(getDateInputValue(baseDate));
    setStartTimeValue(getTimeInputValue(baseDate));
    setShowStartDialog(true);
  };

  const openEditPlanDialog = () => {
    if (!activeSession) return;
    setPlanDraftDuration(activeSession.targetDuration);
    setPlanDraftDurationInput(String(activeSession.targetDuration));
    setShowEditPlanDialog(true);
  };

  const openEditStartDialog = () => {
    if (!activeSession) return;
    const startDate = new Date(activeSession.startTime);
    setEditStartDateValue(getDateInputValue(startDate));
    setEditStartTimeValue(getTimeInputValue(startDate));
    setShowEditStartDialog(true);
  };

  const handleSaveCustomDuration = () => {
    const parsed = Number(customDurationInput);
    const nextDuration = Number.isFinite(parsed)
      ? clampDuration(parsed)
      : clampDuration(customDuration);
    setCustomDuration(nextDuration);
    setCustomDurationInput(String(nextDuration));
    setSelectedDuration(nextDuration);
    setShowCustomDialog(false);
  };

  const handleStartNow = async () => {
    setIsSubmitting(true);
    try {
      await startFasting({ durationHours: selectedDuration });
      toast.success(`Jejum ${selectedProtocol.label} iniciado.`);
      setShowStartDialog(false);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Nao consegui iniciar o jejum."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartWithSchedule = async () => {
    const isoString = combineDateTime(startDateValue, startTimeValue);
    if (!isoString) {
      toast.error("Escolha uma data e um horario validos.");
      return;
    }

    setIsSubmitting(true);
    try {
      await startFasting({
        durationHours: selectedDuration,
        startTime: isoString,
      });
      toast.success(`Jejum ${selectedProtocol.label} configurado.`);
      setShowStartDialog(false);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Nao consegui iniciar o jejum."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePlanChange = async () => {
    const parsed = Number(planDraftDurationInput);
    const nextDuration = Number.isFinite(parsed)
      ? clampDuration(parsed)
      : clampDuration(planDraftDuration);
    setIsSubmitting(true);
    try {
      await updateActiveFasting({
        durationHours: nextDuration,
      });
      setPlanDraftDuration(nextDuration);
      setPlanDraftDurationInput(String(nextDuration));
      toast.success("Plano do jejum atualizado.");
      setShowEditPlanDialog(false);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Nao consegui alterar o plano."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveStartChange = async () => {
    const isoString = combineDateTime(editStartDateValue, editStartTimeValue);
    if (!isoString) {
      toast.error("Escolha uma data e um horario validos.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateActiveFasting({ startTime: isoString });
      toast.success("Horario inicial atualizado.");
      setShowEditStartDialog(false);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Nao consegui atualizar o inicio."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndAction = async () => {
    if (!activeSession || !activeMetrics) return;
    if (activeMetrics.hasStarted && !activeMetrics.isComplete) {
      setShowStopDialog(true);
      return;
    }

    try {
      await endFasting();
    } catch (error) {
      console.error(error);
      toast.error("Nao consegui encerrar o jejum.");
    }
  };

  const handleConfirmStop = async () => {
    try {
      await endFasting();
      setShowStopDialog(false);
    } catch (error) {
      console.error(error);
      toast.error("Nao consegui encerrar o jejum.");
    }
  };

  const handleRemoveSession = async (id: string) => {
    try {
      await removeFastingSession(id);
      toast.success("Registro removido.");
    } catch (error) {
      console.error(error);
      toast.error("Nao consegui remover esse registro.");
    }
  };

  const handleOpenPhaseDetails = (phaseId: string) => {
    setSelectedPhaseId(phaseId);
    setShowPhaseDialog(true);
  };

  const activeProtocol = activeSession
    ? getProtocolMeta(activeSession.targetDuration)
    : selectedProtocol;
  const activeStatusTitle = activeMetrics
    ? !activeMetrics.hasStarted
      ? "Jejum agendado"
      : activeMetrics.isComplete
        ? "Meta concluida"
        : "Voce esta em jejum"
    : "Escolha um protocolo";
  const activeStatusSubtitle = activeMetrics
    ? !activeMetrics.hasStarted
      ? `Comeca em ${formatCountdown(activeMetrics.untilStartMs)}`
      : activeMetrics.isComplete
        ? "Agora e so finalizar para registrar esse jejum."
        : MOTIVATIONAL_MESSAGES[messageIndex]
    : "Defina um protocolo e inicie agora ou com horario manual.";
  const recentSessions = completedSessions.slice(0, 8);
  const timerDisplayTitle = !activeMetrics
    ? "Restante(s)"
    : !activeMetrics.hasStarted
      ? "Comeca em"
      : activeMetrics.isComplete
        ? timerMode === "elapsed"
          ? "Tempo total"
          : "Bonus atual"
        : timerMode === "elapsed"
          ? "Tempo decorrido"
          : "Restante(s)";
  const timerDisplayValue = !activeMetrics
    ? "00:00:00"
    : !activeMetrics.hasStarted
      ? formatCountdown(activeMetrics.untilStartMs)
      : activeMetrics.isComplete && timerMode === "remaining"
        ? formatCountdown(activeMetrics.elapsedMs - activeMetrics.totalMs)
        : formatCountdown(activeMetrics.displayMs);
  const endActionLabel = !activeMetrics
    ? "Encerrar"
    : !activeMetrics.hasStarted
      ? "Cancelar agendamento"
      : activeMetrics.isComplete
        ? "Finalizar e receber bonus"
        : "Terminar o jejum";
  const endActionClassName =
    activeMetrics?.isComplete && activeMetrics.hasStarted
      ? "bg-emerald-500 text-white hover:bg-emerald-600"
      : "bg-red-500 text-white hover:bg-red-600";
  const orbitReferenceHours = activeSession
    ? Math.max(activeSession.targetDuration, 20)
    : Math.max(selectedDuration, 20);
  const orbitProgress = activeSession
    ? !activeMetrics?.hasStarted
      ? 0
      : Math.min(1, activeMetrics.elapsedHours / orbitReferenceHours)
    : Math.min(1, selectedDuration / orbitReferenceHours);
  const orbitAngle = orbitProgress * Math.PI * 2 - Math.PI / 2;
  const orbitIndicatorPosition = {
    left: `${50 + Math.cos(orbitAngle) * 36}%`,
    top: `${50 + Math.sin(orbitAngle) * 36}%`,
  };
  const orbitPhases = phaseItems.map((phase, index) => {
    const angle = (index / phaseItems.length) * Math.PI * 2 - Math.PI / 2;
    return {
      ...phase,
      left: `${50 + Math.cos(angle) * 36}%`,
      top: `${50 + Math.sin(angle) * 36}%`,
    };
  });
  const spotlightPhase =
    phaseItems.find(phase => phase.status === "current") ??
    [...phaseItems].reverse().find(phase => phase.status !== "upcoming") ??
    phaseItems[0];

  return (
    <>
      <div className="space-y-5 pb-20">
        <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card px-4 py-4 shadow-sm sm:px-5">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.12)" }}
          >
            <Flame className="h-5 w-5" style={{ color: FASTING_COLOR }} />
          </div>
          <div className="min-w-0">
            <h2
              className="text-xl font-extrabold leading-tight sm:text-2xl"
              style={{ color: FASTING_COLOR }}
            >
              Jejum Intermitente
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fluxo rapido para iniciar, ajustar e concluir seu jejum sem
              bagunca.
            </p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,380px)]">
          <div className="space-y-5">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-red-300">
                        {activeProtocol.label}
                      </span>
                      <span className="rounded-full border border-border/60 bg-secondary/25 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {activeProtocol.name}
                      </span>
                      {activeMetrics?.isComplete && (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                          Bonus liberado
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold leading-tight text-foreground sm:text-2xl">
                        {activeStatusTitle}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {activeStatusSubtitle}
                      </p>
                    </div>
                  </div>

                  {activeSession ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={openEditPlanDialog}
                        className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-red-500/35 hover:text-foreground"
                      >
                        <Settings2 className="h-4 w-4" />
                        Plano
                      </button>
                      <button
                        type="button"
                        onClick={openEditStartDialog}
                        className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-red-500/35 hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                        Inicio
                      </button>
                    </div>
                  ) : null}
                </div>

                {activeSession && activeMetrics ? (
                  <>
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-center">
                      <div className="space-y-4">
                        <div className="mx-auto flex w-fit rounded-xl border border-border/60 bg-background/60 p-1">
                          <button
                            type="button"
                            onClick={() => setTimerMode("remaining")}
                            className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                              timerMode === "remaining"
                                ? "bg-red-500 text-white"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Restante(s)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTimerMode("elapsed")}
                            className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                              timerMode === "elapsed"
                                ? "bg-red-500 text-white"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Tempo decorrido
                          </button>
                        </div>

                        <div className="relative mx-auto h-[220px] w-[220px] max-w-full">
                          <ProgressRing
                            percent={activeMetrics.percent}
                            size={220}
                            strokeWidth={14}
                            color={
                              activeMetrics.isComplete
                                ? "#10b981"
                                : FASTING_COLOR
                            }
                            className="h-full w-full"
                          />
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-7 text-center">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                              {timerDisplayTitle}
                            </p>
                            <p className="mt-2 font-mono text-[30px] font-black leading-none text-foreground sm:text-[34px]">
                              {timerDisplayValue}
                            </p>
                            <p className="mt-3 text-sm font-bold text-muted-foreground">
                              {Math.round(activeMetrics.percent)}% da meta
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                            Horario final
                          </p>
                          <p className="mt-2 text-lg font-black text-foreground">
                            {formatDate(activeMetrics.finishAt.toISOString())}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatClock(activeMetrics.finishAt.toISOString())}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                            Inicio
                          </p>
                          <p className="mt-2 text-lg font-black text-foreground">
                            {formatDate(activeSession.startTime)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatClock(activeSession.startTime)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                            Meta atual
                          </p>
                          <p className="mt-2 text-lg font-black text-foreground">
                            {activeProtocol.label}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {activeSession.targetDuration}h de jejum
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                            Janela de comida
                          </p>
                          <p className="mt-2 text-lg font-black text-foreground">
                            {activeProtocol.eatingWindow}h
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            dentro das 24 horas
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleEndAction}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-colors sm:flex-1 ${endActionClassName}`}
                      >
                        {activeMetrics.isComplete ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                        {endActionLabel}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {FASTING_PROTOCOLS.map(protocol => {
                        const meta = getProtocolMeta(protocol.duration);
                        const isSelected =
                          selectedDuration === protocol.duration;

                        return (
                          <button
                            key={protocol.duration}
                            type="button"
                            onClick={() =>
                              setSelectedDuration(protocol.duration)
                            }
                            className={`rounded-xl border p-4 text-left transition-colors ${
                              isSelected
                                ? "border-red-500/45 bg-red-500/8"
                                : "border-border/50 bg-secondary/20 hover:border-red-500/30"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-2xl font-black text-foreground">
                                  {meta.label}
                                </p>
                                <p className="mt-2 text-sm font-bold text-foreground">
                                  {protocol.name}
                                </p>
                              </div>
                              {isSelected ? (
                                <CheckCircle2
                                  className="mt-1 h-5 w-5 shrink-0"
                                  style={{ color: FASTING_COLOR }}
                                />
                              ) : null}
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">
                              {protocol.description}
                            </p>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => {
                          setCustomDuration(selectedDuration);
                          setCustomDurationInput(String(selectedDuration));
                          setShowCustomDialog(true);
                        }}
                        className={`rounded-xl border p-4 text-left transition-colors sm:col-span-2 xl:col-span-1 ${
                          selectedProtocol.isCustom
                            ? "border-red-500/45 bg-red-500/8"
                            : "border-dashed border-border/60 bg-secondary/15 hover:border-red-500/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-black text-foreground">
                              Personalizar
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Monte seu proprio protocolo a partir de 24h.
                            </p>
                          </div>
                          <Target
                            className="mt-1 h-5 w-5 shrink-0"
                            style={{ color: FASTING_COLOR }}
                          />
                        </div>
                        <div className="mt-4 rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm font-bold text-foreground">
                          {selectedProtocol.label} com{" "}
                          {selectedProtocol.eatingWindow}h para comer
                        </div>
                      </button>
                    </div>

                    <div className="rounded-2xl border border-border/50 bg-secondary/20 p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                            Plano selecionado
                          </p>
                          <div>
                            <p className="text-3xl font-black text-foreground">
                              {selectedProtocol.label}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {selectedProtocol.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:w-[240px]">
                          <button
                            type="button"
                            onClick={handleStartNow}
                            disabled={isSubmitting}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Play className="h-4 w-4" />
                            {isSubmitting ? "Iniciando..." : "Iniciar agora"}
                          </button>
                          <button
                            type="button"
                            onClick={openStartDialog}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 px-4 py-3 text-sm font-bold text-muted-foreground transition-colors hover:border-red-500/35 hover:text-foreground"
                          >
                            <Clock className="h-4 w-4" />
                            Escolher data e hora
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.03 }}
              className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <Flame className="h-4 w-4" style={{ color: FASTING_COLOR }} />
                <h3 className="font-bold">Fases do jejum</h3>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Clique em uma fase para ver o que ela significa dentro do seu
                jejum.
              </p>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-center">
                <div className="relative mx-auto aspect-square w-full max-w-[320px] sm:max-w-[360px]">
                  <div className="absolute inset-[12%] rounded-full border border-dashed border-border/50" />
                  <div className="absolute inset-[26%] rounded-full border border-red-500/10" />

                  <motion.div
                    animate={
                      activeSession && activeMetrics?.hasStarted
                        ? {
                            left: orbitIndicatorPosition.left,
                            top: orbitIndicatorPosition.top,
                          }
                        : undefined
                    }
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="absolute z-20"
                    style={orbitIndicatorPosition}
                  >
                    <div className="h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-400 shadow-[0_0_18px_rgba(239,68,68,0.6)]" />
                  </motion.div>

                  <div className="absolute inset-[29%] flex flex-col items-center justify-center rounded-full border border-border/50 bg-background/80 px-6 text-center backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      {activeSession ? "Fase atual" : "Preview"}
                    </p>
                    <p className="mt-2 text-base font-black text-foreground sm:text-lg">
                      {spotlightPhase.title}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {spotlightPhase.rangeLabel}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      {spotlightPhase.statusLabel}
                    </p>
                  </div>

                  {orbitPhases.map(phase => {
                    const isCurrent = phase.status === "current";
                    const circleClassName =
                      phase.status === "completed"
                        ? "border-emerald-500/40 bg-emerald-500/12 text-emerald-300"
                        : phase.status === "current"
                          ? "border-red-500 bg-red-500 text-white shadow-[0_0_22px_rgba(239,68,68,0.22)]"
                          : phase.status === "preview"
                            ? "border-red-500/30 bg-red-500/8 text-red-200"
                            : "border-border/60 bg-background/70 text-muted-foreground";

                    return (
                      <motion.button
                        key={phase.id}
                        type="button"
                        onClick={() => handleOpenPhaseDetails(phase.id)}
                        animate={
                          isCurrent ? { scale: [1, 1.06, 1] } : undefined
                        }
                        transition={
                          isCurrent
                            ? {
                                duration: 2.2,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "easeInOut",
                              }
                            : undefined
                        }
                        className="absolute z-10 flex w-[84px] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
                        style={{ left: phase.left, top: phase.top }}
                      >
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-full border text-base font-black transition-colors ${circleClassName}`}
                        >
                          {phase.index}
                        </div>
                        <p className="mt-2 text-xs font-bold text-foreground">
                          {phase.title}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                          {phase.rangeLabel}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/50 bg-secondary/20 p-4 sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Leitura da trilha
                    </p>
                    <p className="mt-2 text-base font-black text-foreground">
                      {spotlightPhase.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {spotlightPhase.hint}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Progresso da orbita
                    </p>
                    <p className="mt-2 text-lg font-black text-foreground">
                      {Math.round(orbitProgress * 100)}%
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      da trilha considerada
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Referencia
                    </p>
                    <p className="mt-2 text-lg font-black text-foreground">
                      {orbitReferenceHours}h
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      para completar a volta
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.04 }}
              className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5"
            >
              <FastingDisclosureSection
                title="Marcos do jejum"
                icon={
                  <Target
                    className="h-4 w-4"
                    style={{ color: FASTING_COLOR }}
                  />
                }
                summary={`${FASTING_MILESTONES.length} marcos para acompanhar no protocolo atual.`}
                isDesktop={isDesktop}
                open={expandedPanels.milestones}
                onOpenChange={open =>
                  setExpandedPanels(prev => ({ ...prev, milestones: open }))
                }
              >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {FASTING_MILESTONES.map(milestone => {
                  const progressHours = activeMetrics?.elapsedHours ?? 0;
                  const isReached =
                    !!activeMetrics?.hasStarted &&
                    progressHours >= milestone.hour;
                  const previewCovered =
                    !activeSession && selectedDuration >= milestone.hour;
                  const progressPercent = activeSession
                    ? Math.min(100, (progressHours / milestone.hour) * 100)
                    : previewCovered
                      ? 100
                      : Math.min(
                          100,
                          (selectedDuration / milestone.hour) * 100
                        );

                  return (
                    <div
                      key={milestone.hour}
                      className={`rounded-xl border p-4 transition-colors ${
                        isReached
                          ? "border-emerald-500/35 bg-emerald-500/8"
                          : previewCovered
                            ? "border-red-500/25 bg-red-500/6"
                            : "border-border/50 bg-secondary/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-black text-foreground">
                            {milestone.title}
                          </p>
                          <p className="text-xs font-bold text-muted-foreground">
                            {milestone.subtitle}
                          </p>
                        </div>
                        {isReached ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground/60" />
                        )}
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {milestone.description}
                      </p>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/70">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isReached ? "bg-emerald-400" : "bg-red-400"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {activeSession
                          ? `${formatHoursMinutes(progressHours)} / ${milestone.hour}h`
                          : previewCovered
                            ? "Dentro do plano"
                            : "Ainda fora do plano"}
                      </p>
                    </div>
                  );
                })}
              </div>
              </FastingDisclosureSection>
            </motion.section>
          </div>

          <div className="space-y-5">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.08 }}
              className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5"
            >
              <FastingDisclosureSection
                title="Resumo do jejum"
                icon={<Zap className="h-4 w-4" style={{ color: FASTING_COLOR }} />}
                summary={`${completedGoalCount} metas batidas e ${completionRate}% de conclusao no historico.`}
                isDesktop={isDesktop}
                open={expandedPanels.summary}
                onOpenChange={open =>
                  setExpandedPanels(prev => ({ ...prev, summary: open }))
                }
              >
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Metas
                  </p>
                  <p className="mt-2 text-2xl font-black text-foreground">
                    {completedGoalCount}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">batidas</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Taxa
                  </p>
                  <p className="mt-2 text-2xl font-black text-foreground">
                    {completionRate}%
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    de conclusao
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Melhor
                  </p>
                  <p className="mt-2 text-lg font-black text-foreground">
                    {bestSessionHours > 0
                      ? formatHoursMinutes(bestSessionHours)
                      : "--"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    jejum salvo
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Total
                  </p>
                  <p className="mt-2 text-lg font-black text-foreground">
                    {formatHoursMinutes(totalCompletedHours)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    acumulado
                  </p>
                </div>
              </div>
              </FastingDisclosureSection>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.12 }}
              className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5"
            >
              <FastingDisclosureSection
                title="Historico recente"
                icon={
                  <History className="h-4 w-4" style={{ color: FASTING_COLOR }} />
                }
                summary={
                  recentSessions.length === 0
                    ? "Sem jejuns finalizados ainda."
                    : `${recentSessions.length} registros recentes salvos no historico.`
                }
                isDesktop={isDesktop}
                open={expandedPanels.history}
                onOpenChange={open =>
                  setExpandedPanels(prev => ({ ...prev, history: open }))
                }
              >
              <div className="space-y-3">
                {recentSessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
                    <Timer className="mx-auto h-7 w-7 text-muted-foreground/40" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      Nenhum jejum finalizado ainda.
                    </p>
                  </div>
                ) : (
                  recentSessions.map(session => {
                    const elapsedHours = getSessionElapsedHours(
                      session.startTime,
                      session.endTime
                    );
                    const isSuccess = elapsedHours >= session.targetDuration;

                    return (
                      <div
                        key={session.id}
                        className="group rounded-xl border border-border/50 bg-secondary/20 p-4 transition-colors hover:border-red-500/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full p-2 ${
                                  isSuccess
                                    ? "bg-emerald-500/12 text-emerald-300"
                                    : "bg-background/60 text-muted-foreground"
                                }`}
                              >
                                {isSuccess ? (
                                  <Trophy className="h-4 w-4" />
                                ) : (
                                  <Clock className="h-4 w-4" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground">
                                  {Math.round(elapsedHours * 10) / 10}h reais de{" "}
                                  {session.targetDuration}h
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {isSuccess
                                    ? "Meta batida"
                                    : "Encerrado antes da meta"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                              <span>
                                Inicio: {formatDate(session.startTime)}
                              </span>
                              <span>{formatClock(session.startTime)}</span>
                              {session.endTime ? (
                                <>
                                  <span>
                                    Fim: {formatDate(session.endTime)}
                                  </span>
                                  <span>{formatClock(session.endTime)}</span>
                                </>
                              ) : null}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveSession(session.id)}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-300"
                            aria-label="Excluir registro"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              </FastingDisclosureSection>
            </motion.section>
          </div>
        </div>
      </div>
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Personalizar plano</DialogTitle>
            <DialogDescription>
              Defina quantas horas voce quer ficar em jejum. A janela de comida
              sera calculada dentro de 24h.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Horas de jejum
              </p>
              <input
                type="number"
                min={1}
                max={23}
                value={customDurationInput}
                onChange={event => {
                  const rawValue = event.target.value;
                  setCustomDurationInput(rawValue);
                  if (rawValue.trim() === "") return;

                  const parsed = Number(rawValue);
                  if (!Number.isFinite(parsed)) return;
                  setCustomDuration(clampDuration(parsed));
                }}
                onBlur={() => {
                  const parsed = Number(customDurationInput);
                  const normalized = Number.isFinite(parsed)
                    ? clampDuration(parsed)
                    : clampDuration(customDuration);
                  setCustomDuration(normalized);
                  setCustomDurationInput(String(normalized));
                }}
                className="mt-3 h-12 w-full rounded-lg border border-border/60 bg-background/50 px-4 text-lg font-black outline-none transition-colors focus:border-red-500/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Protocolo
                </p>
                <p className="mt-2 text-2xl font-black">
                  {getProtocolLabel(clampDuration(customDuration))}
                </p>
              </div>
              <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Janela de comida
                </p>
                <p className="mt-2 text-2xl font-black">
                  {Math.max(0, 24 - clampDuration(customDuration))}h
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowCustomDialog(false)}
              className="rounded-lg border border-border/60 px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:border-red-500/40 hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveCustomDuration}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600"
            >
              Salvar plano
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar o jejum</DialogTitle>
            <DialogDescription>
              Plano {selectedProtocol.label}. Comece agora ou escolha uma data e
              um horario.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Protocolo
              </p>
              <p className="mt-2 text-xl font-black">
                {selectedProtocol.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedDuration} horas de jejum e{" "}
                {selectedProtocol.eatingWindow} horas para comer.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartNow}
              disabled={isSubmitting}
              className="w-full rounded-lg bg-red-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Iniciando..." : "Comecar agora"}
            </button>

            <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Escolher data e hora
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { label: "Ontem", value: -1 as const },
                  { label: "Hoje", value: 0 as const },
                  { label: "Amanha", value: 1 as const },
                ].map(option => {
                  const isActive =
                    getDatePreset(startDateValue) === option.value;

                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() =>
                        setStartDateValue(getPresetDate(option.value))
                      }
                      className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                        isActive
                          ? "bg-red-500 text-white"
                          : "border border-border/60 text-muted-foreground hover:border-red-500/40 hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  value={startDateValue}
                  onChange={event => setStartDateValue(event.target.value)}
                  className="h-11 rounded-lg border border-border/60 bg-background/50 px-3 text-sm outline-none transition-colors focus:border-red-500/40"
                />
                <input
                  type="time"
                  value={startTimeValue}
                  onChange={event => setStartTimeValue(event.target.value)}
                  className="h-11 rounded-lg border border-border/60 bg-background/50 px-3 text-sm outline-none transition-colors focus:border-red-500/40"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowStartDialog(false)}
              className="rounded-lg border border-border/60 px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:border-red-500/40 hover:text-foreground"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleStartWithSchedule}
              disabled={isSubmitting}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Salvando..." : "Iniciar com esse horario"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditPlanDialog} onOpenChange={setShowEditPlanDialog}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Alterar o seu plano</DialogTitle>
            <DialogDescription>
              O horario de inicio continua o mesmo. Vamos recalcular apenas a
              meta e o final esperado.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            {FASTING_PROTOCOLS.map(protocol => {
              const isSelected = planDraftDuration === protocol.duration;
              const label = getProtocolLabel(protocol.duration);

              return (
                <button
                  key={protocol.duration}
                  type="button"
                  onClick={() => {
                    setPlanDraftDuration(protocol.duration);
                    setPlanDraftDurationInput(String(protocol.duration));
                  }}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? "border-red-500/45 bg-red-500/8"
                      : "border-border/50 bg-secondary/20 hover:border-red-500/35"
                  }`}
                >
                  <p className="text-2xl font-black">{label}</p>
                  <p className="mt-3 text-sm font-bold">{protocol.name}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {protocol.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Personalizar
            </p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={23}
                value={planDraftDurationInput}
                onChange={event => {
                  const rawValue = event.target.value;
                  setPlanDraftDurationInput(rawValue);
                  if (rawValue.trim() === "") return;

                  const parsed = Number(rawValue);
                  if (!Number.isFinite(parsed)) return;
                  setPlanDraftDuration(clampDuration(parsed));
                }}
                onBlur={() => {
                  const parsed = Number(planDraftDurationInput);
                  const normalized = Number.isFinite(parsed)
                    ? clampDuration(parsed)
                    : clampDuration(planDraftDuration);
                  setPlanDraftDuration(normalized);
                  setPlanDraftDurationInput(String(normalized));
                }}
                className="h-11 w-28 rounded-lg border border-border/60 bg-background/50 px-3 text-sm font-bold outline-none transition-colors focus:border-red-500/40"
              />
              <div className="text-sm text-muted-foreground">
                <p>{getProtocolLabel(planDraftDuration)}</p>
                <p>{Math.max(0, 24 - planDraftDuration)}h para comer</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowEditPlanDialog(false)}
              className="rounded-lg border border-border/60 px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:border-red-500/40 hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSavePlanChange}
              disabled={isSubmitting}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Salvando..." : "Salvar plano"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditStartDialog} onOpenChange={setShowEditStartDialog}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar inicio do jejum</DialogTitle>
            <DialogDescription>
              Ajuste a data e a hora da largada. O tempo restante e o horario
              final serao recalculados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Ontem", value: -1 as const },
                { label: "Hoje", value: 0 as const },
                { label: "Amanha", value: 1 as const },
              ].map(option => {
                const isActive =
                  getDatePreset(editStartDateValue) === option.value;

                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() =>
                      setEditStartDateValue(getPresetDate(option.value))
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                      isActive
                        ? "bg-red-500 text-white"
                        : "border border-border/60 text-muted-foreground hover:border-red-500/40 hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={editStartDateValue}
                onChange={event => setEditStartDateValue(event.target.value)}
                className="h-11 rounded-lg border border-border/60 bg-background/50 px-3 text-sm outline-none transition-colors focus:border-red-500/40"
              />
              <input
                type="time"
                value={editStartTimeValue}
                onChange={event => setEditStartTimeValue(event.target.value)}
                className="h-11 rounded-lg border border-border/60 bg-background/50 px-3 text-sm outline-none transition-colors focus:border-red-500/40"
              />
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowEditStartDialog(false)}
              className="rounded-lg border border-border/60 px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:border-red-500/40 hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveStartChange}
              disabled={isSubmitting}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Salvando..." : "Salvar horario"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPhaseDialog} onOpenChange={setShowPhaseDialog}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-md">
          {selectedPhase ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Fase {selectedPhase.index}: {selectedPhase.title}
                </DialogTitle>
                <DialogDescription>
                  Faixa {selectedPhase.rangeLabel}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-lg font-black ${
                        selectedPhase.status === "completed"
                          ? "border-emerald-500/40 bg-emerald-500/12 text-emerald-300"
                          : selectedPhase.status === "current"
                            ? "border-red-500 bg-red-500 text-white"
                            : selectedPhase.status === "preview"
                              ? "border-red-500/30 bg-red-500/8 text-red-200"
                              : "border-border/60 bg-background/60 text-muted-foreground"
                      }`}
                    >
                      {selectedPhase.index}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        Status
                      </p>
                      <p className="mt-1 text-base font-black text-foreground">
                        {selectedPhase.statusLabel}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedPhase.hint}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    O que essa fase representa
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {selectedPhase.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Faixa
                    </p>
                    <p className="mt-2 text-base font-black text-foreground">
                      {selectedPhase.rangeLabel}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Contexto
                    </p>
                    <p className="mt-2 text-base font-black text-foreground">
                      {activeSession
                        ? activeMetrics?.hasStarted
                          ? formatHoursMinutes(activeMetrics.elapsedHours)
                          : "Agendado"
                        : selectedProtocol.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activeSession
                        ? activeMetrics?.hasStarted
                          ? "Tempo ja decorrido"
                          : "Sessao ainda nao iniciada"
                        : "Protocolo em preview"}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setShowPhaseDialog(false)}
                  className="rounded-lg border border-border/60 px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:border-red-500/40 hover:text-foreground"
                >
                  Fechar
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desistir do jejum?</AlertDialogTitle>
            <AlertDialogDescription>
              Voce ainda nao alcancou seu objetivo. Quer mesmo encerrar mais
              cedo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nao</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStop}
              className="bg-red-500 hover:bg-red-600"
            >
              Sim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
