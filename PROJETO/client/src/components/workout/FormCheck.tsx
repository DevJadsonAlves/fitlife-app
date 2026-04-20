import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, X, AlertCircle, Loader2, Sparkles, RotateCcw } from "lucide-react";

interface FormCheckProps {
  exerciseName: string;
  onClose: () => void;
}

export function FormCheck({ exerciseName, onClose }: FormCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [camError, setCamError] = useState("");

  const startCam = useCallback(async () => {
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch {
      setCamError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
    }
  }, []);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  useEffect(() => () => stopCam(), [stopCam]);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
    const b64 = dataUrl.split(",")[1];

    setCaptured(dataUrl);
    setAnalyzing(true);
    setFeedback("");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/jpeg", data: b64 },
                },
                {
                  type: "text",
                  text: `Você é personal trainer especialista em biomecânica. O usuário está executando: ${exerciseName}.

Analise a imagem e dê feedback CONCISO em português (máx 80 palavras):
✅ O que está correto na postura/execução
⚠️ O que precisa de ajuste (se houver)
💡 Dica principal

Se a imagem não mostrar claramente, dê dicas gerais sobre ${exerciseName}.`,
                },
              ],
            },
          ],
        }),
      });
      const data = await res.json();
      const text = data.content?.map((c: any) => c.text || "").join("") || "";
      setFeedback(text || "Não foi possível analisar. Tente novamente.");
    } catch {
      setFeedback("Erro ao conectar com a IA. Verifique sua conexão.");
    } finally {
      setAnalyzing(false);
    }
  }, [exerciseName]);

  const reset = () => {
    setCaptured(null);
    setFeedback("");
    setAnalyzing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        className="w-full max-w-md bg-card rounded-3xl border border-border/50 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between bg-orange-500/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Camera className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Form Check por Câmera</h3>
              <p className="text-[10px] text-muted-foreground">{exerciseName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Camera viewport */}
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
            {captured ? (
              <img
                src={captured}
                alt="Frame capturado"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
                style={{ display: streaming ? "block" : "none" }}
              />
            )}

            {!streaming && !captured && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/50">
                <CameraOff className="w-10 h-10" />
                <p className="text-xs">Câmera inativa</p>
              </div>
            )}

            {/* Alignment guides when streaming */}
            {streaming && !captured && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Rule-of-thirds grid */}
                <div className="absolute top-1/3 inset-x-0 border-t border-white/10" />
                <div className="absolute top-2/3 inset-x-0 border-t border-white/10" />
                <div className="absolute inset-y-0 left-1/3 border-l border-white/10" />
                <div className="absolute inset-y-0 left-2/3 border-l border-white/10" />
                {/* Center silhouette hint */}
                <div className="absolute bottom-2 inset-x-0 text-center">
                  <span className="text-[9px] text-white/50 bg-black/40 px-2 py-0.5 rounded">
                    Posicione-se de modo que o corpo inteiro apareça
                  </span>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Camera error */}
          {camError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{camError}</p>
            </div>
          )}

          {/* AI Feedback */}
          <AnimatePresence>
            {analyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20"
              >
                <Loader2 className="w-4 h-4 text-orange-500 animate-spin flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">Analisando execução…</p>
                  <p className="text-[9px] text-muted-foreground">IA verificando postura e alinhamento</p>
                </div>
              </motion.div>
            )}

            {feedback && !analyzing && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-gradient-to-br from-orange-500/5 to-blue-500/5 border border-orange-500/20"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <p className="text-[10px] uppercase font-bold text-orange-500 tracking-wider">
                    Feedback do Coach
                  </p>
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{feedback}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="flex gap-2">
            {!streaming && !captured && (
              <button
                onClick={startCam}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <Camera className="w-4 h-4" />
                Ligar Câmera
              </button>
            )}

            {streaming && !captured && (
              <>
                <button
                  onClick={stopCam}
                  className="flex-1 py-3 rounded-xl border border-border/50 text-sm font-bold hover:bg-muted transition-all"
                >
                  Desligar
                </button>
                <button
                  onClick={captureAndAnalyze}
                  className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Analisar
                </button>
              </>
            )}

            {captured && (
              <>
                <button
                  onClick={reset}
                  className="flex-1 py-3 rounded-xl border border-border/50 text-sm font-bold hover:bg-muted transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Nova foto
                </button>
                {feedback && (
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-all"
                  >
                    Entendido!
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
