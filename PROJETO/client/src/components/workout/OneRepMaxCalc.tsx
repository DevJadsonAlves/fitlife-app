import React, { useState } from "react";
import { Calculator, Info, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function OneRepMaxCalc() {
  const [weight, setWeight] = useState<string>("");
  const [reps, setReps] = useState<string>("");
  const [result, setResult] = useState<number | null>(null);

  const calculate1RM = () => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    
    if (w > 0 && r > 0) {
      // Fórmula de Brzycki: Peso / (1.0278 - (0.0278 * Reps))
      const oneRM = w / (1.0278 - (0.0278 * r));
      setResult(Math.round(oneRM));
    }
  };

  const percentages = [95, 90, 85, 80, 75, 70, 60, 50];

  return (
    <div className="bg-card border border-border rounded-3xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
          <Calculator className="w-5 h-5" />
        </div>
        <h3 className="font-bold">Calculadora de 1RM</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase font-bold">Peso (kg)</label>
          <input 
            type="number" 
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Ex: 80"
            className="w-full px-4 py-3 rounded-2xl bg-muted border-none focus:ring-2 focus:ring-amber-500 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase font-bold">Reps</label>
          <input 
            type="number" 
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="Ex: 10"
            className="w-full px-4 py-3 rounded-2xl bg-muted border-none focus:ring-2 focus:ring-amber-500 transition-all"
          />
        </div>
      </div>

      <button 
        onClick={calculate1RM}
        className="w-full py-3 rounded-2xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
      >
        <Zap className="w-4 h-4 fill-current" />
        Calcular Força Máxima
      </button>

      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="text-sm text-amber-500 font-bold uppercase">Sua 1RM Estimada</div>
            <div className="text-4xl font-black text-amber-500">{result}kg</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-bold uppercase flex items-center gap-1">
              <Info className="w-3 h-3" />
              Tabela de Intensidade
            </div>
            <div className="grid grid-cols-2 gap-2">
              {percentages.map(p => (
                <div key={p} className="flex justify-between p-2 rounded-xl bg-muted/50 text-sm">
                  <span className="text-muted-foreground">{p}%</span>
                  <span className="font-bold">{Math.round((result * p) / 100)}kg</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
