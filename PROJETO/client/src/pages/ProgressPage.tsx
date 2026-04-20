import { useEffect, useMemo, useRef, useState } from "react";
import { useHabits, type BodyMeasurement, type ProgressPhoto } from "@/contexts/HabitsContext";
import { supabase } from "@/lib/supabase";
import {
  Activity,
  Camera,
  Calendar as CalendarIcon,
  ChevronDown,
  type LucideIcon,
  Loader2,
  Maximize2,
  Plus,
  Ruler,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ReactElement } from "react";

const MAX_UPLOAD_MB = 8;
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

type CompareSelection = {
  left: string | null;
  right: string | null;
};

type PhotoForm = {
  file: File | null;
  previewUrl: string;
  date: string;
  weight: string;
  note: string;
};

type MeasurementKey = "weight" | "bodyFat" | "neck" | "chest" | "waist" | "hips" | "arm" | "thigh" | "calf";

type MeasurementForm = Record<MeasurementKey, string> & {
  date: string;
  notes: string;
};

type ProgressSectionKey = "measurements" | "history" | "compare" | "timeline";

const MEASUREMENT_FIELDS: Array<{ key: MeasurementKey; label: string; unit: string; color: string }> = [
  { key: "weight", label: "Peso", unit: "kg", color: "#22d3ee" },
  { key: "bodyFat", label: "Gordura", unit: "%", color: "#f97316" },
  { key: "neck", label: "Pescoço", unit: "cm", color: "#14b8a6" },
  { key: "chest", label: "Peito", unit: "cm", color: "#84cc16" },
  { key: "waist", label: "Cintura", unit: "cm", color: "#22c55e" },
  { key: "hips", label: "Quadril", unit: "cm", color: "#818cf8" },
  { key: "arm", label: "Braço", unit: "cm", color: "#ec4899" },
  { key: "thigh", label: "Coxa", unit: "cm", color: "#eab308" },
  { key: "calf", label: "Panturrilha", unit: "cm", color: "#a3e635" },
];

