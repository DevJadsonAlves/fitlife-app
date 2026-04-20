import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Dumbbell, RotateCcw, X } from "lucide-react";
import { EXERCISE_LIBRARY, MUSCLE_GROUPS_DATA, type LibraryExercise } from "@/data/exerciseLibrary";

type BodyView = "front" | "back";
type MuscleGroupId = (typeof MUSCLE_GROUPS_DATA)[number]["id"];

type MuscleZone = {
  key: string;
  id: MuscleGroupId;
  view: BodyView | "both";
  label: string;
  paths: string[];
  labelPosition: { x: number; y: number };
};

const VIEW_PRIMARY_ZONE_KEYS: Record<BodyView, string[]> = {
  front: ["deltoids", "chest", "biceps-front", "triceps-front", "abs", "quads", "calves"],
  back: ["traps", "lats", "lower-back", "triceps-back", "glutes", "hamstrings", "calves"],
};

const BODY_ZONES: MuscleZone[] = [
  {
    key: "deltoids",
    id: "ombros",
    view: "both",
    label: "Ombros",
    labelPosition: { x: 130, y: 110 },
    paths: [
      "M77 105 C57 108 45 127 48 150 C65 153 82 137 88 114 C86 109 83 106 77 105Z",
      "M183 105 C203 108 215 127 212 150 C195 153 178 137 172 114 C174 109 177 106 183 105Z",
    ],
  },
  {
    key: "chest",
    id: "peito",
    view: "front",
    label: "Peito",
    labelPosition: { x: 130, y: 142 },
    paths: [
      "M93 120 C104 112 119 112 128 123 L128 158 C112 164 95 156 88 141 C86 132 88 125 93 120Z",
      "M132 123 C141 112 156 112 167 120 C172 125 174 132 172 141 C165 156 148 164 132 158Z",
    ],
  },
  {
    key: "lats",
    id: "costas",
    view: "back",
    label: "Dorsais",
    labelPosition: { x: 130, y: 150 },
    paths: [
      "M91 121 C103 111 118 112 128 124 L128 195 C111 189 94 171 82 139 C83 130 86 125 91 121Z",
      "M132 124 C142 112 157 111 169 121 C174 125 177 130 178 139 C166 171 149 189 132 195Z",
    ],
  },
  {
    key: "lower-back",
    id: "costas",
    view: "back",
    label: "Lombar",
    labelPosition: { x: 130, y: 205 },
    paths: [
      "M102 188 C113 194 122 197 128 198 L128 228 C115 226 104 221 95 214Z",
      "M132 198 C138 197 147 194 158 188 L165 214 C156 221 145 226 132 228Z",
    ],
  },
  {
    key: "traps",
    id: "trapezio",
    view: "back",
    label: "Trapézio",
    labelPosition: { x: 130, y: 107 },
    paths: [
      "M112 82 C122 91 138 91 148 82 L158 116 C142 111 118 111 102 116Z",
      "M91 106 C103 98 116 96 128 101 L116 124 C104 122 94 117 85 111Z",
      "M132 101 C144 96 157 98 169 106 L175 111 C166 117 156 122 144 124Z",
    ],
  },
  {
    key: "biceps-front",
    id: "biceps",
    view: "front",
    label: "Bíceps",
    labelPosition: { x: 53, y: 178 },
    paths: [
      "M53 153 C42 165 40 193 47 212 C61 206 68 179 65 159 C61 155 57 153 53 153Z",
      "M207 153 C218 165 220 193 213 212 C199 206 192 179 195 159 C199 155 203 153 207 153Z",
    ],
  },
  {
    key: "triceps-front",
    id: "triceps",
    view: "front",
    label: "Tríceps",
    labelPosition: { x: 207, y: 178 },
    paths: [
      "M67 148 C77 158 78 191 69 216 C58 205 55 174 62 153 C64 150 65 149 67 148Z",
      "M193 148 C183 158 182 191 191 216 C202 205 205 174 198 153 C196 150 195 149 193 148Z",
    ],
  },
  {
    key: "triceps-back",
    id: "triceps",
    view: "back",
    label: "Tríceps",
    labelPosition: { x: 207, y: 178 },
    paths: [
      "M54 153 C43 169 42 201 51 221 C64 209 70 179 65 159 C61 155 58 153 54 153Z",
      "M206 153 C217 169 218 201 209 221 C196 209 190 179 195 159 C199 155 202 153 206 153Z",
    ],
  },
  {
    key: "abs",
    id: "abdomen",
    view: "front",
    label: "Abdômen",
    labelPosition: { x: 130, y: 196 },
    paths: [
      "M105 162 L155 162 C158 177 158 204 152 224 L108 224 C102 204 102 177 105 162Z",
      "M112 172 L128 172 L128 190 L110 190Z",
      "M132 172 L148 172 L150 190 L132 190Z",
      "M110 194 L128 194 L128 213 L107 213Z",
      "M132 194 L150 194 L153 213 L132 213Z",
    ],
  },
  {
    key: "glutes",
    id: "gluteos",
    view: "back",
    label: "Glúteos",
    labelPosition: { x: 130, y: 238 },
    paths: [
      "M96 219 C112 211 124 218 128 236 C122 252 104 261 88 250 C86 237 89 226 96 219Z",
      "M132 236 C136 218 148 211 164 219 C171 226 174 237 172 250 C156 261 138 252 132 236Z",
    ],
  },
  {
    key: "quads",
    id: "pernas",
    view: "front",
    label: "Quadríceps",
    labelPosition: { x: 130, y: 306 },
    paths: [
      "M91 236 C105 241 116 241 125 234 L120 355 C107 359 95 356 86 350 L88 278 C88 260 89 246 91 236Z",
      "M135 234 C144 241 155 241 169 236 C171 246 172 260 172 278 L174 350 C165 356 153 359 140 355Z",
    ],
  },
  {
    key: "hamstrings",
    id: "pernas",
    view: "back",
    label: "Posterior",
    labelPosition: { x: 130, y: 306 },
    paths: [
      "M91 236 C104 242 116 241 126 233 L121 346 C107 353 96 351 87 343 L88 278 C88 260 89 246 91 236Z",
      "M134 233 C144 241 156 242 169 236 C171 246 172 260 172 278 L173 343 C164 351 153 353 139 346Z",
    ],
  },
  {
    key: "calves",
    id: "pernas",
    view: "both",
    label: "Panturrilhas",
    labelPosition: { x: 130, y: 371 },
    paths: [
      "M88 356 C100 365 112 366 122 361 L120 392 L84 392Z",
      "M138 361 C148 366 160 365 172 356 L176 392 L140 392Z",
    ],
  },
];

