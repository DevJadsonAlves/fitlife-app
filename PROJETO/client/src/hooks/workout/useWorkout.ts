import { useState, useMemo, useCallback } from "react";
import { useHabits, type ExerciseSet } from "@/contexts/HabitsContext";
import { type LibraryExercise } from "@/data/exerciseLibrary";
import { toast } from "sonner";

function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function useWorkout() {
  const { workoutEntries, addWorkoutEntry, removeWorkoutEntry, getDayEntries, currentDate } = useHabits();
  const [showLibrary, setShowLibrary] = useState(false);
  const [currentExercises, setCurrentExercises] = useState<ExerciseSet[]>([]);
  const [duration, setDuration] = useState(60);

  const todayWorkouts = getDayEntries(workoutEntries);

  const addExerciseFromLibrary = useCallback((exercise: LibraryExercise) => {
    const newSet: ExerciseSet = {
      id: generateId(),
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sets: exercise.suggestedSets,
      reps: 12, // default
      weight: 0,
    };
    setCurrentExercises((prev) => [...prev, newSet]);
    setShowLibrary(false);
    toast.success(`${exercise.name} adicionado ao treino!`);
  }, []);

  const updateExercise = useCallback((id: string, updates: Partial<ExerciseSet>) => {
    setCurrentExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...updates } : ex))
    );
  }, []);

  const removeExercise = useCallback((id: string) => {
    setCurrentExercises((prev) => prev.filter((ex) => ex.id !== id));
  }, []);

  const handleSaveWorkout = useCallback(() => {
    if (currentExercises.length === 0) {
      toast.error("Adicione pelo menos um exercício");
      return;
    }
    addWorkoutEntry({
      exercises: currentExercises,
      duration,
    });
    setCurrentExercises([]);
    setDuration(60);
    toast.success("Treino registrado com sucesso! 💪");
  }, [currentExercises, duration, addWorkoutEntry]);

  return {
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
  };
}
