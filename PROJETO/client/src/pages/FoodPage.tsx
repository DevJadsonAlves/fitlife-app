import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  useHabits,
  type FoodEntry,
  type FoodEntryInput,
  type FoodLibraryInput,
  type FoodLibraryItem,
  type FoodServingOption,
  type MealType,
  type SavedMeal,
  type SavedMealInput,
  type UserProfile,
} from "@/contexts/HabitsContext";
import ProgressRing from "@/components/ProgressRing";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  Clock,
  Copy,
  Database,
  Flame,
  Heart,
  Plus,
  Save,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const COLOR = "#84cc16";

type MacroKey = "calories" | "protein" | "carbs" | "fat";
type MealFilter = MealType | "all";
type FoodSectionKey =
  | "goals"
  | "deficit"
  | "distribution"
  | "favorites"
  | "insights"
  | "library"
  | "week";

interface MealForm {
  name: string;
  meal: MealType;
  time: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  saveAsFavorite: boolean;
}

interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface LibraryForm {
  name: string;
  brand: string;
  servingLabel: string;
  servingGrams: string;
  caloriesPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
}

interface FoodCatalogRow {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  serving_label: string | null;
  serving_grams: number | string | null;
  serving_options?: unknown;
  calories_per_100g: number | string | null;
  protein_per_100g: number | string | null;
  carbs_per_100g: number | string | null;
  fat_per_100g: number | string | null;
  source_reference: string | null;
}

interface FoodCatalogAliasRow {
  food_id: string;
  alias: string;
}

interface FoodCatalogItem extends FoodLibraryItem {
  aliases: string[];
  category?: string;
  sourceReference?: string;
}

interface PortionUnitOption {
  unit: string;
  gramsPerUnit: number;
}

const MEALS: Array<{
  value: MealType;
  label: string;
  shortLabel: string;
  targetShare: number;
  color: string;
}> = [
  {
    value: "cafe",
    label: "Cafe da manha",
    shortLabel: "Cafe",
    targetShare: 0.25,
    color: "#f59e0b",
  },
  {
    value: "almoco",
    label: "Almoco",
    shortLabel: "Almoco",
    targetShare: 0.35,
    color: "#84cc16",
  },
  {
    value: "lanche",
    label: "Lanche",
    shortLabel: "Lanche",
    targetShare: 0.15,
    color: "#22d3ee",
  },
  {
    value: "janta",
    label: "Jantar",
    shortLabel: "Jantar",
    targetShare: 0.2,
    color: "#818cf8",
  },
  {
    value: "snack",
    label: "Snack",
    shortLabel: "Snack",
    targetShare: 0.05,
    color: "#ec4899",
  },
];

const MACRO_META: Record<
  MacroKey,
  { label: string; unit: string; color: string; maxSingleMeal: number }
