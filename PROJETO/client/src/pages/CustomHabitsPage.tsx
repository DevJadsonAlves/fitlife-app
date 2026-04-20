import { useEffect, useMemo, useState } from "react";
import {
  CUSTOM_HABIT_CATEGORIES,
  CUSTOM_HABIT_DIFFICULTIES,
  getSuggestedCustomHabitXp,
  isCustomHabitComplete,
  useHabits,
  type CustomHabit,
  type CustomHabitLog,
  type CustomHabitCategory,
  type CustomHabitDifficulty,
  type CustomHabitType,
} from "@/contexts/HabitsContext";
import { motion } from "framer-motion";
import { BarChart3, Bell, Check, Filter, ListChecks, Pencil, Plus, RotateCcw, Save, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

type CategoryMeta = (typeof CUSTOM_HABIT_CATEGORIES)[CustomHabitCategory];
type DifficultyMeta = (typeof CUSTOM_HABIT_DIFFICULTIES)[CustomHabitDifficulty];
type CategoryFilter = CustomHabitCategory | "all";

const CATEGORY_OPTIONS = Object.entries(CUSTOM_HABIT_CATEGORIES) as Array<[CustomHabitCategory, CategoryMeta]>;
const DIFFICULTY_OPTIONS = Object.entries(CUSTOM_HABIT_DIFFICULTIES) as Array<[CustomHabitDifficulty, DifficultyMeta]>;

const COLORS = ["#22d3ee", "#f97316", "#84cc16", "#818cf8", "#22c55e", "#f59e0b", "#ec4899", "#ef4444"];
const ICONS = ["✨", "📚", "🧘", "☀️", "💊", "🧠", "🚶", "🍎", "🧴", "🎯", "🛑", "🤝"];

const TYPE_LABELS: Record<CustomHabitType, string> = {
  boolean: "Sim/Não",
  quantity: "Quantidade",
  minutes: "Minutos",
  limit: "Limite",
};

const TYPE_HELP: Record<CustomHabitType, string> = {
  boolean: "Marcar quando fizer.",
  quantity: "Somar uma meta do dia.",
  minutes: "Registrar tempo dedicado.",
  limit: "Vencer ficando abaixo do limite.",
};

const DEFAULT_TARGET_BY_TYPE: Record<CustomHabitType, number> = {
  boolean: 1,
  quantity: 10,
  minutes: 10,
  limit: 0,
};

type HabitForm = {
  name: string;
  icon: string;
  color: string;
  category: CustomHabitCategory;
  difficulty: CustomHabitDifficulty;
  type: CustomHabitType;
  target: number;
  unit: string;
  xp: number;
  isActive: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
};

type HabitTemplate = Omit<CustomHabit, "id" | "created_at" | "isActive" | "reminderEnabled" | "reminderTime"> & {
  description: string;
};

const DEFAULT_FORM: HabitForm = {
  name: "",
  icon: "✨",
  color: CUSTOM_HABIT_CATEGORIES.health.color,
  category: "health",
  difficulty: "easy",
  type: "boolean",
  target: 1,
  unit: "",
  xp: getSuggestedCustomHabitXp("easy", "boolean", 1),
  isActive: true,
  reminderEnabled: false,
  reminderTime: "08:00",
};

const PRESET_HABITS: HabitTemplate[] = [
  {
    name: "Leitura",
    description: "Criar ritmo sem transformar livro em castigo.",
    icon: "📚",
    color: CUSTOM_HABIT_CATEGORIES.study.color,
    category: "study",
    difficulty: "medium",
    type: "quantity",
    target: 10,
    unit: "páginas",
    xp: getSuggestedCustomHabitXp("medium", "quantity", 10),
  },
  {
    name: "Meditação",
    description: "Desacelerar antes da mente virar aba aberta.",
    icon: "🧘",
    color: CUSTOM_HABIT_CATEGORIES.mind.color,
    category: "mind",
    difficulty: "easy",
    type: "minutes",
    target: 10,
    unit: "min",
    xp: getSuggestedCustomHabitXp("easy", "minutes", 10),
  },
  {
    name: "Caminhada",
    description: "Movimento simples, efeito grande.",
    icon: "🚶",
    color: CUSTOM_HABIT_CATEGORIES.health.color,
    category: "health",
    difficulty: "medium",
    type: "minutes",
    target: 30,
    unit: "min",
    xp: getSuggestedCustomHabitXp("medium", "minutes", 30),
  },
  {
    name: "Remédio",
    description: "Um check pequeno que não pode depender da memória.",
    icon: "💊",
    color: CUSTOM_HABIT_CATEGORIES.health.color,
    category: "health",
    difficulty: "easy",
    type: "boolean",
    target: 1,
    unit: "",
    xp: getSuggestedCustomHabitXp("easy", "boolean", 1),
  },
  {
    name: "Alongamento",
    description: "Soltar o corpo e manter a maquina rodando.",
    icon: "☀️",
    color: CUSTOM_HABIT_CATEGORIES.health.color,
    category: "health",
    difficulty: "easy",
    type: "minutes",
    target: 8,
    unit: "min",
    xp: getSuggestedCustomHabitXp("easy", "minutes", 8),
  },
  {
    name: "Estudo focado",
    description: "Bloco real de concentração.",
    icon: "🧠",
    color: CUSTOM_HABIT_CATEGORIES.study.color,
    category: "study",
    difficulty: "hard",
    type: "minutes",
    target: 50,
    unit: "min",
    xp: getSuggestedCustomHabitXp("hard", "minutes", 50),
  },
  {
    name: "Skincare",
    description: "Autocuidado sem novela.",
    icon: "🧴",
    color: CUSTOM_HABIT_CATEGORIES.selfcare.color,
    category: "selfcare",
    difficulty: "easy",
    type: "boolean",
    target: 1,
    unit: "",
    xp: getSuggestedCustomHabitXp("easy", "boolean", 1),
  },
  {
    name: "Oração",
    description: "Um momento reservado de presença.",
    icon: "✨",
    color: CUSTOM_HABIT_CATEGORIES.mind.color,
    category: "mind",
    difficulty: "easy",
    type: "minutes",
    target: 10,
    unit: "min",
    xp: getSuggestedCustomHabitXp("easy", "minutes", 10),
  },
  {
    name: "Sem refrigerante",
    description: "O vício perde quando o limite fica claro.",
    icon: "🛑",
    color: CUSTOM_HABIT_CATEGORIES.vice_control.color,
    category: "vice_control",
    difficulty: "hard",
    type: "limit",
    target: 0,
    unit: "copos",
    xp: getSuggestedCustomHabitXp("hard", "limit", 0),
  },
  {
    name: "Café sem açúcar",
    description: "Menos impulso, mais controle.",
    icon: "☕",
    color: CUSTOM_HABIT_CATEGORIES.vice_control.color,
    category: "vice_control",
    difficulty: "medium",
    type: "limit",
    target: 0,
    unit: "cafés adoçados",
    xp: getSuggestedCustomHabitXp("medium", "limit", 0),
  },
  {
    name: "Diario",
    description: "Fechar o dia entendendo o que aconteceu.",
    icon: "📓",
    color: CUSTOM_HABIT_CATEGORIES.selfcare.color,
    category: "selfcare",
    difficulty: "easy",
    type: "quantity",
    target: 1,
    unit: "registro",
    xp: getSuggestedCustomHabitXp("easy", "quantity", 1),
  },
  {
    name: "Sem rede a noite",
    description: "Proteger o sono antes que o feed roube a noite.",
    icon: "🌙",
    color: CUSTOM_HABIT_CATEGORIES.productivity.color,
    category: "productivity",
    difficulty: "hard",
    type: "limit",
    target: 0,
    unit: "min depois das 22h",
    xp: getSuggestedCustomHabitXp("hard", "limit", 0),
  },
];

function getCompletionValue(habit: CustomHabit): number {
  if (habit.type === "boolean") return 1;
  if (habit.type === "limit") return 0;
  return habit.target;
}

function getProgressText(habit: CustomHabit, value?: number): string {
  if (value === undefined) return "Sem registro hoje";
  if (habit.type === "boolean") return value >= 1 ? "Concluído" : "Pendente";
  if (habit.type === "minutes") return `${value}/${habit.target} min`;
  if (habit.type === "limit") return `${value}/${habit.target} ${habit.unit || "max."}`;
  return `${value}/${habit.target} ${habit.unit || ""}`.trim();
}

function getProgressPercent(habit: CustomHabit, value?: number): number {
  if (value === undefined) return 0;
  if (habit.type === "boolean") return value >= 1 ? 100 : 0;
  if (habit.type === "limit") {
    if (habit.target === 0) return value <= 0 ? 100 : 0;
    return value <= habit.target ? 100 : Math.max(0, Math.round((habit.target / value) * 100));
  }

  return Math.min(100, Math.round((value / Math.max(habit.target, 1)) * 100));
}

function buildPayload(form: HabitForm): Omit<CustomHabit, "id" | "created_at"> {
  const target = form.type === "boolean" ? 1 : Math.max(form.type === "limit" ? 0 : 1, Number(form.target) || 0);

  return {
    ...form,
    name: form.name.trim(),
    target,
    unit: form.type === "boolean" ? "" : form.unit.trim(),
    xp: Math.max(1, Number(form.xp) || getSuggestedCustomHabitXp(form.difficulty, form.type, target)),
    reminderEnabled: form.reminderEnabled,
    reminderTime: form.reminderEnabled ? form.reminderTime : "",
  };
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getLastDateKeys(days: number): string[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return formatDateKey(date);
  });
}

