import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 bg-card">
        <CardContent className="pt-10 pb-10 text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter">404</h1>
            <h2 className="text-xl font-semibold text-foreground">Página não encontrada</h2>
            <p className="text-muted-foreground">
              Desculpe, não conseguimos encontrar a página que você está procurando.
            </p>
          </div>

          <div className="pt-4">
            <Link href="/">
              <Button className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
                <Home className="w-4 h-4" />
                Voltar para o Início
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