> = {
  calories: {
    label: "Calorias",
    unit: "kcal",
    color: "#f97316",
    maxSingleMeal: 5000,
  },
  protein: {
    label: "Proteina",
    unit: "g",
    color: "#38bdf8",
    maxSingleMeal: 250,
  },
  carbs: { label: "Carbos", unit: "g", color: "#84cc16", maxSingleMeal: 600 },
  fat: { label: "Gordura", unit: "g", color: "#facc15", maxSingleMeal: 250 },
};

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatTimeNow(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createMealForm(meal: MealType = "almoco"): MealForm {
  return {
    name: "",
    meal,
    time: formatTimeNow(),
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    saveAsFavorite: false,
  };
}

function createLibraryForm(): LibraryForm {
  return {
    name: "",
    brand: "",
    servingLabel: "100g",
    servingGrams: "100",
    caloriesPer100g: "",
    proteinPer100g: "",
    carbsPer100g: "",
    fatPer100g: "",
  };
}

function getMealMeta(meal: MealType) {
  return MEALS.find(item => item.value === meal) || MEALS[1];
}

function parseFoodNumber(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function parseDecimalFoodNumber(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function roundFoodValue(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function mapFoodCatalogRow(
  row: FoodCatalogRow,
  aliases: string[]
): FoodCatalogItem {
  const servingOptions = Array.isArray(row.serving_options)
    ? normalizeFoodServingOptions(row.serving_options as FoodServingOption[])
    : [];

  return {
    id: row.id,
    name: row.name,
    brand: row.brand || undefined,
    servingLabel: row.serving_label || "100g",
    servingGrams: Number(row.serving_grams ?? 100),
    servingOptions,
    caloriesPer100g: Number(row.calories_per_100g ?? 0),
    proteinPer100g: Number(row.protein_per_100g ?? 0),
    carbsPer100g: Number(row.carbs_per_100g ?? 0),
    fatPer100g: Number(row.fat_per_100g ?? 0),
    source: "official",
    aliases,
    category: row.category || undefined,
    sourceReference: row.source_reference || undefined,
  };
}

function getFoodSearchScore(food: FoodCatalogItem, rawQuery: string): number {
  const query = normalizeSearchText(rawQuery);
  if (!query)
    return food.source === "custom"
      ? 120
      : food.source === "imported"
        ? 110
        : 100;

  const name = normalizeSearchText(food.name);
  const brand = normalizeSearchText(food.brand || "");
  const category = normalizeSearchText(food.category || "");
  const aliases = food.aliases.map(normalizeSearchText);

  if (name === query) return 1000;
  if (aliases.includes(query)) return 940;
  if (name.startsWith(query)) return 880;
  if (aliases.some(alias => alias.startsWith(query))) return 820;
  if (name.includes(query)) return 760;
  if (aliases.some(alias => alias.includes(query))) return 700;
  if (brand.includes(query)) return 560;
  if (category.includes(query)) return 480;

  return 0;
}

function getPercent(current: number, target: number): number {
  if (target <= 0) return current > 0 ? 100 : 0;
  return Math.min((current / target) * 100, 100);
}

function sumFoodEntries(entries: FoodEntry[]): NutritionTotals {
  return entries.reduce<NutritionTotals>(
    (totals, entry) => ({
      calories: totals.calories + entry.calories,
      protein: totals.protein + entry.protein,
      carbs: totals.carbs + entry.carbs,
      fat: totals.fat + entry.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function getFoodPortion(
  food: Pick<
    FoodLibraryItem,
    "caloriesPer100g" | "proteinPer100g" | "carbsPer100g" | "fatPer100g"
  >,
  grams: number
): NutritionTotals {
  const safeGrams = Math.max(0, grams);
  const factor = safeGrams / 100;

  return {
    calories: roundFoodValue(food.caloriesPer100g * factor),
    protein: roundFoodValue(food.proteinPer100g * factor),
    carbs: roundFoodValue(food.carbsPer100g * factor),
    fat: roundFoodValue(food.fatPer100g * factor),
  };
}

function formatCompactNumber(value: number, decimals = 1): string {
  const rounded = roundFoodValue(value, decimals);
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

function normalizeFoodServingOptions(
  options: FoodServingOption[] | undefined
): FoodServingOption[] {
  if (!Array.isArray(options)) return [];

  const unique = new Map<string, FoodServingOption>();

  for (const option of options) {
    const label = String(option?.label || "").trim();
    const grams = Number(option?.grams);
    if (!label || !Number.isFinite(grams) || grams <= 0) continue;

    const normalized = Math.round(grams * 100) / 100;
    const key = `${label.toLowerCase()}::${normalized}`;
    if (!unique.has(key)) {
      unique.set(key, { label, grams: normalized });
    }
  }

  return Array.from(unique.values());
}

function buildFoodServingOptions(
  food: Pick<FoodLibraryItem, "servingLabel" | "servingGrams" | "servingOptions">
): FoodServingOption[] {
  const unique = new Map<string, FoodServingOption>();

  const addOption = (label: string, grams: number) => {
    const cleanLabel = label.trim();
    const cleanGrams = Math.round(Math.max(0.1, grams) * 100) / 100;
    const key = `${cleanLabel.toLowerCase()}::${cleanGrams}`;
    if (!unique.has(key)) {
      unique.set(key, { label: cleanLabel, grams: cleanGrams });
    }
  };

  normalizeFoodServingOptions(food.servingOptions).forEach(option =>
    addOption(option.label, option.grams)
  );

  addOption(food.servingLabel || "Porcao", food.servingGrams || 100);
  addOption("100g", 100);
  addOption("1g", 1);
  addOption("1 colher sopa", 15);
  addOption("1 colher cha", 5);
  addOption("1 xicara", 240);
  addOption("1ml", 1);

  return Array.from(unique.values());
}

function normalizeServingUnitLabel(label: string): string {
  const normalized = normalizeSearchText(label).replace(/\s+/g, " ");
  if (!normalized) return "porcao";

  if (
    normalized === "g" ||
    normalized === "gr" ||
    normalized === "grama" ||
    normalized === "gramas"
  ) {
    return "g";
  }

  if (
    normalized === "ml" ||
    normalized === "mililitro" ||
    normalized === "mililitros"
  ) {
    return "ml";
  }

  if (normalized.startsWith("xic")) return "xicara";
  if (normalized.startsWith("fatia")) return "fatia";
  if (
    normalized === "un" ||
    normalized === "und" ||
    normalized.startsWith("unidade")
  ) {
    return "unidade";
  }

  if (normalized.includes("colher") && normalized.includes("sopa"))
    return "colher de sopa";
  if (
    normalized.includes("colher") &&
    (normalized.includes("cha") || normalized.includes("te"))
  ) {
    return "colher de cha";
  }

  return normalized;
}

function parseServingLabel(
  label: string
): { baseAmount: number; unitLabel: string } {
  const clean = String(label || "").trim();
  const match = clean.match(/^(\d+(?:[.,]\d+)?)\s*(.+)$/i);

  if (!match) {
    return {
      baseAmount: 1,
      unitLabel: normalizeServingUnitLabel(clean || "porcao"),
    };
  }

  const baseAmount = Number(match[1].replace(",", "."));
  const unitLabel = normalizeServingUnitLabel(match[2]);

  if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
    return { baseAmount: 1, unitLabel };
  }

  return { baseAmount, unitLabel };
}

function buildPortionUnitOptions(
  food: Pick<FoodLibraryItem, "servingLabel" | "servingGrams" | "servingOptions">
): PortionUnitOption[] {
  const unique = new Map<string, PortionUnitOption>();

  const add = (option: FoodServingOption) => {
    const safeGrams = Math.max(0.1, option.grams);
    const { baseAmount, unitLabel } = parseServingLabel(option.label);
    if (!unitLabel) return;

    const gramsPerUnit = roundFoodValue(safeGrams / Math.max(0.1, baseAmount), 4);

    if (!unique.has(unitLabel)) {
      unique.set(unitLabel, { unit: unitLabel, gramsPerUnit });
    }
  };

  buildFoodServingOptions(food).forEach(add);

  if (!unique.has("g")) {
    unique.set("g", { unit: "g", gramsPerUnit: 1 });
  }

  return Array.from(unique.values());
}

function getPortionUnitByKey(
  options: PortionUnitOption[],
  key: string | undefined
): PortionUnitOption {
  if (!key) return options[0];

  const [encodedUnit, encodedGramsPerUnit] = key.split("::");
  const unit = decodeURIComponent(encodedUnit || "");
  const gramsPerUnit = Number(encodedGramsPerUnit);

  return (
    options.find(
      option =>
        option.unit === unit &&
        Math.abs(option.gramsPerUnit - gramsPerUnit) < 0.0001
    ) ||
    options[0]
  );
}

function getPortionUnitKey(option: PortionUnitOption): string {
  return `${encodeURIComponent(option.unit)}::${option.gramsPerUnit}`;
}

function formatAmountWithUnit(amount: number, unit: string): string {
  const amountLabel = formatCompactNumber(amount, 2);
  if (unit === "g" || unit === "ml") return `${amountLabel}${unit}`;
  return `${amountLabel} ${unit}`;
}

function getPortionDescription(
  option: PortionUnitOption,
  amount: number,
  grams: number
): string {
  const amountLabel = formatAmountWithUnit(amount, option.unit);
  const gramsLabel = formatCompactNumber(grams, 1);
  return `${amountLabel} (~${gramsLabel}g)`;
}

function toSavedMealInput(
  entry: FoodEntry | FoodEntryInput | SavedMeal
): SavedMealInput {
  return {
    name: entry.name,
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    meal: entry.meal,
  };
}

function toFoodInput(entry: SavedMeal, time?: string): FoodEntryInput {
  return {
    name: entry.name,
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    meal: entry.meal,
    time,
  };
}

function isSameSavedMeal(savedMeal: SavedMeal, entry: SavedMealInput): boolean {
  return (
    savedMeal.name.trim().toLowerCase() === entry.name.trim().toLowerCase() &&
    savedMeal.meal === entry.meal &&
    savedMeal.calories === entry.calories &&
    savedMeal.protein === entry.protein &&
    savedMeal.carbs === entry.carbs &&
    savedMeal.fat === entry.fat
  );
}

function estimateMaintenanceCalories(
  profile: UserProfile | null
): number | null {
  if (!profile) return null;

  const bmr =
    profile.gender === "male"
      ? 88.362 +
        13.397 * profile.weight +
        4.799 * profile.height -
        5.677 * profile.age
      : 447.593 +
        9.247 * profile.weight +
        3.098 * profile.height -
        4.33 * profile.age;

  const activityMultipliers: Record<UserProfile["activityLevel"], number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  return Math.round(bmr * activityMultipliers[profile.activityLevel]);
}

function getDeficitTone(
  deficit: number | null,
  hasEntries: boolean
): { label: string; color: string; hint: string } {
  if (deficit === null) {
    return {
      label: "Perfil incompleto",
      color: "#94a3b8",
      hint: "Preencha o perfil para estimar a manutencao.",
    };
  }

  if (!hasEntries) {
    return {
      label: "Aguardando refeicoes",
      color: "#94a3b8",
      hint: "Registre comida para ver o saldo parcial do dia.",
    };
  }

  if (deficit < 0) {
    return {
      label: "Superavit",
      color: "#ef4444",
      hint: "Voce passou da manutencao estimada.",
    };
  }

  if (deficit < 300) {
    return {
      label: "Deficit baixo",
      color: "#facc15",
      hint: "Pode emagrecer, mas tende a ser mais lento.",
    };
  }

  if (deficit <= 750) {
    return {
      label: "Deficit bom",
      color: "#84cc16",
      hint: "Faixa equilibrada para perda gradual.",
    };
  }

  return {
    label: "Deficit alto",
    color: "#f97316",
    hint: "Acompanhe fome, energia, sono e treino.",
  };
}

export default function FoodPage() {
  const {
    foodEntries,
    savedMeals,
    foodLibrary,
    addFoodEntry,
    removeFoodEntry,
    addSavedMeal,
    removeSavedMeal,
    addFoodLibraryItem,
    removeFoodLibraryItem,
    goals,
    setGoals,
    currentDate,
    userProfile,
  } = useHabits();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MealForm>(() => createMealForm());
  const [activeMeal, setActiveMeal] = useState<MealFilter>("all");
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyingYesterday, setCopyingYesterday] = useState(false);
  const [busyFavoriteId, setBusyFavoriteId] = useState<string | null>(null);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [goalInput, setGoalInput] = useState<Record<MacroKey, string>>(() => ({
    calories: String(goals.calories),
    protein: String(goals.protein),
    carbs: String(goals.carbs),
    fat: String(goals.fat),
  }));
  const [foodPortionAmountInput, setFoodPortionAmountInput] = useState<
    Record<string, string>
  >({});
  const [foodServingSelection, setFoodServingSelection] = useState<
    Record<string, string>
  >({});
  const [showLibraryForm, setShowLibraryForm] = useState(false);
  const [openSections, setOpenSections] = useState<Record<FoodSectionKey, boolean>>({
    goals: false,
    deficit: false,
    distribution: false,
    favorites: false,
    insights: false,
    library: false,
    week: false,
  });
  const [libraryForm, setLibraryForm] = useState<LibraryForm>(() =>
    createLibraryForm()
  );
  const [isSavingLibraryItem, setIsSavingLibraryItem] = useState(false);
  const [busyFoodId, setBusyFoodId] = useState<string | null>(null);
  const [officialFoods, setOfficialFoods] = useState<FoodCatalogItem[]>([]);
  const [isLoadingOfficialFoods, setIsLoadingOfficialFoods] = useState(true);
  const [officialFoodsError, setOfficialFoodsError] = useState<string | null>(
    null
  );

  const currentDateKey = useMemo(
    () => formatDateKey(currentDate),
    [currentDate]
  );
  const yesterdayKey = useMemo(() => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 1);
    return formatDateKey(date);
  }, [currentDate]);

  const todayEntries = useMemo(
    () => foodEntries.filter(entry => entry.date === currentDateKey),
    [foodEntries, currentDateKey]
  );
  const yesterdayEntries = useMemo(
    () => foodEntries.filter(entry => entry.date === yesterdayKey),
    [foodEntries, yesterdayKey]
  );
  const sortedTodayEntries = useMemo(
    () => [...todayEntries].sort((a, b) => b.time.localeCompare(a.time)),
    [todayEntries]
  );
  const filteredEntries = useMemo(
    () =>
      activeMeal === "all"
        ? sortedTodayEntries
        : sortedTodayEntries.filter(entry => entry.meal === activeMeal),
    [activeMeal, sortedTodayEntries]
  );
  const todayTotals = useMemo(
    () => sumFoodEntries(todayEntries),
    [todayEntries]
  );
  const maintenanceCalories = useMemo(
    () => estimateMaintenanceCalories(userProfile),
    [userProfile]
  );
  const plannedDeficit =
    maintenanceCalories === null ? null : maintenanceCalories - goals.calories;
  const currentDeficit =
    maintenanceCalories === null
      ? null
      : maintenanceCalories - todayTotals.calories;
  const deficitTone = useMemo(
    () => getDeficitTone(currentDeficit, todayEntries.length > 0),
    [currentDeficit, todayEntries.length]
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(media.matches);

    sync();
    media.addEventListener("change", sync);

    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setGoalInput({
      calories: String(goals.calories),
      protein: String(goals.protein),
      carbs: String(goals.carbs),
      fat: String(goals.fat),
    });
  }, [goals.calories, goals.protein, goals.carbs, goals.fat]);

  const handleSectionOpenChange = (key: FoodSectionKey, open: boolean) => {
    setOpenSections(prev => {
      if (isDesktop) {
        return { ...prev, [key]: open };
      }

      const next = Object.keys(prev).reduce(
        (acc, currentKey) => {
          acc[currentKey as FoodSectionKey] = false;
          return acc;
        },
        {} as Record<FoodSectionKey, boolean>
      );

      if (open) next[key] = true;
      return next;
    });
  };

  useEffect(() => {
    let alive = true;

    const loadOfficialFoods = async () => {
      setIsLoadingOfficialFoods(true);
      setOfficialFoodsError(null);

      try {
        const [
          { data: catalogRows, error: catalogError },
          { data: aliasRows, error: aliasError },
        ] = await Promise.all([
          supabase
            .from("food_catalog")
            .select("*")
            .eq("is_active", true)
            .order("name", { ascending: true }),
          supabase.from("food_catalog_aliases").select("food_id, alias"),
        ]);

        if (catalogError) throw catalogError;
        if (aliasError) throw aliasError;

        const aliasMap = new Map<string, string[]>();
        for (const row of (aliasRows || []) as FoodCatalogAliasRow[]) {
          const aliases = aliasMap.get(row.food_id) || [];
          aliases.push(row.alias);
          aliasMap.set(row.food_id, aliases);
        }

        if (!alive) return;

        setOfficialFoods(
          ((catalogRows || []) as FoodCatalogRow[]).map(row =>
            mapFoodCatalogRow(row, aliasMap.get(row.id) || [])
          )
        );
      } catch (error) {
        console.error(error);
        if (!alive) return;
        setOfficialFoods([]);
        setOfficialFoodsError(
          "Catalogo oficial indisponivel. Rode o schema atualizado da alimentacao no Supabase."
        );
      } finally {
        if (alive) setIsLoadingOfficialFoods(false);
      }
    };

    loadOfficialFoods();

    return () => {
      alive = false;
    };
  }, []);

  const allLibraryFoods = useMemo(() => {
    const customKeys = new Set(
      foodLibrary.map(
        food =>
          `${normalizeSearchText(food.name)}::${normalizeSearchText(food.brand || "")}`
      )
    );

    const dedupedOfficialFoods = officialFoods.filter(food => {
      const key = `${normalizeSearchText(food.name)}::${normalizeSearchText(food.brand || "")}`;
      return !customKeys.has(key);
    });

    const customFoods: FoodCatalogItem[] = foodLibrary.map(food => ({
      ...food,
      aliases: [],
    }));

    return [...customFoods, ...dedupedOfficialFoods];
  }, [foodLibrary, officialFoods]);

  const filteredLibraryFoods = useMemo(() => {
    const query = librarySearch.trim();

    return allLibraryFoods
      .map(food => ({ food, score: getFoodSearchScore(food, query) }))
      .filter(({ score }) => (query ? score > 0 : true))
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        if (left.food.source !== right.food.source) {
          if (left.food.source === "custom") return -1;
          if (right.food.source === "custom") return 1;
        }
        return left.food.name.localeCompare(right.food.name, "pt-BR");
      })
      .slice(0, 12)
      .map(({ food }) => food);
  }, [allLibraryFoods, librarySearch]);

  const hasLibrarySearch = librarySearch.trim().length > 0;

  const customLibraryFoods = useMemo(
    () =>
      [...foodLibrary].sort((left, right) =>
        left.name.localeCompare(right.name, "pt-BR")
      ),
    [foodLibrary]
  );

  const visibleLibraryFoods = hasLibrarySearch
    ? filteredLibraryFoods
    : customLibraryFoods;

  const macroCards = useMemo(() => {
    return (Object.keys(MACRO_META) as MacroKey[]).map(key => ({
      key,
      ...MACRO_META[key],
      current: todayTotals[key],
      target: goals[key],
      percent: getPercent(todayTotals[key], goals[key]),
    }));
  }, [goals, todayTotals]);

  const mealSummaries = useMemo(() => {
    return MEALS.map(meal => {
      const entries = todayEntries.filter(entry => entry.meal === meal.value);
      const totals = sumFoodEntries(entries);
      const target = Math.round(goals.calories * meal.targetShare);
      return {
        ...meal,
        entries,
        totals,
        target,
        percent: getPercent(totals.calories, target),
      };
    });
  }, [goals.calories, todayEntries]);

  const weekData = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - ((currentDate.getDay() + 6) % 7));

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const dateKey = formatDateKey(date);
      const entries = foodEntries.filter(entry => entry.date === dateKey);
      const totals = sumFoodEntries(entries);
      return {
        label: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"][index],
        date,
        dateKey,
        totals,
        meals: entries.length,
        percent: getPercent(totals.calories, goals.calories),
        isCurrentDate: dateKey === currentDateKey,
      };
    });
  }, [currentDate, currentDateKey, foodEntries, goals.calories]);

  const insights = useMemo(() => {
    const notes: string[] = [];
    if (todayEntries.length === 0)
      notes.push(
        "Registre a primeira refeicao para o painel comecar a trabalhar por voce."
      );
    if (todayTotals.calories > goals.calories) {
      notes.push(
        "Voce passou da meta calorica do dia. Nas proximas refeicoes, priorize proteina magra e volume."
      );
    } else if (
      goals.calories - todayTotals.calories > 500 &&
      todayEntries.length > 0
    ) {
      notes.push(
        "Ainda existe uma boa margem de calorias para fechar o dia sem improviso."
      );
    }
    if (todayTotals.protein < goals.protein * 0.6 && todayEntries.length > 0) {
      notes.push(
        "Proteina esta baixa para o ritmo do dia. Vale puxar uma refeicao mais forte nisso."
      );
    }
    if (savedMeals.length === 0)
      notes.push(
        "Salve refeicoes frequentes como favoritas para registrar em um toque."
      );
    return notes.slice(0, 3);
  }, [
    goals.calories,
    goals.protein,
    savedMeals.length,
    todayEntries.length,
    todayTotals,
  ]);

  const updateForm = <K extends keyof MealForm>(key: K, value: MealForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const updateLibraryForm = <K extends keyof LibraryForm>(
    key: K,
    value: LibraryForm[K]
  ) => {
    setLibraryForm(prev => ({ ...prev, [key]: value }));
  };

  const handleGoalChange = (key: MacroKey, value: string) => {
    setGoalInput(prev => ({ ...prev, [key]: value }));
    if (value.trim() === "") return;

    const minimum = key === "calories" ? 500 : 0;
    const parsedValue = Number.parseInt(value, 10);
    const parsed = Number.isFinite(parsedValue)
      ? Math.max(minimum, parsedValue)
      : minimum;
    setGoals({ [key]: parsed } as Partial<typeof goals>);
  };

  const handleGoalBlur = (key: MacroKey) => {
    const minimum = key === "calories" ? 500 : 0;
    const parsedValue = Number.parseInt(goalInput[key], 10);
    const normalized = Number.isFinite(parsedValue)
      ? Math.max(minimum, parsedValue)
      : minimum;

    setGoalInput(prev => ({ ...prev, [key]: String(normalized) }));
    setGoals({ [key]: normalized } as Partial<typeof goals>);
  };

  const validateForm = (): FoodEntryInput | null => {
    const entry = {
      name: form.name.trim(),
      meal: form.meal,
      time: form.time || formatTimeNow(),
      calories: parseDecimalFoodNumber(form.calories),
      protein: parseDecimalFoodNumber(form.protein),
      carbs: parseDecimalFoodNumber(form.carbs),
      fat: parseDecimalFoodNumber(form.fat),
    };

    if (!entry.name) {
      toast.error("Digite o nome da refeicao.");
      return null;
    }
    if (
      entry.calories <= 0 &&
      entry.protein <= 0 &&
      entry.carbs <= 0 &&
      entry.fat <= 0
    ) {
      toast.error("Informe pelo menos calorias ou um macro.");
      return null;
    }

    const invalidMacro = (Object.keys(MACRO_META) as MacroKey[]).find(
      key => entry[key] > MACRO_META[key].maxSingleMeal
    );
    if (invalidMacro) {
      toast.error(
        `${MACRO_META[invalidMacro].label} parece alto demais para uma unica refeicao.`
      );
      return null;
    }

    return entry;
  };

  const handleSubmit = async () => {
    const entry = validateForm();
    if (!entry) return;

    setIsSubmitting(true);
    try {
      await addFoodEntry(entry);
      if (form.saveAsFavorite) {
        const favorite = toSavedMealInput(entry);
        if (!savedMeals.some(meal => isSameSavedMeal(meal, favorite)))
          await addSavedMeal(favorite);
      }
      toast.success(
        form.saveAsFavorite
          ? "Refeicao registrada e salva nos favoritos."
          : "Refeicao registrada."
      );
      setForm(createMealForm(form.meal));
      setShowForm(false);
    } catch (error) {
      console.error(error);
      toast.error(
        "Nao consegui salvar. Confira se o schema de Alimentacao foi aplicado no Supabase."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolveLibraryPortion = (food: FoodLibraryItem) => {
    const options = buildPortionUnitOptions(food);
    const selectedOption = getPortionUnitByKey(
      options,
      foodServingSelection[food.id]
    );
    const amount = Math.max(
      0.1,
      parseDecimalFoodNumber(foodPortionAmountInput[food.id] || "1") || 1
    );
    const grams = Math.max(0.1, selectedOption.gramsPerUnit * amount);
    const amountLabel = formatAmountWithUnit(amount, selectedOption.unit);
    const description = getPortionDescription(selectedOption, amount, grams);

    return {
      options,
      selectedOption,
      amount,
      amountLabel,
      grams,
      description,
    };
  };

  const handleUseLibraryFoodInForm = (food: FoodLibraryItem) => {
    const { grams, description } = resolveLibraryPortion(food);
    const macros = getFoodPortion(food, grams);
    setForm(prev => ({
      ...prev,
      name: `${food.name} (${description})`,
      calories: String(macros.calories),
      protein: String(macros.protein),
      carbs: String(macros.carbs),
      fat: String(macros.fat),
    }));
    setShowForm(true);
  };

  const handleAddLibraryFoodNow = async (food: FoodLibraryItem) => {
    const { grams, description } = resolveLibraryPortion(food);
    const macros = getFoodPortion(food, grams);
    setBusyFoodId(food.id);

    try {
      await addFoodEntry({
        name: `${food.name} (${description})`,
        meal: form.meal,
        time: formatTimeNow(),
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
      });
      toast.success(
        `${food.name} lancado em ${getMealMeta(form.meal).shortLabel}.`
      );
    } catch (error) {
      console.error(error);
      toast.error("Nao consegui lancar esse alimento.");
    } finally {
      setBusyFoodId(null);
    }
  };

  const validateLibraryForm = (): FoodLibraryInput | null => {
    const name = libraryForm.name.trim();
    const servingGrams = Math.max(
      0.1,
      parseDecimalFoodNumber(libraryForm.servingGrams)
    );
    const caloriesPer100g = parseDecimalFoodNumber(libraryForm.caloriesPer100g);
    const proteinPer100g = parseDecimalFoodNumber(libraryForm.proteinPer100g);
    const carbsPer100g = parseDecimalFoodNumber(libraryForm.carbsPer100g);
    const fatPer100g = parseDecimalFoodNumber(libraryForm.fatPer100g);

    if (!name) {
      toast.error("Digite o nome do alimento.");
      return null;
    }

    if (
      caloriesPer100g <= 0 &&
      proteinPer100g <= 0 &&
      carbsPer100g <= 0 &&
      fatPer100g <= 0
    ) {
      toast.error("Informe os macros por 100g.");
      return null;
    }

    return {
      name,
      brand: libraryForm.brand.trim() || undefined,
      servingLabel: libraryForm.servingLabel.trim() || `${servingGrams}g`,
      servingGrams,
      servingOptions: [
        {
          label: libraryForm.servingLabel.trim() || `${servingGrams}g`,
          grams: servingGrams,
        },
        {
          label: "100g",
          grams: 100,
        },
      ],
      caloriesPer100g,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
      source: "custom",
    };
  };

  const handleSaveLibraryFood = async () => {
    const item = validateLibraryForm();
    if (!item) return;

    setIsSavingLibraryItem(true);
    try {
      await addFoodLibraryItem(item);
      toast.success("Alimento salvo na biblioteca.");
      setLibraryForm(createLibraryForm());
      setShowLibraryForm(false);
      setLibrarySearch(item.name);
    } catch (error) {
      console.error(error);
      toast.error(
        "Nao consegui salvar. Rode o schema da biblioteca no Supabase."
      );
    } finally {
      setIsSavingLibraryItem(false);
    }
  };

  const handleRemoveLibraryFood = async (food: FoodLibraryItem) => {
    if (food.source === "curated" || food.source === "official") return;

    setBusyFoodId(food.id);
    try {
      await removeFoodLibraryItem(food.id);
      toast.success("Alimento removido da biblioteca.");
    } catch (error) {
      console.error(error);
      toast.error("Nao consegui remover esse alimento.");
    } finally {
      setBusyFoodId(null);
    }
  };

  const handleUseFavorite = async (meal: SavedMeal) => {
    setBusyFavoriteId(meal.id);
    try {
      await addFoodEntry(toFoodInput(meal, formatTimeNow()));
      toast.success(`${meal.name} registrada.`);
    } catch (error) {
      console.error(error);
      toast.error("Nao consegui registrar essa favorita.");
    } finally {
      setBusyFavoriteId(null);
    }
  };

  const handleSaveEntryAsFavorite = async (entry: FoodEntry) => {
    const favorite = toSavedMealInput(entry);
    if (savedMeals.some(meal => isSameSavedMeal(meal, favorite))) {
      toast.info("Essa refeicao ja esta nos favoritos.");
      return;
    }

    setBusyEntryId(entry.id);
    try {
      await addSavedMeal(favorite);
      toast.success("Refeicao salva como favorita.");
    } catch (error) {
      console.error(error);
      toast.error(
        "Nao consegui salvar favorita. Rode o schema de Alimentacao 2.0 no Supabase."
      );
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleRemoveEntry = async (entry: FoodEntry) => {
    setBusyEntryId(entry.id);
    try {
      await removeFoodEntry(entry.id);
      toast.success("Refeicao removida.");
    } catch (error) {
      console.error(error);
      toast.error("Nao consegui remover essa refeicao.");
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleRemoveFavorite = async (meal: SavedMeal) => {
    setBusyFavoriteId(meal.id);
    try {
      await removeSavedMeal(meal.id);
      toast.success("Favorita removida.");
    } catch (error) {
      console.error(error);
      toast.error("Nao consegui remover essa favorita.");
    } finally {
      setBusyFavoriteId(null);
    }
  };

  const handleCopyYesterday = async () => {
    if (yesterdayEntries.length === 0) {
      toast.info("Ontem nao tem refeicoes para copiar.");
      return;
    }

    setCopyingYesterday(true);
    try {
      for (const entry of yesterdayEntries) {
        await addFoodEntry({
          name: entry.name,
          meal: entry.meal,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          time: entry.time,
        });
      }
      toast.success(
        `${yesterdayEntries.length} refeicoes copiadas de ontem.`
      );
    } catch (error) {
      console.error(error);
      toast.error("Nao consegui copiar todas as refeicoes de ontem.");
    } finally {
      setCopyingYesterday(false);
    }
  };

  const calorieStatus =
    todayTotals.calories === 0
      ? "Sem registros ainda"
      : todayTotals.calories <= goals.calories
        ? "Dentro da meta"
        : "Acima da meta";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6" style={{ color: COLOR }} />
            <h2 className="text-2xl font-bold" style={{ color: COLOR }}>
              Alimentacao
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Macros, metas e refeicoes frequentes no mesmo lugar.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <button
            type="button"
            onClick={handleCopyYesterday}
            disabled={copyingYesterday}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/60 px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-lime-400/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
            {copyingYesterday ? "Copiando..." : "Copiar ontem"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(createMealForm(form.meal));
              setShowForm(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90"
            style={{ backgroundColor: COLOR }}
          >
            <Plus className="h-4 w-4" />
            Nova refeicao
          </button>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border/50 bg-card p-5"
        >
          <div className="flex items-center gap-4">
            <ProgressRing
              percent={getPercent(todayTotals.calories, goals.calories)}
              size={112}
              strokeWidth={8}
              color={MACRO_META.calories.color}
              glowColor={MACRO_META.calories.color}
              label={`${todayTotals.calories}`}
              sublabel="kcal"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Resumo do dia
              </p>
              <h3 className="mt-2 text-xl font-black">{calorieStatus}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Meta de {goals.calories} kcal para{" "}
                {currentDate.toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                })}
                .
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
              <span
                className="block text-lg font-black"
                style={{ color: COLOR }}
              >
                {todayEntries.length}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                refeicoes
              </span>
            </div>
            <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
              <span className="block text-lg font-black text-cyan-300">
                {todayTotals.protein}g
              </span>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                proteina
              </span>
            </div>
            <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
              <span className="block text-lg font-black text-amber-300">
                {Math.max(goals.calories - todayTotals.calories, 0)}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                restam
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="rounded-lg border border-border/50 bg-card p-5"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" style={{ color: COLOR }} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Hoje no prato
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                setOpenSections(prev => ({ ...prev, goals: !prev.goals }))
              }
              className="rounded-lg border border-border/60 px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:border-lime-400/50 hover:text-foreground"
            >
              Ajustar metas
            </button>
          </div>
          <div className="space-y-3">
            {macroCards.map(macro => (
              <div
                key={macro.key}
                className="rounded-lg border border-border/50 bg-secondary/20 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {macro.label}
                    </p>
                    <p
                      className="mt-1 font-mono text-lg font-black"
                      style={{ color: macro.color }}
                    >
                      {macro.current}
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        / {macro.target} {macro.unit}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">
                    {Math.round(macro.percent)}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-md bg-white/5">
                <div
                  className="h-full rounded-md transition-all"
                  style={{
                    width: `${macro.percent}%`,
                      backgroundColor: macro.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <FoodSection
        title="Metas e macros"
        icon={Target}
        color={COLOR}
        open={openSections.goals}
        onOpenChange={open => handleSectionOpenChange("goals", open)}
        summary={`${goals.calories} kcal | ${goals.protein}g proteina`}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {macroCards.map(macro => (
            <div
              key={macro.key}
              className="rounded-lg border border-border/50 bg-secondary/20 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {macro.label}
                  </p>
                  <p
                    className="mt-2 font-mono text-2xl font-black"
                    style={{ color: macro.color }}
                  >
                    {macro.current}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {macro.unit}
                    </span>
                  </p>
                </div>
                <label className="text-right">
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                    meta
                  </span>
                  <input
                    type="number"
                    min={macro.key === "calories" ? 500 : 0}
                    value={goalInput[macro.key]}
                    onChange={event =>
                      handleGoalChange(macro.key, event.target.value)
                    }
                    onBlur={() => handleGoalBlur(macro.key)}
                    className="mt-1 w-20 rounded-md border border-border/60 bg-background/40 px-2 py-1 text-right font-mono text-sm outline-none transition-colors focus:border-lime-400/60"
                  />
                </label>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-md bg-white/5">
                <div
                  className="h-full rounded-md transition-all"
                  style={{
                    width: `${macro.percent}%`,
                    backgroundColor: macro.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </FoodSection>

      <FoodSection
        title="Deficit calorico"
        icon={Flame}
        color={deficitTone.color}
        open={openSections.deficit}
        onOpenChange={open => handleSectionOpenChange("deficit", open)}
        summary={deficitTone.label}
      >

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Manutencao
            </p>
            <p className="mt-2 font-mono text-2xl font-black text-foreground">
              {maintenanceCalories ?? "--"}
              <span className="ml-1 text-xs text-muted-foreground">kcal</span>
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Meta atual
            </p>
            <p
              className="mt-2 font-mono text-2xl font-black"
              style={{ color: COLOR }}
            >
              {goals.calories}
              <span className="ml-1 text-xs text-muted-foreground">kcal</span>
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Deficit planejado
            </p>
            <p className="mt-2 font-mono text-2xl font-black text-cyan-300">
              {plannedDeficit === null ? "--" : Math.max(plannedDeficit, 0)}
              <span className="ml-1 text-xs text-muted-foreground">kcal</span>
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Saldo parcial
            </p>
            <p
              className="mt-2 font-mono text-2xl font-black"
              style={{ color: deficitTone.color }}
            >
              {currentDeficit === null || todayEntries.length === 0
                ? "--"
                : currentDeficit}
              <span className="ml-1 text-xs text-muted-foreground">kcal</span>
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border/50 bg-background/30 p-4">
          <p className="text-sm text-muted-foreground">
            {deficitTone.hint} Deficit = manutencao estimada menos calorias
            consumidas.
          </p>
        </div>
      </FoodSection>

      <FoodSection
        title="Biblioteca de alimentos"
        icon={Database}
        color={COLOR}
        open={openSections.library}
        onOpenChange={open => handleSectionOpenChange("library", open)}
        summary={`${foodLibrary.length} meus  |  ${officialFoods.length} oficiais`}
        action={
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              handleSectionOpenChange("library", true);
              setShowLibraryForm(current => !current);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-lime-400/50 hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Novo alimento
          </button>
        }
      >

        <div className="grid gap-3 lg:grid-cols-[1fr_170px]">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={librarySearch}
              onChange={event => setLibrarySearch(event.target.value)}
              placeholder="Buscar arroz, frango, banana, whey..."
              className="w-full rounded-lg border border-border/60 bg-secondary/30 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-lime-400/60"
            />
          </label>
          <select
            value={form.meal}
            onChange={event =>
              updateForm("meal", event.target.value as MealType)
            }
            className="rounded-lg border border-border/60 bg-secondary/30 px-4 py-3 text-sm outline-none transition-colors focus:border-lime-400/60"
          >
            {MEALS.map(meal => (
              <option key={meal.value} value={meal.value}>
                {meal.label}
              </option>
            ))}
          </select>
        </div>

        <AnimatePresence>
          {showLibraryForm && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 rounded-lg border border-border/50 bg-secondary/20 p-4"
            >
              <div className="grid gap-3 lg:grid-cols-2">
                <input
                  type="text"
                  value={libraryForm.name}
                  onChange={event =>
                    updateLibraryForm("name", event.target.value)
                  }
                  placeholder="Nome do alimento"
                  className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-sm outline-none transition-colors focus:border-lime-400/60"
                />
                <input
                  type="text"
                  value={libraryForm.brand}
                  onChange={event =>
                    updateLibraryForm("brand", event.target.value)
                  }
                  placeholder="Marca opcional"
                  className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-sm outline-none transition-colors focus:border-lime-400/60"
                />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <input
                  type="text"
                  value={libraryForm.servingLabel}
                  onChange={event =>
                    updateLibraryForm("servingLabel", event.target.value)
                  }
                  placeholder="Porcao"
                  className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-sm outline-none transition-colors focus:border-lime-400/60"
                />
                <input
                  type="number"
                  min={0.1}
                  step="0.1"
                  value={libraryForm.servingGrams}
                  onChange={event =>
                    updateLibraryForm("servingGrams", event.target.value)
                  }
                  placeholder="g"
                  className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-lime-400/60"
                />
                {(Object.keys(MACRO_META) as MacroKey[]).map(key => (
                  <input
                    key={key}
                    type="number"
                    min={0}
                    step="0.1"
                    value={libraryForm[`${key}Per100g` as keyof LibraryForm]}
                    onChange={event =>
                      updateLibraryForm(
                        `${key}Per100g` as keyof LibraryForm,
                        event.target.value
                      )
                    }
                    placeholder={`${MACRO_META[key].label}/100g`}
                    className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-lime-400/60"
                  />
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveLibraryFood}
                  disabled={isSavingLibraryItem}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: COLOR }}
                >
                  <Save className="h-4 w-4" />
                  {isSavingLibraryItem ? "Salvando..." : "Salvar alimento"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 rounded-lg border border-border/50 bg-background/30 p-4 text-sm text-muted-foreground">
          {officialFoodsError
            ? officialFoodsError
            : isLoadingOfficialFoods
              ? "Carregando catalogo oficial..."
              : hasLibrarySearch
                ? "Mostrando resultados da sua biblioteca e do catalogo oficial."
                : foodLibrary.length > 0
                  ? "Seus alimentos ficam aqui. O catalogo oficial so aparece quando voce buscar."
                  : "Digite um alimento para consultar o catalogo oficial ou crie o seu primeiro alimento."}
        </div>
        {visibleLibraryFoods.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {hasLibrarySearch
                ? "Nenhum alimento encontrado nessa busca."
                : "Nenhum alimento personalizado salvo ainda."}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {visibleLibraryFoods.map(food => {
              const portionContext = resolveLibraryPortion(food);
              const selectedOptionKey = getPortionUnitKey(
                portionContext.selectedOption
              );
              const macros = getFoodPortion(food, portionContext.grams);
              const sourceLabel =
                food.source === "official"
                  ? "oficial"
                  : food.source === "curated"
                    ? "base"
                    : food.source === "imported"
                      ? "importado"
                      : "meu";

              return (
                <div
                  key={food.id}
                  className="rounded-lg border border-border/50 bg-secondary/20 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-bold">{food.name}</p>
                        <span className="rounded-md bg-background/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {sourceLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {food.brand ? `${food.brand}  |  ` : ""}
                        {portionContext.amountLabel}  |  base por 100g
                      </p>
                    </div>
                    <span
                      className="font-mono text-lg font-black"
                      style={{ color: MACRO_META.calories.color }}
                    >
                      {macros.calories} kcal
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>{macros.protein}g proteina</span>
                    <span>{macros.carbs}g carbos</span>
                    <span>{macros.fat}g gordura</span>
                    <span>{portionContext.description} usados</span>
                  </div>

                  <div className="mt-3 grid grid-cols-[96px_1fr] gap-2">
                    <input
                      type="number"
                      min={0.1}
                      step="0.1"
                      value={foodPortionAmountInput[food.id] ?? "1"}
                      onChange={event =>
                        setFoodPortionAmountInput(prev => ({
                          ...prev,
                          [food.id]: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-border/60 bg-background/40 px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-lime-400/60"
                    />
                    <select
                      value={selectedOptionKey}
                      onChange={event => {
                        const next = event.target.value;
                        setFoodServingSelection(prev => ({
                          ...prev,
                          [food.id]: next,
                        }));
                      }}
                      className="w-full rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors focus:border-lime-400/60"
                    >
                      {portionContext.options.map(option => {
                        const optionKey = getPortionUnitKey(option);
                        return (
                          <option key={optionKey} value={optionKey}>
                            {option.unit}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddLibraryFoodNow(food)}
                      disabled={busyFoodId === food.id}
                      className="rounded-lg px-3 py-2 text-xs font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ backgroundColor: COLOR }}
                    >
                      {busyFoodId === food.id ? "..." : "Lancar agora"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUseLibraryFoodInForm(food)}
                      className="rounded-lg border border-border/60 px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-lime-400/50 hover:text-foreground"
                    >
                      Preencher refeicao
                    </button>
                    {food.source !== "curated" &&
                      food.source !== "official" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLibraryFood(food)}
                          disabled={busyFoodId === food.id}
                          className="rounded-lg border border-border/60 p-2 text-muted-foreground transition-colors hover:border-red-400/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Remover ${food.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FoodSection>

      <FoodSection
        title="Distribuicao por refeicao"
        icon={Clock}
        color={COLOR}
        open={openSections.distribution}
        onOpenChange={open => handleSectionOpenChange("distribution", open)}
        summary={`${mealSummaries.filter(meal => meal.entries.length > 0).length}/${mealSummaries.length} blocos com registro`}
      >
        <div className="grid gap-3 md:grid-cols-5">
          {mealSummaries.map(meal => (
            <button
              type="button"
              key={meal.value}
              onClick={() => {
                setActiveMeal(meal.value);
                setForm(prev => ({ ...prev, meal: meal.value }));
                setShowForm(true);
              }}
              className="rounded-lg border border-border/50 bg-secondary/20 p-4 text-left transition-colors hover:border-lime-400/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{meal.shortLabel}</span>
                <span
                  className="font-mono text-xs"
                  style={{ color: meal.color }}
                >
                  {meal.totals.calories}/{meal.target}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-md bg-white/5">
                <div
                  className="h-full rounded-md transition-all"
                  style={{
                    width: `${meal.percent}%`,
                    backgroundColor: meal.color,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {meal.entries.length}{" "}
                {meal.entries.length === 1 ? "registro" : "registros"}
              </p>
            </button>
          ))}
        </div>
      </FoodSection>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto border-lime-400/40 bg-card p-4 shadow-[0_0_24px_rgba(132,204,22,0.08)] sm:p-5"
        >
          <DialogHeader className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle
                  className="font-black"
                  style={{ color: COLOR }}
                >
                  Nova refeicao
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  Registre macros e salve como favorita se for recorrente.
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border/50 p-2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Fechar formulario"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          <div className="grid gap-3 lg:grid-cols-[1fr_160px]">
            <input
              type="text"
              value={form.name}
              onChange={event => updateForm("name", event.target.value)}
              placeholder="Ex: arroz, frango, feijao e salada"
              className="rounded-lg border border-border/60 bg-secondary/30 px-4 py-3 text-sm outline-none transition-colors focus:border-lime-400/60"
            />
            <input
              type="time"
              value={form.time}
              onChange={event => updateForm("time", event.target.value)}
              className="rounded-lg border border-border/60 bg-secondary/30 px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-lime-400/60"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {MEALS.map(meal => (
              <button
                key={meal.value}
                onClick={() => updateForm("meal", meal.value)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${form.meal === meal.value ? "border-transparent text-background" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
                style={
                  form.meal === meal.value
                    ? { backgroundColor: meal.color }
                    : undefined
                }
              >
                {meal.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(Object.keys(MACRO_META) as MacroKey[]).map(key => {
              const macro = MACRO_META[key];
              return (
                <label key={key}>
                  <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span
                      className="h-2 w-2 rounded-sm"
                      style={{ backgroundColor: macro.color }}
                    />
                    {macro.label}{" "}
                    {macro.unit !== "kcal" ? `(${macro.unit})` : ""}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={form[key]}
                    onChange={event => updateForm(key, event.target.value)}
                    className="w-full rounded-lg border border-border/60 bg-secondary/30 px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-lime-400/60"
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={form.saveAsFavorite}
                onChange={event =>
                  updateForm("saveAsFavorite", event.target.checked)
                }
                className="h-4 w-4 accent-lime-400"
              />
              Salvar tambem como favorita
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border/60 px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {isSubmitting ? "Salvando..." : "Salvar refeicao"}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: COLOR }}
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Salvando..." : "Salvar refeicao"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <FoodSection
          title="Favoritas"
          icon={Heart}
          color="#f472b6"
          open={openSections.favorites}
          onOpenChange={open => handleSectionOpenChange("favorites", open)}
          summary={`${savedMeals.length} salva${savedMeals.length === 1 ? "" : "s"}`}
          className="h-fit"
        >

          {savedMeals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Salve refeicoes que voce repete muito para lancar tudo em um
                toque.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {savedMeals.map(meal => {
                const mealMeta = getMealMeta(meal.meal);
                return (
                  <div
                    key={meal.id}
                    className="rounded-lg border border-border/50 bg-secondary/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{meal.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {mealMeta.label}
                        </p>
                      </div>
                      <span
                        className="rounded-md px-2 py-1 font-mono text-xs"
                        style={{ color: mealMeta.color }}
                      >
                        {meal.calories} kcal
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span>{meal.protein}g proteina</span>
                      <span>{meal.carbs}g carbos</span>
                      <span>{meal.fat}g gordura</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleUseFavorite(meal)}
                        disabled={busyFavoriteId === meal.id}
                        className="flex-1 rounded-lg px-3 py-2 text-xs font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ backgroundColor: mealMeta.color }}
                      >
                        {busyFavoriteId === meal.id ? "..." : "Usar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFavorite(meal)}
                        disabled={busyFavoriteId === meal.id}
                        className="rounded-lg border border-border/60 p-2 text-muted-foreground transition-colors hover:border-red-400/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Remover ${meal.name} dos favoritos`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </FoodSection>

        <FoodSection
          title="Leitura rapida"
          icon={Sparkles}
          color="#fcd34d"
          open={openSections.insights}
          onOpenChange={open => handleSectionOpenChange("insights", open)}
          summary={`${insights.length} sinais do dia`}
          className="h-fit"
        >
          <div className="space-y-3">
            {insights.map(insight => (
              <div
                key={insight}
                className="rounded-lg border border-border/50 bg-secondary/20 p-4 text-sm text-muted-foreground"
              >
                {insight}
              </div>
            ))}
          </div>
        </FoodSection>
      </section>
      <section className="rounded-lg border border-border/50 bg-card p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Flame
              className="h-4 w-4"
              style={{ color: MACRO_META.calories.color }}
            />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Refeicoes do dia
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveMeal("all")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${activeMeal === "all" ? "border-lime-400/60 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
            >
              Todas
            </button>
            {MEALS.map(meal => (
              <button
                type="button"
                key={meal.value}
                onClick={() => setActiveMeal(meal.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${activeMeal === meal.value ? "border-transparent text-background" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
                style={
                  activeMeal === meal.value
                    ? { backgroundColor: meal.color }
                    : undefined
                }
              >
                {meal.shortLabel}
              </button>
            ))}
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma refeicao nesse filtro.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map(entry => {
              const mealMeta = getMealMeta(entry.meal);
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-4 rounded-lg border border-border/50 bg-secondary/20 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-md px-2 py-1 text-[11px] font-bold text-background"
                        style={{ backgroundColor: mealMeta.color }}
                      >
                        {mealMeta.shortLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {entry.time}
                      </span>
                    </div>
                    <h4 className="mt-2 truncate text-base font-black">
                      {entry.name}
                    </h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <span className="rounded-md bg-background/40 px-3 py-2 font-mono text-sm font-bold text-orange-300">
                      {entry.calories} kcal
                    </span>
                    <span className="rounded-md bg-background/40 px-3 py-2 text-xs text-cyan-200">
                      {entry.protein}g P
                    </span>
                    <span className="rounded-md bg-background/40 px-3 py-2 text-xs text-lime-200">
                      {entry.carbs}g C
                    </span>
                    <span className="rounded-md bg-background/40 px-3 py-2 text-xs text-amber-200">
                      {entry.fat}g G
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSaveEntryAsFavorite(entry)}
                      disabled={busyEntryId === entry.id}
                      className="rounded-lg border border-border/60 p-2 text-muted-foreground transition-colors hover:border-pink-400/50 hover:text-pink-300 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Salvar ${entry.name} como favorita`}
                    >
                      <Heart className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveEntry(entry)}
                      disabled={busyEntryId === entry.id}
                      className="rounded-lg border border-border/60 p-2 text-muted-foreground transition-colors hover:border-red-400/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Remover ${entry.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
      <FoodSection
        title="Semana"
        icon={TrendingUp}
        color={COLOR}
        open={openSections.week}
        onOpenChange={open => handleSectionOpenChange("week", open)}
        summary={`${weekData.reduce((sum, day) => sum + day.meals, 0)} registros no periodo`}
      >
        <div className="grid gap-3 md:grid-cols-7">
          {weekData.map(day => (
            <div
              key={day.dateKey}
              className={`rounded-lg border p-3 ${day.isCurrentDate ? "border-lime-400/50 bg-lime-400/5" : "border-border/50 bg-secondary/20"}`}
            >
              <div className="flex items-center justify-between gap-2 md:block">
                <div>
                  <p className="text-sm font-bold">{day.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {day.date.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className="font-mono text-sm font-black"
                  style={{
                    color: day.isCurrentDate
                      ? COLOR
                      : MACRO_META.calories.color,
                  }}
                >
                  {day.totals.calories}
                </span>
              </div>
              <div className="mt-3 h-24 overflow-hidden rounded-md bg-white/5 md:flex md:items-end">
                <div
                  className="h-full rounded-md md:w-full"
                  style={{
                    height: `${Math.max(day.percent, day.totals.calories > 0 ? 6 : 0)}%`,
                    backgroundColor: day.isCurrentDate
                      ? COLOR
                      : MACRO_META.calories.color,
                  }}
                />
              </div>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {day.meals} {day.meals === 1 ? "registro" : "registros"}
              </p>
            </div>
          ))}
        </div>
      </FoodSection>
    </div>
  );
}

type FoodSectionProps = {
  title: string;
  icon: LucideIcon;
  color: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  summary?: string;
  action?: ReactNode;
  className?: string;
};

function FoodSection({
  title,
  icon: Icon,
  color,
  open,
  onOpenChange,
  children,
  summary,
  action,
  className = "",
}: FoodSectionProps) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className={`rounded-lg border border-border/50 bg-card p-5 ${className}`.trim()}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" style={{ color }} />
          <div className="min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {title}
            </h3>
            {summary && (
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {summary}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-lime-400/50 hover:text-foreground"
            >
              {open ? "Esconder" : "Ver detalhes"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent className="pt-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}