const FRONT_ONLY = new Set<MuscleGroupId>(["peito", "biceps", "abdomen"]);
const BACK_ONLY = new Set<MuscleGroupId>(["costas", "trapezio", "gluteos"]);

const MUSCLE_COLORS = MUSCLE_GROUPS_DATA.reduce<Record<string, string>>((map, group) => {
  map[group.id] = group.color;
  return map;
}, {});

function getMuscleLabel(id: string | null): string {
  if (!id) return "Selecione uma área";
  return MUSCLE_GROUPS_DATA.find((group) => group.id === id)?.label ?? "Grupo muscular";
}

function getExerciseCount(id: string): number {
  return EXERCISE_LIBRARY.filter((exercise) => exercise.muscleGroup === id).length;
}

function getPreferredView(id: MuscleGroupId): BodyView | null {
  if (BACK_ONLY.has(id)) return "back";
  if (FRONT_ONLY.has(id)) return "front";
  return null;
}

function getDifficultyLabel(value: LibraryExercise["difficulty"]): string {
  if (value === "iniciante") return "Iniciante";
  if (value === "intermediario") return "Intermediário";
  return "Avançado";
}

type MuscleMapProps = {
  onSelectExercise: (exercise: LibraryExercise) => void;
  onClose: () => void;
};

