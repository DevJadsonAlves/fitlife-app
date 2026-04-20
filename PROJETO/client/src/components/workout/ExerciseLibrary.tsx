import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { BookOpen, X, Search, Heart, Filter, Star, Info, ChevronDown, ChevronUp, Plus, RefreshCw, PlayCircle } from "lucide-react";
import {
  EXERCISE_LIBRARY,
  MUSCLE_GROUPS_DATA,
  searchExercises,
  getDifficultyLabel,
  getDifficultyColor,
  type LibraryExercise,
  type Difficulty,
} from "@/data/exerciseLibrary";

const COLOR = "#f97316";

export function ExerciseLibrary({
  onSelect,
  onClose,
}: {
  onSelect: (exercise: LibraryExercise) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("fitlife_favorite_exercises");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      localStorage.setItem("fitlife_favorite_exercises", JSON.stringify(next));
      return next;
    });
  }, []);

  const filteredExercises = useMemo(() => {
    let results = searchQuery ? searchExercises(searchQuery) : EXERCISE_LIBRARY;
    if (selectedGroup) results = results.filter((e) => e.muscleGroup === selectedGroup);
    if (selectedDifficulty) results = results.filter((e) => e.difficulty === selectedDifficulty);
    if (showFavoritesOnly) results = results.filter((e) => favorites.includes(e.id));
    return results;
  }, [searchQuery, selectedGroup, selectedDifficulty, showFavoritesOnly, favorites]);

  const groupedExercises = useMemo(() => {
    const groups: Record<string, LibraryExercise[]> = {};
    filteredExercises.forEach((ex) => {
      if (!groups[ex.muscleGroup]) groups[ex.muscleGroup] = [];
      groups[ex.muscleGroup].push(ex);
    });
    return groups;
  }, [filteredExercises]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    EXERCISE_LIBRARY.forEach((e) => {
      counts[e.muscleGroup] = (counts[e.muscleGroup] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full sm:max-w-2xl max-h-[90vh] bg-card border border-border/50 rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col"
      >
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" style={{ color: COLOR }} />
              <h2 className="text-lg font-bold">Biblioteca de Exercícios</h2>
              <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                {EXERCISE_LIBRARY.length} exercícios
              </span>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar exercício, equipamento..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-sm focus:border-orange-500/50 focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                showFavoritesOnly ? "text-background" : "border border-border/50 text-muted-foreground hover:text-foreground"
              }`}
              style={showFavoritesOnly ? { backgroundColor: "#ef4444" } : {}}
            >
              <Heart className="w-3 h-3" fill={showFavoritesOnly ? "currentColor" : "none"} />
              Favoritos ({favorites.length})
            </button>
            <div className="flex items-center gap-1 ml-auto">
              <Filter className="w-3 h-3 text-muted-foreground" />
              <select
                value={selectedDifficulty || ""}
                onChange={(e) => setSelectedDifficulty(e.target.value as Difficulty || null)}
                className="bg-transparent text-xs text-muted-foreground focus:outline-none"
              >
                <option value="">Dificuldade</option>
                <option value="beginner">Iniciante</option>
                <option value="intermediate">Intermediário</option>
                <option value="advanced">Avançado</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setSelectedGroup(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedGroup === null ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos
            </button>
            {MUSCLE_GROUPS_DATA.map((group) => {
              const Icon = group.icon;
              return (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedGroup === group.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{group.label}</span>
                  <span className="text-[10px] opacity-50">({groupCounts[group.id] || 0})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {Object.keys(groupedExercises).length === 0 ? (
            <div className="py-12 text-center">
              <Search className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum exercício encontrado</p>
            </div>
          ) : (
            MUSCLE_GROUPS_DATA.filter(g => groupedExercises[g.id]).map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <GroupIcon className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{group.label}</h3>
                    <div className="h-px flex-1 bg-border/30 ml-2" />
                  </div>
                  
                  <div className="space-y-3">
                    {groupedExercises[group.id].map((exercise) => {
                      const isExpanded = expandedExercise === exercise.id;
                      const isFavorite = favorites.includes(exercise.id);
                      return (
                        <div
                          key={exercise.id}
                          className={`rounded-2xl border transition-all ${
                            isExpanded ? "border-orange-500/30 bg-orange-500/5" : "border-border/50 bg-secondary/20 hover:border-border"
                          }`}
                        >
                          <div className="p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center overflow-hidden">
                              {exercise.gifUrl ? (
                                <img src={exercise.gifUrl} alt={exercise.name} className="w-full h-full object-cover" />
                              ) : (
                                <GroupIcon className="w-6 h-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-sm truncate">{exercise.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase font-bold tracking-wider">
                                  {exercise.equipment}
                                </span>
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                                  style={{ backgroundColor: `${getDifficultyColor(exercise.difficulty)}20`, color: getDifficultyColor(exercise.difficulty) }}
                                >
                                  {getDifficultyLabel(exercise.difficulty)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(exercise.id); }}
                                className={`p-2.5 rounded-xl transition-all ${isFavorite ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:bg-secondary/80"}`}
                                title="Favoritar"
                              >
                                <Heart className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} />
                              </button>
                              <button
                                onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
                                className={`p-2.5 rounded-xl transition-all ${isExpanded ? "bg-orange-500/10 text-orange-500" : "text-muted-foreground hover:bg-secondary/80"}`}
                                title="Ver detalhes"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => onSelect(exercise)}
                                className="p-2.5 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                                title="Adicionar ao treino"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-0 space-y-3 border-t border-orange-500/10 mt-2">
                              {exercise.gifUrl && (
                                <div className="mt-4 rounded-xl overflow-hidden border border-border/50 bg-black/5 aspect-video flex items-center justify-center relative group">
                                  <img src={exercise.gifUrl} alt={exercise.name} className="w-full h-full object-contain" />
                                  <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] text-white font-bold flex items-center gap-1">
                                    <PlayCircle className="w-3 h-3" /> DEMONSTRAÇÃO
                                  </div>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-2 gap-3 pt-3">
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Séries Sugeridas</p>
                                  <p className="text-sm font-medium">{exercise.suggestedSets} séries</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Repetições</p>
                                  <p className="text-sm font-medium">{exercise.suggestedReps}</p>
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                                  <Info className="w-3 h-3" /> Dicas Pro
                                </p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {exercise.tips}
                                </p>
                              </div>

                              <div className="space-y-2 pt-2 border-t border-orange-500/10">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3" /> Substitutos (Mesmo Músculo)
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {EXERCISE_LIBRARY
                                    .filter(e => e.muscleGroup === exercise.muscleGroup && e.id !== exercise.id)
                                    .slice(0, 3)
                                    .map(sub => (
                                      <button
                                        key={sub.id}
                                        onClick={() => onSelect(sub)}
                                        className="text-[10px] px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-all"
                                      >
                                        {sub.name}
                                      </button>
                                    ))
                                  }
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