const EMPTY_MEASUREMENT_FORM: MeasurementForm = {
  date: "",
  weight: "",
  bodyFat: "",
  neck: "",
  chest: "",
  waist: "",
  hips: "",
  arm: "",
  thigh: "",
  calf: "",
  notes: "",
};

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function createMeasurementForm(): MeasurementForm {
  return { ...EMPTY_MEASUREMENT_FORM, date: todayKey() };
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

function formatWeight(weight?: number): string {
  return typeof weight === "number" ? `${weight}kg` : "Sem peso";
}

function formatSignedNumber(value: number, unit: string): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}${unit}`;
}

function formatMeasurementValue(value: number | undefined, unit: string): string {
  if (typeof value !== "number") return "-";
  return `${value}${unit}`;
}

function parseOptionalWeight(value: string): number | null | undefined {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return Math.round(parsed * 10) / 10;
}

function parseOptionalMeasurement(value: string): number | null | undefined {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return Math.round(parsed * 10) / 10;
}

function sortByDateDesc<T extends { date: string; created_at?: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
  });
}

function getMeasurementValue(measurement: BodyMeasurement | undefined, key: MeasurementKey): number | undefined {
  return measurement?.[key];
}

function getLatestMeasurementValue(measurements: BodyMeasurement[], key: MeasurementKey): number | undefined {
  return measurements.find((measurement) => typeof getMeasurementValue(measurement, key) === "number")?.[key];
}

function getOldestMeasurementValue(measurements: BodyMeasurement[], key: MeasurementKey): number | undefined {
  return [...measurements].reverse().find((measurement) => typeof getMeasurementValue(measurement, key) === "number")?.[key];
}

function getMeasurementDelta(measurements: BodyMeasurement[], key: MeasurementKey): number | undefined {
  const latest = getLatestMeasurementValue(measurements, key);
  const oldest = getOldestMeasurementValue(measurements, key);

  return typeof latest === "number" && typeof oldest === "number" ? latest - oldest : undefined;
}

function getDaysBetween(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const startTime = new Date(`${start}T00:00:00`).getTime();
  const endTime = new Date(`${end}T00:00:00`).getTime();
  return Math.max(0, Math.round((endTime - startTime) / (1000 * 60 * 60 * 24)));
}

export default function ProgressPage() {
  const {
    progressPhotos,
    addProgressPhoto,
    removeProgressPhoto,
    bodyMeasurements,
    addBodyMeasurement,
    removeBodyMeasurement,
  } = useHabits();
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingMeasurement, setIsAddingMeasurement] = useState(false);
  const [isSavingMeasurement, setIsSavingMeasurement] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePhotos, setComparePhotos] = useState<CompareSelection>({ left: null, right: null });
  const [expandedSections, setExpandedSections] = useState<Record<ProgressSectionKey, boolean>>({
    measurements: true,
    history: false,
    compare: true,
    timeline: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [measurementForm, setMeasurementForm] = useState<MeasurementForm>(createMeasurementForm);
  const [form, setForm] = useState<PhotoForm>({
    file: null,
    previewUrl: "",
    date: todayKey(),
    weight: "",
    note: "",
  });

  const sortedPhotos = useMemo(() => sortByDateDesc(progressPhotos), [progressPhotos]);
  const sortedMeasurements = useMemo(() => sortByDateDesc(bodyMeasurements), [bodyMeasurements]);
  const latestMeasurement = sortedMeasurements[0];
  const progressDates = [...sortedPhotos, ...sortedMeasurements].map((entry) => entry.date).sort();
  const photosWithWeight = sortedPhotos.filter((photo) => typeof photo.weight === "number");
  const latestWeight = getLatestMeasurementValue(sortedMeasurements, "weight") ?? photosWithWeight[0]?.weight;
  const firstWeight = getOldestMeasurementValue(sortedMeasurements, "weight") ?? photosWithWeight[photosWithWeight.length - 1]?.weight;
  const weightDelta = typeof latestWeight === "number" && typeof firstWeight === "number"
    ? latestWeight - firstWeight
    : undefined;
  const waistDelta = getMeasurementDelta(sortedMeasurements, "waist");
  const bodyFatDelta = getMeasurementDelta(sortedMeasurements, "bodyFat");
  const trackedDays = getDaysBetween(progressDates[0], progressDates[progressDates.length - 1]);
  const leftCompare = sortedPhotos.find((photo) => photo.id === comparePhotos.left);
  const rightCompare = sortedPhotos.find((photo) => photo.id === comparePhotos.right);
  const compareWeightDelta = typeof leftCompare?.weight === "number" && typeof rightCompare?.weight === "number"
    ? rightCompare.weight - leftCompare.weight
    : undefined;

  useEffect(() => {
    return () => {
      if (form.previewUrl) URL.revokeObjectURL(form.previewUrl);
    };
  }, [form.previewUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(media.matches);

    sync();
    media.addEventListener("change", sync);

    return () => media.removeEventListener("change", sync);
  }, []);

  const resetForm = () => {
    if (form.previewUrl) URL.revokeObjectURL(form.previewUrl);
    setForm({
      file: null,
      previewUrl: "",
      date: todayKey(),
      weight: "",
      note: "",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast.error(`A foto precisa ter até ${MAX_UPLOAD_MB}MB.`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setForm((current) => {
      if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return { ...current, file, previewUrl };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.file) {
      toast.error("Selecione uma foto.");
      return;
    }

    const parsedWeight = parseOptionalWeight(form.weight);
    if (parsedWeight === null) {
      toast.error("Informe um peso válido.");
      return;
    }

    setIsUploading(true);
    let filePath = "";

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileExt = (form.file.name.split(".").pop() || "jpg").toLowerCase();
      filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("progress-photos")
        .upload(filePath, form.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(filePath, SIGNED_URL_SECONDS);

      if (signedError || !signedData?.signedUrl) throw signedError || new Error("Não foi possível gerar a URL da foto.");

      try {
        await addProgressPhoto({
          url: signedData.signedUrl,
          storagePath: filePath,
          date: form.date || todayKey(),
          weight: parsedWeight,
          note: form.note.trim() || undefined,
        });
      } catch (error) {
        await supabase.storage.from("progress-photos").remove([filePath]);
        throw error;
      }

      resetForm();
      setIsAdding(false);
      toast.success("Foto salva no Supabase.");
    } catch (error) {
      toast.error(`Erro ao salvar foto: ${getErrorMessage(error)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseForm = () => {
    resetForm();
    setIsAdding(false);
  };

  const handleRemovePhoto = async (photo: ProgressPhoto) => {
    if (!window.confirm("Apagar esta foto de progresso?")) return;

    try {
      await removeProgressPhoto(photo.id);
      setSelectedPhoto((current) => (current?.id === photo.id ? null : current));
      setComparePhotos((current) => ({
        left: current.left === photo.id ? null : current.left,
        right: current.right === photo.id ? null : current.right,
      }));
      toast.success("Foto removida.");
    } catch (error) {
      toast.error(`Erro ao remover foto: ${getErrorMessage(error)}`);
    }
  };

  const handleMeasurementChange = (key: keyof MeasurementForm, value: string) => {
    setMeasurementForm((current) => ({ ...current, [key]: value }));
  };

  const handleMeasurementSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload: Omit<BodyMeasurement, "id" | "created_at"> = {
      date: measurementForm.date || todayKey(),
      notes: measurementForm.notes.trim() || undefined,
    };
    const invalidField = MEASUREMENT_FIELDS.find((field) => {
      const parsed = parseOptionalMeasurement(measurementForm[field.key]);
      if (parsed === null) return true;
      payload[field.key] = parsed;
      return false;
    });
    const hasMeasurement = MEASUREMENT_FIELDS.some((field) => typeof payload[field.key] === "number");

    if (invalidField) {
      toast.error(`Confira o campo ${invalidField.label}.`);
      return;
    }

    if (!hasMeasurement) {
      toast.error("Preencha pelo menos uma medida.");
      return;
    }

    setIsSavingMeasurement(true);
    try {
      await addBodyMeasurement(payload);
      setMeasurementForm(createMeasurementForm());
      setIsAddingMeasurement(false);
      toast.success("Medidas salvas no Supabase.");
    } catch (error) {
      toast.error(`Erro ao salvar medidas: ${getErrorMessage(error)}`);
    } finally {
      setIsSavingMeasurement(false);
    }
  };

  const handleRemoveMeasurement = async (measurement: BodyMeasurement) => {
    if (!window.confirm("Apagar este registro de medidas?")) return;

    try {
      await removeBodyMeasurement(measurement.id);
      toast.success("Medidas removidas.");
    } catch (error) {
      toast.error(`Erro ao remover medidas: ${getErrorMessage(error)}`);
    }
  };

  const toggleCompare = (photoId: string) => {
    setComparePhotos((current) => {
      if (current.left === photoId) return { ...current, left: null };
      if (current.right === photoId) return { ...current, right: null };
      if (!current.left) return { ...current, left: photoId };
      if (!current.right) return { ...current, right: photoId };
      return { left: photoId, right: null };
    });
  };

  return (
    <div className="space-y-3.5 pb-20">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-2.5">
          <Camera className="mt-1 h-[22px] w-[22px] text-emerald-400" />
          <div>
            <h2 className="m-0 text-[22px] font-extrabold leading-tight text-emerald-400">
              Progresso
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Fotos, peso, medidas e comparação visual em um só lugar.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => setCompareMode((current) => !current)}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-colors sm:w-auto ${
              compareMode ? "border-emerald-400 bg-emerald-400/10 text-emerald-400" : "border-border bg-white/[0.03] text-muted-foreground hover:text-foreground"
            }`}
          >
            <Maximize2 className="h-4 w-4" />
            {compareMode ? "Sair" : "Comparar"}
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-black text-background transition-colors hover:bg-emerald-400 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nova Foto
          </button>
          <button
            type="button"
            onClick={() => setIsAddingMeasurement(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-lime-400/40 bg-lime-400/10 px-4 py-2 text-sm font-black text-lime-300 transition-colors hover:bg-lime-400/15 sm:w-auto"
          >
            <Ruler className="h-4 w-4" />
            Nova Medida
          </button>
        </div>
      </div>

      <section className="fitlife-card p-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Registros" value={String(sortedPhotos.length + sortedMeasurements.length)} icon={Activity} color="#22d3ee" />
          <MetricCard label="Dias acompanhados" value={`${trackedDays}d`} icon={CalendarIcon} color="#84cc16" />
          <MetricCard label="Peso atual" value={typeof latestWeight === "number" ? `${latestWeight}kg` : "-"} icon={Scale} color="#818cf8" />
          <MetricCard
            label="Cintura"
            value={formatMeasurementValue(latestMeasurement?.waist, "cm")}
            icon={Ruler}
            color="#22c55e"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <ProgressSection
          title="Medidas corporais"
          subtitle="Acompanhe a evolucao do corpo com leitura mais enxuta no mobile."
          icon={<Ruler className="h-4 w-4 text-lime-300" />}
          isDesktop={isDesktop}
          open={expandedSections.measurements}
          onOpenChange={open =>
            setExpandedSections(prev => ({ ...prev, measurements: open }))
          }
          className="fitlife-card p-5"
        >
        <div>
          <div className="mb-4 hidden flex-col gap-2 lg:flex lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-black">Medidas corporais</h3>
              <p className="text-xs text-muted-foreground">
                Acompanhe mudanças que a balança sozinha não mostra.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold text-muted-foreground">
              <span>Peso {typeof weightDelta === "number" ? formatSignedNumber(weightDelta, "kg") : "-"}</span>
              <span>Cintura {typeof waistDelta === "number" ? formatSignedNumber(waistDelta, "cm") : "-"}</span>
              <span>Gordura {typeof bodyFatDelta === "number" ? formatSignedNumber(bodyFatDelta, "%") : "-"}</span>
            </div>
          </div>

          {latestMeasurement ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {MEASUREMENT_FIELDS.map((field) => (
                <MeasurementTrendCard
                  key={field.key}
                  label={field.label}
                  value={getMeasurementValue(latestMeasurement, field.key)}
                  delta={getMeasurementDelta(sortedMeasurements, field.key)}
                  unit={field.unit}
                  color={field.color}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Ruler className="mx-auto mb-3 h-8 w-8 text-lime-300" />
              <p className="text-sm font-bold">Nenhuma medida registrada</p>
              <p className="mt-1 text-xs text-muted-foreground">Cintura, peito, quadril e membros entram aqui.</p>
              <button
                type="button"
                onClick={() => setIsAddingMeasurement(true)}
                className="mt-4 rounded-lg bg-lime-400 px-4 py-2 text-xs font-black text-background"
              >
                Registrar medidas
              </button>
            </div>
          )}
        </div>
        </ProgressSection>

        <ProgressSection
          title="Historico"
          subtitle={`${sortedMeasurements.length} registro${sortedMeasurements.length === 1 ? "" : "s"} de medidas salvo${sortedMeasurements.length === 1 ? "" : "s"}.`}
          icon={<Ruler className="h-4 w-4 text-lime-300" />}
          isDesktop={isDesktop}
          open={expandedSections.history}
          onOpenChange={open =>
            setExpandedSections(prev => ({ ...prev, history: open }))
          }
          className="fitlife-card p-5"
        >
        <div>
          <div className="mb-4 hidden items-center justify-between gap-3 lg:flex">
            <div>
              <h3 className="text-sm font-black">Histórico</h3>
              <p className="text-xs text-muted-foreground">
                {sortedMeasurements.length} registro{sortedMeasurements.length === 1 ? "" : "s"}
              </p>
            </div>
            <Ruler className="h-5 w-5 text-lime-300" />
          </div>

          {sortedMeasurements.length > 0 ? (
            <div className="space-y-2">
              {sortedMeasurements.slice(0, 6).map((measurement) => (
                <div key={measurement.id} className="rounded-lg border border-border bg-white/[0.03] p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black">{formatDate(measurement.date)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {measurement.notes || "Sem nota"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMeasurement(measurement)}
                      className="rounded-lg border border-red-500/20 p-1.5 text-red-400 transition-colors hover:bg-red-500/10"
                      aria-label="Apagar medidas"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
                    <span>Peso {formatMeasurementValue(measurement.weight, "kg")}</span>
                    <span>Cintura {formatMeasurementValue(measurement.waist, "cm")}</span>
                    <span>Peito {formatMeasurementValue(measurement.chest, "cm")}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
              Seu histórico de medidas vai aparecer aqui.
            </p>
          )}
        </div>
        </ProgressSection>
      </section>

      {compareMode && (
        <ProgressSection
          title="Comparacao"
          subtitle={
            typeof compareWeightDelta === "number"
              ? `Diferenca atual: ${compareWeightDelta > 0 ? "+" : ""}${compareWeightDelta.toFixed(1)}kg`
              : "Escolha duas fotos na timeline."
          }
          icon={<Maximize2 className="h-4 w-4 text-emerald-300" />}
          isDesktop={isDesktop}
          open={expandedSections.compare}
          onOpenChange={open =>
            setExpandedSections(prev => ({ ...prev, compare: open }))
          }
          className="fitlife-card p-5"
        >
        <section>
          <div className="mb-4 hidden flex-col gap-2 lg:flex lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-bold">Comparação</h3>
              <p className="text-xs text-muted-foreground">Escolha duas fotos na timeline.</p>
            </div>
            <div className="text-xs font-bold text-muted-foreground">
              {typeof compareWeightDelta === "number" ? `Diferença: ${compareWeightDelta > 0 ? "+" : ""}${compareWeightDelta.toFixed(1)}kg` : "Selecione antes e depois"}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <CompareSlot label="Antes" photo={leftCompare} onClear={() => setComparePhotos((current) => ({ ...current, left: null }))} />
            <CompareSlot label="Depois" photo={rightCompare} onClear={() => setComparePhotos((current) => ({ ...current, right: null }))} />
          </div>
        </section>
        </ProgressSection>
      )}

      <ProgressSection
        title="Timeline de fotos"
        subtitle={
          sortedPhotos.length === 0
            ? "Seu mural de evolucao comeca na primeira foto."
            : `${sortedPhotos.length} registro${sortedPhotos.length === 1 ? "" : "s"} visual${sortedPhotos.length === 1 ? "" : "is"} salvo${sortedPhotos.length === 1 ? "" : "s"}.`
        }
        icon={<Camera className="h-4 w-4 text-emerald-400" />}
        isDesktop={isDesktop}
        open={expandedSections.timeline}
        onOpenChange={open =>
          setExpandedSections(prev => ({ ...prev, timeline: open }))
        }
        className="fitlife-card p-5"
      >
      <div>
      {sortedPhotos.length === 0 && !isAdding ? (
        <section className="rounded-lg border border-dashed border-border p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-400">
            <Camera className="h-7 w-7" />
          </div>
          <h3 className="font-bold">Nenhuma foto ainda</h3>
          <p className="mt-1 text-sm text-muted-foreground">Comece sua timeline de evolução hoje.</p>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="mt-5 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-black text-background"
          >
            Adicionar Primeira Foto
          </button>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {sortedPhotos.map((photo) => {
              const selectedForCompare = comparePhotos.left === photo.id || comparePhotos.right === photo.id;

              return (
                <motion.article
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={`fitlife-card overflow-hidden p-0 ${selectedForCompare ? "border-emerald-400/70" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => compareMode ? toggleCompare(photo.id) : setSelectedPhoto(photo)}
                    className="relative block aspect-[3/4] w-full overflow-hidden bg-black/20 text-left"
                  >
                    <img src={photo.url} alt={`Progresso em ${formatDate(photo.date)}`} className="h-full w-full object-cover" />
                    <span className="absolute left-3 top-3 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-bold text-white">
                      {formatDate(photo.date)}
                    </span>
                    {selectedForCompare && (
                      <span className="absolute right-3 top-3 rounded-lg bg-emerald-500 px-2 py-1 text-[10px] font-black text-background">
                        Comparando
                      </span>
                    )}
                  </button>
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{formatWeight(photo.weight)}</p>
                        <p className="truncate text-xs text-muted-foreground">{photo.note || "Sem nota"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo)}
                        className="rounded-lg border border-red-500/20 p-2 text-red-400 transition-colors hover:bg-red-500/10"
                        aria-label="Apagar foto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{photo.storagePath ? "Storage privado" : "URL antiga"}</span>
                      <span>{photo.created_at ? new Date(photo.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </section>
      )}
      </div>
      </ProgressSection>

      <AnimatePresence>
        {isAddingMeasurement && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border p-5">
                <div>
                  <h3 className="text-lg font-black">Novo registro corporal</h3>
                  <p className="text-xs text-muted-foreground">Preencha só o que você mediu hoje.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMeasurementForm(createMeasurementForm());
                    setIsAddingMeasurement(false);
                  }}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Fechar medidas"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleMeasurementSubmit} className="space-y-4 p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="space-y-2 sm:col-span-1">
                    <span className="text-xs font-bold text-muted-foreground">Data</span>
                    <input
                      type="date"
                      value={measurementForm.date}
                      onChange={(event) => handleMeasurementChange("date", event.target.value)}
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-lime-400/50"
                    />
                  </label>
                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-xs font-bold text-muted-foreground">Nota</span>
                    <input
                      type="text"
                      value={measurementForm.notes}
                      onChange={(event) => handleMeasurementChange("notes", event.target.value)}
                      placeholder="Ex: pós-treino, em jejum, fim da semana"
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-lime-400/50"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {MEASUREMENT_FIELDS.map((field) => (
                    <label key={field.key} className="space-y-2">
                      <span className="text-xs font-bold text-muted-foreground">{field.label}</span>
                      <div className="flex overflow-hidden rounded-lg border border-border bg-muted focus-within:border-lime-400/50">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={measurementForm[field.key]}
                          onChange={(event) => handleMeasurementChange(field.key, event.target.value)}
                          placeholder="0.0"
                          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                        />
                        <span className="flex min-w-10 items-center justify-center border-l border-border px-2 text-[10px] font-bold text-muted-foreground">
                          {field.unit}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSavingMeasurement}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-lime-400 py-3 text-sm font-black text-background transition-colors hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingMeasurement ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Salvando...
                    </>
                  ) : "Salvar Medidas"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border p-5">
                <h3 className="text-lg font-black">Nova foto de progresso</h3>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Fechar formulário"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/50 text-muted-foreground"
                >
                  {form.previewUrl ? (
                    <img src={form.previewUrl} className="h-full w-full object-cover" alt="Preview da foto selecionada" />
                  ) : (
                    <>
                      <Camera className="mb-2 h-8 w-8" />
                      <span className="text-sm">Clique para selecionar foto</span>
                      <span className="mt-1 text-[10px]">PNG/JPG até {MAX_UPLOAD_MB}MB</span>
                    </>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-2">
                    <span className="text-xs font-bold text-muted-foreground">Data</span>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-bold text-muted-foreground">Peso</span>
                    <input
                      type="number"
                      step="0.1"
                      value={form.weight}
                      onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))}
                      placeholder="85.5"
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
                    />
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-bold text-muted-foreground">Nota</span>
                  <textarea
                    value={form.note}
                    onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Como você está se sentindo hoje?"
                    className="h-24 w-full resize-none rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 text-sm font-black text-background transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : "Salvar Registro"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="max-h-full max-w-4xl overflow-hidden rounded-lg border border-white/10 bg-black"
              onClick={(event) => event.stopPropagation()}
            >
              <img src={selectedPhoto.url} className="max-h-[78vh] w-full object-contain" alt={`Foto de ${formatDate(selectedPhoto.date)}`} />
              <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4">
                <div>
                  <p className="text-sm font-black">{formatDate(selectedPhoto.date)}</p>
                  <p className="text-xs text-muted-foreground">{formatWeight(selectedPhoto.weight)} · {selectedPhoto.note || "Sem nota"}</p>
                </div>
                <button type="button" onClick={() => setSelectedPhoto(null)} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground">
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
};