export function MuscleMap({ onSelectExercise, onClose }: MuscleMapProps) {
  const [selected, setSelected] = useState<MuscleGroupId | null>(null);
  const [hovered, setHovered] = useState<MuscleGroupId | null>(null);
  const [view, setView] = useState<BodyView>("front");

  const visibleZones = useMemo(
    () => BODY_ZONES.filter((zone) => zone.view === "both" || zone.view === view),
    [view]
  );
  const visibleControls = useMemo(
    () => VIEW_PRIMARY_ZONE_KEYS[view]
      .map((key) => BODY_ZONES.find((zone) => zone.key === key))
      .filter((zone): zone is MuscleZone => Boolean(zone)),
    [view]
  );

  const filteredExercises = useMemo(
    () => (selected ? EXERCISE_LIBRARY.filter((exercise) => exercise.muscleGroup === selected) : []),
    [selected]
  );

  const selectableGroups = useMemo(
    () => MUSCLE_GROUPS_DATA.filter((group) => getExerciseCount(group.id) > 0),
    []
  );

  const activeMuscle = hovered || selected;
  const activeLabel = getMuscleLabel(activeMuscle);

  const selectMuscle = (id: MuscleGroupId) => {
    const preferredView = getPreferredView(id);
    if (preferredView) setView(preferredView);
    setSelected((current) => (current === id ? null : id));
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl md:flex-row"
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
      >
        <div className="relative flex min-h-[560px] flex-1 flex-col overflow-hidden border-b border-zinc-800 bg-[radial-gradient(circle_at_50%_20%,rgba(249,115,22,0.14),transparent_34%),linear-gradient(180deg,rgba(24,24,27,0.95),rgba(9,9,11,0.98))] p-5 md:border-b-0 md:border-r">
          <div className="z-10 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-500">Mapa muscular</p>
              <h3 className="mt-1 text-2xl font-black leading-none text-white">
                Explorar <span className="text-orange-500">músculos</span>
              </h3>
              <p className="mt-2 text-sm text-zinc-400">{activeLabel}</p>
            </div>
            <div className="flex rounded-lg border border-zinc-800 bg-black/30 p-1">
              {(["front", "back"] as BodyView[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setView(item)}
                  className={`rounded-md px-3 py-1.5 text-xs font-black transition-colors ${
                    view === item ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {item === "front" ? "Frente" : "Costas"}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center py-4">
            <svg
              viewBox="0 0 260 420"
              className="h-full max-h-[470px] w-full max-w-[360px] drop-shadow-2xl"
              role="img"
              aria-label="Mapa corporal interativo"
            >
              <defs>
                <linearGradient id="bodyBase" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#292d34" />
                  <stop offset="100%" stopColor="#121417" />
                </linearGradient>
                <filter id="zoneGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <g fill="url(#bodyBase)" stroke="#3f4652" strokeWidth="1.2">
                <circle cx="130" cy="46" r="28" />
                <path d="M111 72 C118 79 142 79 149 72 L145 98 C137 103 123 103 115 98Z" />
                <path d="M86 104 C95 91 113 88 130 92 C147 88 165 91 174 104 C182 136 177 187 163 226 C145 238 115 238 97 226 C83 187 78 136 86 104Z" />
                <path d="M76 110 C58 119 44 150 42 187 C44 211 52 231 64 243 C70 222 72 196 68 174 C63 149 68 127 76 110Z" />
                <path d="M184 110 C202 119 216 150 218 187 C216 211 208 231 196 243 C190 222 188 196 192 174 C197 149 192 127 184 110Z" />
                <path d="M94 226 C107 237 119 239 128 232 L123 394 C109 401 91 397 79 389 L84 280 C85 257 88 240 94 226Z" />
                <path d="M132 232 C141 239 153 237 166 226 C172 240 175 257 176 280 L181 389 C169 397 151 401 137 394Z" />
              </g>

              <path d="M130 96 L130 394" stroke="#0b0d10" strokeWidth="1.5" opacity="0.8" />
              <path d="M95 226 C112 236 148 236 165 226" stroke="#3f4652" strokeWidth="1" opacity="0.6" />
              <path d="M107 160 C117 166 143 166 153 160" stroke="#4b5563" strokeWidth="0.7" opacity="0.35" />
              <path d="M109 185 L151 185" stroke="#4b5563" strokeWidth="0.7" opacity="0.35" />
              <path d="M90 278 C101 285 115 286 124 278" stroke="#4b5563" strokeWidth="0.7" opacity="0.28" />
              <path d="M136 278 C145 286 159 285 170 278" stroke="#4b5563" strokeWidth="0.7" opacity="0.28" />

              {visibleZones.map((zone) => {
                const color = MUSCLE_COLORS[zone.id] ?? "#f97316";
                const isActive = selected === zone.id;
                const isHovered = hovered === zone.id;
                const isDimmed = Boolean(selected && selected !== zone.id);

                return (
                  <motion.g
                    key={`${view}-${zone.key}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Selecionar ${zone.label}`}
                    className="cursor-pointer outline-none"
                    onClick={() => selectMuscle(zone.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectMuscle(zone.id);
                      }
                    }}
                    onMouseEnter={() => setHovered(zone.id)}
                    onMouseLeave={() => setHovered(null)}
                    initial={false}
                    animate={{ opacity: isDimmed ? 0.35 : 1 }}
                  >
                    <title>{zone.label}</title>
                    {zone.paths.map((path, index) => (
                      <motion.path
                        key={`${zone.key}-${index}`}
                        d={path}
                        fill={color}
                        filter={isActive || isHovered ? "url(#zoneGlow)" : undefined}
                        initial={false}
                        animate={{
                          fillOpacity: isActive ? 0.86 : isHovered ? 0.64 : 0.34,
                          stroke: isActive || isHovered ? color : "rgba(255,255,255,0.12)",
                          strokeWidth: isActive ? 2.4 : isHovered ? 1.8 : 0.8,
                        }}
                        transition={{ duration: 0.16 }}
                      />
                    ))}
                    {(isActive || isHovered) && (
                      <motion.text
                        x={zone.labelPosition.x}
                        y={zone.labelPosition.y}
                        textAnchor="middle"
                        className="pointer-events-none fill-white text-[10px] font-black uppercase tracking-[1px]"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {zone.label}
                      </motion.text>
                    )}
                  </motion.g>
                );
              })}
            </svg>
          </div>

          <div className="z-10 grid grid-cols-4 gap-2">
            {visibleControls.map((zone) => (
              <button
                key={`${view}-pill-${zone.key}`}
                type="button"
                onClick={() => selectMuscle(zone.id)}
                className={`rounded-lg border px-2 py-2 text-[10px] font-black transition-colors ${
                  selected === zone.id
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-zinc-800 bg-black/25 text-zinc-400 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {zone.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-[560px] flex-1 flex-col bg-zinc-950">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/40 p-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                {selected ? "Exercícios disponíveis" : "Grupos musculares"}
              </p>
              <h4 className="mt-1 text-lg font-black text-white">{getMuscleLabel(selected)}</h4>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-800 p-2 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-white"
              aria-label="Fechar mapa muscular"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <AnimatePresence mode="wait">
              {!selected ? (
                <motion.div
                  key="muscle-groups"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 gap-2"
                >
                  {selectableGroups.map((group) => {
                    const preferredView = getPreferredView(group.id);
                    const isAvailableOnBody = BODY_ZONES.some((zone) => zone.id === group.id);

                    return (
                      <button
                        key={group.id}
                        type="button"
                        onMouseEnter={() => setHovered(group.id)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => {
                          if (preferredView) setView(preferredView);
                          setSelected(group.id);
                        }}
                        className="group flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-left transition-colors hover:border-zinc-600"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color }} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-zinc-100">{group.label}</p>
                            <p className="text-[10px] uppercase tracking-[1px] text-zinc-500">
                              {getExerciseCount(group.id)} exercícios {isAvailableOnBody ? "" : "na biblioteca"}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-zinc-600 transition-colors group-hover:text-white" />
                      </button>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="exercises"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  className="space-y-3"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="flex items-center gap-2 rounded-lg border border-orange-500/30 px-3 py-2 text-xs font-black text-orange-500 transition-colors hover:bg-orange-500/10"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Ver músculos
                    </button>
                    <span className="text-xs font-bold text-zinc-500">{filteredExercises.length} opções</span>
                  </div>

                  {filteredExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => {
                        onSelectExercise(exercise);
                        onClose();
                      }}
                      className="group w-full rounded-lg border border-zinc-800 bg-zinc-900/45 p-4 text-left transition-colors hover:border-orange-500/60 hover:bg-orange-500/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h5 className="truncate font-black text-white transition-colors group-hover:text-orange-500">
                            {exercise.name}
                          </h5>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{exercise.tips}</p>
                        </div>
                        <Dumbbell className="mt-1 h-4 w-4 shrink-0 text-orange-500" />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-md bg-zinc-800 px-2 py-1 text-[10px] font-bold uppercase text-zinc-400">
                          {exercise.equipment}
                        </span>
                        <span
                          className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${
                            exercise.difficulty === "iniciante"
                              ? "bg-green-500/10 text-green-400"
                              : exercise.difficulty === "intermediario"
                                ? "bg-yellow-500/10 text-yellow-400"
                                : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {getDifficultyLabel(exercise.difficulty)}
                        </span>
                        <span className="rounded-md bg-orange-500/10 px-2 py-1 text-[10px] font-black uppercase text-orange-400">
                          {exercise.suggestedSets} séries
                        </span>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