function getHabitStats(habit: CustomHabit, logs: CustomHabitLog[]) {
  const completedDates = new Set(
    logs
      .filter((log) => log.habitId === habit.id && isCustomHabitComplete(habit, log))
      .map((log) => log.date)
  );
  const last7 = getLastDateKeys(7);
  const last30 = getLastDateKeys(30);
  const completed7 = last7.filter((date) => completedDates.has(date)).length;
  const completed30 = last30.filter((date) => completedDates.has(date)).length;
  let streak = 0;

  for (const date of last30) {
    if (!completedDates.has(date)) break;
    streak += 1;
  }

  return {
    completed7,
    completed30,
    streak,
    rate7: Math.round((completed7 / 7) * 100),
    rate30: Math.round((completed30 / 30) * 100),
  };
}

export default function CustomHabitsPage() {
  const {
    currentDate,
    customHabits,
    customHabitLogs,
    addCustomHabit,
    updateCustomHabit,
    removeCustomHabit,
    setCustomHabitLog,
    removeCustomHabitLog,
    getDayEntries,
    requestNotificationPermission,
  } = useHabits();

  const [form, setForm] = useState<HabitForm>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [workingPreset, setWorkingPreset] = useState<string | null>(null);
  const [xpInput, setXpInput] = useState(String(DEFAULT_FORM.xp));
  const [targetInput, setTargetInput] = useState(String(DEFAULT_FORM.target));
  const [habitValueDrafts, setHabitValueDrafts] = useState<Record<string, string>>(
    {}
  );

  const todayLogs = getDayEntries(customHabitLogs, currentDate);
  const activeHabits = useMemo(() => customHabits.filter((habit) => habit.isActive), [customHabits]);
  const completedCount = activeHabits.filter((habit) => {
    const log = todayLogs.find((entry) => entry.habitId === habit.id);
    return isCustomHabitComplete(habit, log);
  }).length;

  const todayXp = activeHabits.reduce((sum, habit) => {
    const log = todayLogs.find((entry) => entry.habitId === habit.id);
    return isCustomHabitComplete(habit, log) ? sum + habit.xp : sum;
  }, 0);

  const hardHabits = activeHabits.filter((habit) => habit.difficulty === "hard").length;
  const remindersEnabled = activeHabits.filter((habit) => habit.reminderEnabled).length;
  const categoryStats = CATEGORY_OPTIONS.map(([category, meta]) => ({
    category,
    meta,
    count: activeHabits.filter((habit) => habit.category === category).length,
  })).filter((item) => item.count > 0);
  const filteredHabits = categoryFilter === "all"
    ? customHabits
    : customHabits.filter((habit) => habit.category === categoryFilter);
  const habitStats = activeHabits.map((habit) => ({
    habit,
    stats: getHabitStats(habit, customHabitLogs),
  }));
  const averageRate7 = activeHabits.length > 0
    ? Math.round(habitStats.reduce((sum, item) => sum + item.stats.rate7, 0) / activeHabits.length)
    : 0;
  const bestHabit = habitStats.slice().sort((a, b) => b.stats.completed30 - a.stats.completed30)[0];
  const topStreakHabit = habitStats.slice().sort((a, b) => b.stats.streak - a.stats.streak)[0];
  const xpByCategory = CATEGORY_OPTIONS.map(([category, meta]) => {
    const xp = activeHabits
      .filter((habit) => habit.category === category)
      .reduce((sum, habit) => {
        const completedLogs = customHabitLogs.filter((log) => log.habitId === habit.id && isCustomHabitComplete(habit, log));
        return sum + completedLogs.length * habit.xp;
      }, 0);

    return { category, meta, xp };
  }).filter((item) => item.xp > 0);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
  };

  useEffect(() => {
    setXpInput(String(form.xp));
  }, [form.xp]);

  useEffect(() => {
    setTargetInput(String(form.target));
  }, [form.target]);

  const patchForm = (patch: Partial<HabitForm>, shouldUpdateXp = false) => {
    setForm((current) => {
      const next = { ...current, ...patch };
      const normalizedTarget = next.type === "boolean" ? 1 : next.target;

      return {
        ...next,
        target: normalizedTarget,
        xp: shouldUpdateXp ? getSuggestedCustomHabitXp(next.difficulty, next.type, normalizedTarget) : next.xp,
      };
    });
  };

  const handleTypeChange = (type: CustomHabitType) => {
    patchForm(
      {
        type,
        target: DEFAULT_TARGET_BY_TYPE[type],
        unit: type === "minutes" ? "min" : type === "boolean" ? "" : form.unit,
      },
      true
    );
  };

  const handleCategoryChange = (category: CustomHabitCategory) => {
    patchForm({ category, color: CUSTOM_HABIT_CATEGORIES[category].color });
  };

  const handleReminderToggle = async () => {
    if (!form.reminderEnabled) {
      const allowed = await requestNotificationPermission();
      if (!allowed) {
        toast.info("Lembrete salvo no app. O navegador ainda nao liberou notificacoes.");
      }
    }

    patchForm({ reminderEnabled: !form.reminderEnabled });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Dê um nome para o hábito");
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(form);

      if (editingId) {
        await updateCustomHabit(editingId, payload);
        toast.success("Hábito atualizado!");
      } else {
        await addCustomHabit(payload);
        toast.success("Hábito criado!");
      }

      resetForm();
    } catch (error) {
      console.error("Erro ao salvar hábito:", error);
      toast.error("Não foi possível salvar o hábito");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (habit: CustomHabit) => {
    setEditingId(habit.id);
    setForm({
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      category: habit.category,
      difficulty: habit.difficulty,
      type: habit.type,
      target: habit.target,
      unit: habit.unit || "",
      xp: habit.xp,
      isActive: habit.isActive,
      reminderEnabled: habit.reminderEnabled,
      reminderTime: habit.reminderTime || "08:00",
    });
  };

  const handlePresetCustomize = (preset: HabitTemplate) => {
    setForm({
      name: preset.name,
      icon: preset.icon,
      color: preset.color,
      category: preset.category,
      difficulty: preset.difficulty,
      type: preset.type,
      target: preset.target,
      unit: preset.unit || "",
      xp: preset.xp,
      isActive: true,
      reminderEnabled: false,
      reminderTime: "08:00",
    });
    setEditingId(null);
    toast.info("Modelo carregado para ajustar");
  };

  const handlePresetAdd = async (preset: HabitTemplate) => {
    if (customHabits.some((habit) => habit.name.trim().toLowerCase() === preset.name.toLowerCase())) {
      toast.info("Esse hábito já existe");
      return;
    }

    setWorkingPreset(preset.name);
    try {
      await addCustomHabit({ ...preset, isActive: true, reminderEnabled: false, reminderTime: "" });
      toast.success(`${preset.name} adicionado`);
    } catch (error) {
      console.error("Erro ao adicionar modelo:", error);
      toast.error("Não foi possível adicionar esse modelo");
    } finally {
      setWorkingPreset(null);
    }
  };

  const handleRemove = async (habit: CustomHabit) => {
    if (!window.confirm(`Apagar o hábito "${habit.name}"?`)) return;

    setWorkingId(habit.id);
    try {
      await removeCustomHabit(habit.id);
      toast.success("Hábito removido");
    } catch (error) {
      console.error("Erro ao remover hábito:", error);
      toast.error("Não foi possível remover o hábito");
    } finally {
      setWorkingId(null);
    }
  };

  const handleToggle = async (habit: CustomHabit) => {
    const log = todayLogs.find((entry) => entry.habitId === habit.id);
    const completed = isCustomHabitComplete(habit, log);

    setWorkingId(habit.id);
    try {
      if (completed) {
        await removeCustomHabitLog(habit.id, currentDate);
      } else {
        await setCustomHabitLog(habit.id, getCompletionValue(habit), currentDate);
      }
    } catch (error) {
      console.error("Erro ao atualizar hábito:", error);
      toast.error("Não foi possível atualizar o hábito");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-2.5">
          <ListChecks className="mt-1 h-[22px] w-[22px] text-emerald-400" />
          <div>
            <h2 className="m-0 text-[22px] font-extrabold leading-tight text-emerald-400">
              Hábitos
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Crie rituais próprios com meta, categoria, dificuldade e XP.
            </p>
          </div>
        </div>

        {categoryStats.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categoryStats.map(({ category, meta, count }) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-white/[0.03] px-3 py-2 text-xs font-bold transition-colors hover:border-emerald-400/30"
                style={{ color: meta.color }}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                <span className="font-mono text-muted-foreground">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="fitlife-card p-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricCard label="Hoje" value={`${completedCount}/${activeHabits.length}`} color="#22c55e" />
          <MetricCard label="XP Extra" value={`+${todayXp}`} color="#84cc16" />
          <MetricCard label="Ativos" value={String(activeHabits.length)} color="#22d3ee" />
          <MetricCard label="Hábitos fortes" value={String(hardHabits)} color="#f97316" />
          <MetricCard label="Lembretes" value={String(remindersEnabled)} color="#818cf8" />
        </div>
      </motion.div>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="fitlife-card p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10">
            <Wand2 className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Modelos rápidos</h3>
            <p className="text-xs text-muted-foreground">Escolha um pronto ou ajuste antes de salvar.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {PRESET_HABITS.map((preset) => {
            const category = CUSTOM_HABIT_CATEGORIES[preset.category];
            const difficulty = CUSTOM_HABIT_DIFFICULTIES[preset.difficulty];

            return (
              <div
                key={preset.name}
                className="rounded-lg border border-border bg-white/[0.03] p-3 transition-colors hover:border-border/80"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-lg border text-lg"
                      style={{ borderColor: `${preset.color}55`, backgroundColor: `${preset.color}18` }}
                    >
                      {preset.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{preset.name}</p>
                      <p className="text-[11px] text-muted-foreground">{category.label} · {difficulty.label} · {preset.xp} XP</p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-white/[0.04] px-2 py-1 text-[10px] font-bold" style={{ color: category.color }}>
                    {TYPE_LABELS[preset.type]}
                  </span>
                </div>
                <p className="mb-3 min-h-[32px] text-xs text-muted-foreground">{preset.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePresetCustomize(preset)}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Ajustar
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetAdd(preset)}
                    disabled={workingPreset === preset.name}
                    className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-black text-background transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {workingPreset === preset.name ? "Adicionando..." : "Adicionar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="fitlife-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">{editingId ? "Editar hábito" : "Novo hábito"}</h3>
            <p className="text-xs text-muted-foreground">O XP muda com a dificuldade, mas você ainda pode ajustar fino.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => patchForm({ isActive: !form.isActive })}
              className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              {form.isActive ? "Ativo" : "Pausado"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr]">
          <input
            value={form.name}
            onChange={(event) => patchForm({ name: event.target.value })}
            placeholder="Nome do hábito"
            className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-400/50"
          />
          <select
            value={form.category}
            onChange={(event) => handleCategoryChange(event.target.value as CustomHabitCategory)}
            className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-400/50"
          >
            {CATEGORY_OPTIONS.map(([category, meta]) => (
              <option key={category} value={category}>{meta.label}</option>
            ))}
          </select>
          <select
            value={form.type}
            onChange={(event) => handleTypeChange(event.target.value as CustomHabitType)}
            className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-400/50"
          >
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <option key={type} value={type}>{label}</option>
            ))}
          </select>
          <input
            type="number"
            value={xpInput}
            min={1}
            onChange={(event) => {
              const rawValue = event.target.value;
              setXpInput(rawValue);
              if (rawValue.trim() === "") return;

              const parsed = Number(rawValue);
              if (Number.isFinite(parsed)) {
                patchForm({ xp: Math.max(1, Math.round(parsed)) });
              }
            }}
            onBlur={() => {
              const parsed = Number(xpInput);
              if (!Number.isFinite(parsed)) {
                const fallback = Math.max(
                  1,
                  getSuggestedCustomHabitXp(form.difficulty, form.type, form.target)
                );
                patchForm({ xp: fallback });
                setXpInput(String(fallback));
                return;
              }

              const normalized = Math.max(1, Math.round(parsed));
              patchForm({ xp: normalized });
              setXpInput(String(normalized));
            }}
            placeholder="XP"
            className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-400/50"
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_0.8fr]">
          {form.type === "boolean" ? (
            <input
              value="Feito / Não feito"
              readOnly
              className="rounded-lg border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground outline-none"
            />
          ) : (
            <input
              type="number"
              value={targetInput}
              min={form.type === "limit" ? 0 : 1}
              onChange={(event) => {
                const rawValue = event.target.value;
                setTargetInput(rawValue);
                if (rawValue.trim() === "") return;

                const parsed = Number(rawValue);
                if (Number.isFinite(parsed)) {
                  patchForm({ target: Math.round(parsed) }, true);
                }
              }}
              onBlur={() => {
                const minimum = form.type === "limit" ? 0 : 1;
                const parsed = Number(targetInput);
                const normalized = Number.isFinite(parsed)
                  ? Math.max(minimum, Math.round(parsed))
                  : minimum;
                patchForm({ target: normalized }, true);
                setTargetInput(String(normalized));
              }}
              placeholder={form.type === "limit" ? "Limite máximo" : "Meta"}
              className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-400/50"
            />
          )}
          <input
            value={form.unit}
            onChange={(event) => patchForm({ unit: event.target.value })}
            placeholder="Unidade: páginas, copos, cafés..."
            className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-400/50"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-black text-background transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {saving ? "Salvando..." : editingId ? "Salvar" : "Criar"}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_0.7fr]">
          <button
            type="button"
            onClick={handleReminderToggle}
            className={`flex min-h-10 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-bold transition-colors ${
              form.reminderEnabled
                ? "border-indigo-400/50 bg-indigo-400/10 text-indigo-300"
                : "border-border bg-white/[0.03] text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Lembrete do hábito
            </span>
            <span className="text-xs">{form.reminderEnabled ? "Ligado" : "Desligado"}</span>
          </button>
          <input
            type="time"
            value={form.reminderTime}
            disabled={!form.reminderEnabled}
            onChange={(event) => patchForm({ reminderTime: event.target.value })}
            className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-400/50 disabled:cursor-not-allowed disabled:opacity-45"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[1.4px] text-muted-foreground">Dificuldade</p>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_OPTIONS.map(([difficulty, meta]) => (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => patchForm({ difficulty }, true)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    form.difficulty === difficulty ? "border-emerald-400 bg-emerald-400/10" : "border-border bg-white/[0.03]"
                  }`}
                >
                  <span className="block text-xs font-black">{meta.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{meta.xpBase}+ XP</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{TYPE_HELP[form.type]}</p>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[1.4px] text-muted-foreground">Visual</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => patchForm({ icon })}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-colors ${
                    form.icon === icon ? "border-emerald-400 bg-emerald-400/10" : "border-border bg-secondary/30"
                  }`}
                  aria-label={`Usar ícone ${icon}`}
                >
                  {icon}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => patchForm({ color })}
                  className={`h-7 w-7 rounded-lg border transition-transform ${form.color === color ? "scale-110 border-white" : "border-border"}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Usar cor ${color}`}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="fitlife-card p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-lime-400/30 bg-lime-400/10">
            <BarChart3 className="h-4 w-4 text-lime-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Estatísticas dos hábitos</h3>
            <p className="text-xs text-muted-foreground">Consistência, streaks e XP por categoria.</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatMiniCard label="Consistência 7d" value={`${averageRate7}%`} color="#84cc16" />
          <StatMiniCard label="Melhor 30d" value={bestHabit ? bestHabit.habit.name : "-"} color="#22d3ee" />
          <StatMiniCard label="Maior streak" value={topStreakHabit ? `${topStreakHabit.stats.streak}d` : "0d"} color="#f97316" />
          <StatMiniCard label="Categorias com XP" value={String(xpByCategory.length)} color="#818cf8" />
        </div>

        {activeHabits.length === 0 ? (
          <div className="rounded-lg border border-border bg-white/[0.03] p-4 text-sm text-muted-foreground">
            Crie hábitos para enxergar estatísticas reais aqui.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-2">
              {habitStats
                .slice()
                .sort((a, b) => b.stats.rate7 - a.stats.rate7)
                .slice(0, 6)
                .map(({ habit, stats }) => (
                  <HabitStatRow key={habit.id} habit={habit} rate={stats.rate7} streak={stats.streak} completed30={stats.completed30} />
                ))}
            </div>
            <div className="space-y-2">
              {xpByCategory.length === 0 ? (
                <div className="rounded-lg border border-border bg-white/[0.03] p-4 text-sm text-muted-foreground">
                  Complete hábitos para gerar XP por categoria.
                </div>
              ) : (
                xpByCategory.map(({ category, meta, xp }) => (
                  <CategoryXpRow key={category} icon={meta.icon} label={meta.label} color={meta.color} xp={xp} />
                ))
              )}
            </div>
          </div>
        )}
      </motion.section>

      <div className="fitlife-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[1.4px] text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filtro
          </span>
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
              categoryFilter === "all" ? "border-emerald-400 bg-emerald-400/10 text-emerald-400" : "border-border text-muted-foreground"
            }`}
          >
            Todos
          </button>
          {CATEGORY_OPTIONS.map(([category, meta]) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                categoryFilter === category ? "border-emerald-400 bg-emerald-400/10" : "border-border text-muted-foreground"
              }`}
              style={categoryFilter === category ? { color: meta.color } : undefined}
            >
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {customHabits.length === 0 && (
          <div className="fitlife-card p-8 text-center text-sm text-muted-foreground lg:col-span-2">
            Escolha um modelo rápido ou crie seu primeiro hábito do zero.
          </div>
        )}

        {customHabits.length > 0 && filteredHabits.length === 0 && (
          <div className="fitlife-card p-8 text-center text-sm text-muted-foreground lg:col-span-2">
            Nenhum hábito nessa categoria ainda.
          </div>
        )}

        {filteredHabits.map((habit, index) => {
          const log = todayLogs.find((entry) => entry.habitId === habit.id);
          const completed = isCustomHabitComplete(habit, log);
          const category = CUSTOM_HABIT_CATEGORIES[habit.category];
          const difficulty = CUSTOM_HABIT_DIFFICULTIES[habit.difficulty];
          const progressPercent = getProgressPercent(habit, log?.value);

          return (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`fitlife-card p-5 ${habit.isActive ? "" : "opacity-60"}`}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-lg"
                    style={{ borderColor: `${habit.color}55`, backgroundColor: `${habit.color}16` }}
                  >
                    {habit.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold">{habit.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {category.label} · {difficulty.label} · {habit.xp} XP
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(habit)}
                    className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`Editar ${habit.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(habit)}
                    disabled={workingId === habit.id}
                    className="rounded-lg border border-red-500/20 p-2 text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                    aria-label={`Apagar ${habit.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-lg bg-white/[0.04] px-2 py-1 text-[10px] font-bold" style={{ color: category.color }}>
                  {category.icon} {category.label}
                </span>
                <span className="rounded-lg bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-muted-foreground">
                  {TYPE_LABELS[habit.type]}
                </span>
                {habit.reminderEnabled && habit.reminderTime && (
                  <span className="rounded-lg bg-indigo-400/10 px-2 py-1 text-[10px] font-bold text-indigo-300">
                    <Bell className="mr-1 inline h-3 w-3" />
                    {habit.reminderTime}
                  </span>
                )}
                {!habit.isActive && (
                  <span className="rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400">Pausado</span>
                )}
              </div>

              <div className="mb-4 rounded-lg border border-border bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{getProgressText(habit, log?.value)}</span>
                  <span
                    className="rounded-lg px-2 py-1 text-[10px] font-bold"
                    style={{
                      backgroundColor: completed ? `${habit.color}20` : "rgba(255,255,255,0.04)",
                      color: completed ? habit.color : "rgba(226,232,240,0.45)",
                    }}
                  >
                    {completed ? "Concluído" : "Pendente"}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary/50">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progressPercent}%`, backgroundColor: habit.color }}
                  />
                </div>
              </div>

              {habit.type !== "boolean" && habit.isActive && (
                <input
                  type="number"
                  value={
                    habitValueDrafts[habit.id] ??
                    (typeof log?.value === "number" ? String(log.value) : "")
                  }
                  min={0}
                  onChange={(event) => {
                    const rawValue = event.target.value;
                    setHabitValueDrafts((prev) => ({
                      ...prev,
                      [habit.id]: rawValue,
                    }));

                    if (rawValue.trim() === "") return;

                    const parsed = Number(rawValue);
                    if (!Number.isFinite(parsed)) return;

                    setCustomHabitLog(
                      habit.id,
                      Math.max(0, parsed),
                      currentDate
                    ).catch((error) => {
                      console.error(error);
                      toast.error("Nao consegui atualizar o progresso.");
                    });
                  }}
                  onBlur={() => {
                    const rawValue = habitValueDrafts[habit.id];
                    if (rawValue === undefined) return;

                    const clearDraft = () =>
                      setHabitValueDrafts((prev) => {
                        const next = { ...prev };
                        delete next[habit.id];
                        return next;
                      });

                    if (rawValue.trim() === "") {
                      removeCustomHabitLog(habit.id, currentDate)
                        .catch((error) => {
                          console.error(error);
                          toast.error("Nao consegui limpar esse registro.");
                        })
                        .finally(clearDraft);
                      return;
                    }

                    const parsed = Number(rawValue);
                    const normalized = Number.isFinite(parsed)
                      ? Math.max(0, parsed)
                      : 0;

                    setCustomHabitLog(habit.id, normalized, currentDate)
                      .catch((error) => {
                        console.error(error);
                        toast.error("Nao consegui atualizar o progresso.");
                      })
                      .finally(clearDraft);
                  }}
                  placeholder={habit.type === "limit" ? "Valor consumido" : "Progresso de hoje"}
                  className="mb-3 w-full rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-400/50"
                />
              )}

              <button
                type="button"
                onClick={() => handleToggle(habit)}
                disabled={workingId === habit.id || !habit.isActive}
                className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  borderColor: completed ? `${habit.color}55` : "rgba(255,255,255,0.07)",
                  backgroundColor: completed ? `${habit.color}16` : "rgba(255,255,255,0.03)",
                  color: completed ? habit.color : "#e2e8f0",
                }}
              >
                {completed ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {workingId === habit.id ? "Atualizando..." : completed ? "Desfazer hoje" : "Concluir hoje"}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  color: string;
};

function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-white/[0.03] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-3xl font-black" style={{ color }}>{value}</p>
    </div>
  );
}

function StatMiniCard({ label, value, color }: MetricCardProps) {
  return (
    <div className="min-h-[82px] rounded-lg border border-border bg-white/[0.03] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[1.2px] text-muted-foreground">{label}</p>
      <p className="mt-2 truncate text-lg font-black" style={{ color }}>{value}</p>
    </div>
  );
}

type HabitStatRowProps = {
  habit: CustomHabit;
  rate: number;
  streak: number;
  completed30: number;
};

function HabitStatRow({ habit, rate, streak, completed30 }: HabitStatRowProps) {
  return (
    <div className="rounded-lg border border-border bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-base">{habit.icon}</span>
          <span className="truncate text-sm font-bold">{habit.name}</span>
        </div>
        <span className="font-mono text-xs font-black" style={{ color: habit.color }}>{rate}%</span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-secondary/50">
        <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: habit.color }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{completed30}/30 dias</span>
        <span>streak {streak}d</span>
      </div>
    </div>
  );
}

type CategoryXpRowProps = {
  icon: string;
  label: string;
  color: string;
  xp: number;
};

function CategoryXpRow({ icon, label, color, xp }: CategoryXpRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-white/[0.03] px-3 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span>{icon}</span>
        <span className="truncate text-sm font-bold">{label}</span>
      </div>
      <span className="font-mono text-sm font-black" style={{ color }}>+{xp} XP</span>
    </div>
  );
}