function MetricCard({ label, value, icon: Icon, color }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[1.3px] text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <p className="truncate text-2xl font-black" style={{ color }}>{value}</p>
    </div>
  );
}

type MeasurementTrendCardProps = {
  label: string;
  value?: number;
  delta?: number;
  unit: string;
  color: string;
};

function MeasurementTrendCard({ label, value, delta, unit, color }: MeasurementTrendCardProps) {
  const hasDelta = typeof delta === "number" && delta !== 0;
  const TrendIcon = hasDelta && delta < 0 ? TrendingDown : TrendingUp;

  return (
    <div className="rounded-lg border border-border bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-bold uppercase tracking-[1px] text-muted-foreground">{label}</p>
        <Ruler className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <p className="text-lg font-black" style={{ color }}>
        {formatMeasurementValue(value, unit)}
      </p>
      <div className="mt-1 flex min-h-4 items-center gap-1 text-[10px] text-muted-foreground">
        {hasDelta ? (
          <>
            <TrendIcon className="h-3 w-3" />
            <span>{formatSignedNumber(delta, unit)}</span>
          </>
        ) : (
          <span>Sem variação</span>
        )}
      </div>
    </div>
  );
}

type CompareSlotProps = {
  label: string;
  photo?: ProgressPhoto;
  onClear: () => void;
};

function CompareSlot({ label, photo, onClear }: CompareSlotProps) {
  return (
    <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-black/20">
      {photo ? (
        <>
          <img src={photo.url} className="h-full max-h-[420px] w-full object-contain" alt={`${label} - ${formatDate(photo.date)}`} />
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-3 rounded-lg bg-black/55 p-2 text-white"
            aria-label={`Limpar foto ${label.toLowerCase()}`}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-2 text-xs text-white">
            <p className="font-black">{label}</p>
            <p>{formatDate(photo.date)}{typeof photo.weight === "number" ? ` · ${photo.weight}kg` : ""}</p>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{label}: selecione uma foto</p>
      )}
    </div>
  );
}

function ProgressSection({
  title,
  subtitle,
  icon,
  isDesktop,
  open,
  onOpenChange,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  icon: ReactElement;
  isDesktop: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactElement;
  className: string;
}) {
  const isOpen = isDesktop || open;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={nextOpen => {
        if (!isDesktop) onOpenChange(nextOpen);
      }}
      className={className}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-black">{title}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>

        {!isDesktop ? (
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 self-start rounded-lg border border-border/60 px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-emerald-400/50 hover:text-foreground"
            >
              {open ? "Esconder" : "Abrir"}
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
