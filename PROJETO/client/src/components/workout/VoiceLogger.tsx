import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Volume2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { EXERCISE_LIBRARY } from "@/data/exerciseLibrary";
import { toast } from "sonner";

interface ParsedExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  muscleGroup: string;
  id: string;
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "");
}

function parseVoiceCommand(text: string): ParsedExercise | null {
  const norm = normalize(text);

  // Find matching exercise from library (try full name first, then partial)
  let foundExercise = EXERCISE_LIBRARY.find((ex) => {
    const exNorm = normalize(ex.name);
    return norm.includes(exNorm);
  });

  if (!foundExercise) {
    foundExercise = EXERCISE_LIBRARY.find((ex) => {
      const words = normalize(ex.name).split(" ");
      return words.some((w) => w.length > 4 && norm.includes(w));
    });
  }

  if (!foundExercise) return null;

  // Parse "3x10", "3 x 10", "3X10"
  const setsRepsMatch = norm.match(/(\d+)\s*[x×]\s*(\d+)/);
  // Parse "80kg", "80 kg", "80 quilos", "80 kilos"
  const weightMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|quilo[s]?|kilo[s]?)/);
  // Parse standalone reps: "12 repeticoes", "10 reps", "12 vezes"
  const repsMatch = norm.match(/(\d+)\s*(?:rep[s]?|repeticoe[s]?|vezes)/);
  // Parse standalone sets: "3 series", "4 sets"
  const setsMatch = norm.match(/(\d+)\s*(?:serie[s]?|set[s]?)/);

  const sets = setsRepsMatch
    ? parseInt(setsRepsMatch[1])
    : setsMatch
    ? parseInt(setsMatch[1])
    : foundExercise.suggestedSets;

  const reps = setsRepsMatch
    ? parseInt(setsRepsMatch[2])
    : repsMatch
    ? parseInt(repsMatch[1])
    : 12;

  const weight = weightMatch ? parseFloat(weightMatch[1].replace(",", ".")) : 0;

  return {
    name: foundExercise.name,
    muscleGroup: foundExercise.muscleGroup,
    id: foundExercise.id,
    sets,
    reps,
    weight,
  };
}

interface VoiceLoggerProps {
  onExerciseDetected: (exercise: ParsedExercise) => void;
  onClose: () => void;
}

export function VoiceLogger({ onExerciseDetected, onClose }: VoiceLoggerProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<ParsedExercise | null>(null);
  const [status, setStatus] = useState<"idle" | "listening" | "success" | "error">("idle");
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Reconhecimento de voz não suportado neste navegador");
      return;
    }

    const recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("listening");
      setTranscript("");
      setParsed(null);
    };

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);

      if (result.isFinal) {
        let exercise: ParsedExercise | null = null;
        for (let i = 0; i < result.length; i++) {
          exercise = parseVoiceCommand(result[i].transcript);
          if (exercise) break;
        }

        if (exercise) {
          setParsed(exercise);
          setStatus("success");
        } else {
          setStatus("error");
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatus("error");
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const confirm = useCallback(() => {
    if (!parsed) return;
    onExerciseDetected(parsed);
    toast.success(`${parsed.name} adicionado por voz! 🎤`);
    onClose();
  }, [parsed, onExerciseDetected, onClose]);

  const reset = () => {
    setTranscript("");
    setParsed(null);
    setStatus("idle");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-sm bg-card rounded-3xl border border-border/50 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-5 border-b border-border/50 flex items-center justify-between bg-orange-500/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Volume2 className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Logging por Voz</h3>
              <p className="text-[10px] text-muted-foreground">Fale o exercício naturalmente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status hint */}
          <p className="text-center text-xs text-muted-foreground">
            {status === "idle" && "Pressione o microfone e fale o exercício"}
            {status === "listening" && "🔴 Ouvindo… fale agora"}
            {status === "success" && "✅ Exercício identificado!"}
            {status === "error" && "❌ Não entendi — tente novamente"}
          </p>

          {/* Big mic button */}
          <div className="flex justify-center">
            <motion.button
              onClick={isListening ? stopListening : startListening}
              whileTap={{ scale: 0.88 }}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-colors shadow-xl ${
                isListening
                  ? "bg-red-500 shadow-red-500/30"
                  : status === "success"
                  ? "bg-green-500 shadow-green-500/30"
                  : "bg-orange-500 shadow-orange-500/30"
              }`}
            >
              {isListening && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                    className="absolute inset-0 rounded-full bg-red-400"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.8, delay: 0.3 }}
                    className="absolute inset-0 rounded-full bg-red-400"
                  />
                </>
              )}
              {isListening ? (
                <MicOff className="w-9 h-9 text-white relative z-10" />
              ) : status === "success" ? (
                <CheckCircle className="w-9 h-9 text-white" />
              ) : (
                <Mic className="w-9 h-9 text-white" />
              )}
            </motion.button>
          </div>

          {/* Transcript */}
          <AnimatePresence>
            {transcript && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-3 rounded-xl bg-secondary/50 border border-border/50"
              >
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                  Transcrição
                </p>
                <p className="text-sm italic">"{transcript}"</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Parsed result */}
          <AnimatePresence>
            {parsed && status === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <p className="text-xs font-bold text-green-500">Exercício detectado</p>
                </div>
                <div>
                  <p className="font-bold">{parsed.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {parsed.muscleGroup}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Séries", value: parsed.sets },
                    { label: "Reps", value: parsed.reps },
                    { label: "Peso", value: `${parsed.weight}kg` },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="text-center p-2 rounded-lg bg-background/70 border border-border/50"
                    >
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">
                        {item.label}
                      </p>
                      <p className="font-mono font-bold text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex gap-2 items-start"
              >
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">
                  Não consegui identificar o exercício. Tente dizer o nome completo, ex:{" "}
                  <strong>"Supino reto 3x10 com 80 quilos"</strong>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex gap-2">
            {(status === "success" || status === "error") && (
              <button
                onClick={reset}
                className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm font-bold hover:bg-muted transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar novamente
              </button>
            )}
            {status === "success" && parsed && (
              <button
                onClick={confirm}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-all"
              >
                Adicionar ao treino
              </button>
            )}
          </div>

          <p className="text-[10px] text-center text-muted-foreground">
            Ex: "Agachamento 4 séries de 12 com 60kg"
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
