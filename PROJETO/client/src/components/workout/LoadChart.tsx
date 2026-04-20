import { useMemo } from "react";
import { useHabits } from "@/contexts/HabitsContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

export function LoadChart({ exerciseName }: { exerciseName: string }) {
  const { workoutEntries } = useHabits();

  const data = useMemo(() => {
    const history: { date: string; weight: number }[] = [];
    
    workoutEntries.forEach(workout => {
      workout.exercises.forEach(ex => {
        if (ex.name === exerciseName && ex.weight > 0) {
          history.push({
            date: workout.date.split("-").slice(1).reverse().join("/"), // MM/DD -> DD/MM
            weight: ex.weight
          });
        }
      });
    });

    return history.sort((a, b) => a.date.localeCompare(b.date)).slice(-10); // Last 10 entries
  }, [workoutEntries, exerciseName]);

  if (data.length < 2) return null;

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-secondary/20 border border-border/50">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-orange-500" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evolução de Carga (kg)</h4>
      </div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#666" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="#666" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", fontSize: "12px" }}
              itemStyle={{ color: "#f97316" }}
            />
            <Line 
              type="monotone" 
              dataKey="weight" 
              stroke="#f97316" 
              strokeWidth={2} 
              dot={{ fill: "#f97316", r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
