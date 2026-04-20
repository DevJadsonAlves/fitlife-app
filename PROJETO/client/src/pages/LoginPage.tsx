import React, { useState, useEffect } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap, Activity, Sparkles, KeyRound, ArrowLeft, ShieldCheck } from "lucide-react";

interface LoginPageProps {
  initialView?: "auth" | "forgot-password" | "update-password";
  onComplete?: () => void;
}

export default function LoginPage({ initialView = "auth", onComplete }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [view, setView] = useState<"auth" | "forgot-password" | "update-password">(initialView);

  useEffect(() => {
    if (initialView) {
      setView(initialView);
    }
  }, [initialView]);

  const ensureSupabaseConfigured = () => {
    if (isSupabaseConfigured) return true;

    toast.error("Configure o Supabase no arquivo .env.local antes de entrar.");
    return false;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureSupabaseConfigured()) return;

    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) toast.error(error.message);
    else toast.success("Verifique seu e-mail para confirmar o cadastro!");
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureSupabaseConfigured()) return;

    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    else toast.success("Bem-vindo de volta!");
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureSupabaseConfigured()) return;

    if (!email) {
      toast.error("Informe seu e-mail");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("E-mail de recuperação enviado!");
      setView("auth");
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureSupabaseConfigured()) return;

    if (!newPassword || newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha atualizada com sucesso!");
      setView("auth");
      if (onComplete) onComplete();
      await supabase.auth.signOut();
    }
    setLoading(false);
  };

  if (view === "update-password") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="flex justify-center items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Nova <span className="text-emerald-400">Senha</span>
              </h1>
            </div>
            <p className="text-muted-foreground">Crie uma senha forte para proteger sua conta.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Redefinir Senha</CardTitle>
              <CardDescription>Digite sua nova senha abaixo.</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdatePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    placeholder="Mínimo 6 caracteres" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    required 
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600" type="submit" disabled={loading}>
                  {loading ? "Atualizando..." : "Salvar Nova Senha"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  if (view === "forgot-password") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="flex justify-center items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <KeyRound className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Recuperar <span className="text-emerald-400">Senha</span>
              </h1>
            </div>
            <p className="text-muted-foreground">Enviaremos um link para você redefinir sua senha.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Redefinir Senha</CardTitle>
              <CardDescription>Informe o e-mail da sua conta.</CardDescription>
            </CardHeader>
            <form onSubmit={handleResetPassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-mail</Label>
                  <Input 
                    id="reset-email" 
                    type="email" 
                    placeholder="seu@email.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600" type="submit" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar Link de Recuperação"}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => setView("auth")}
                  type="button"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para o login
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Fit<span className="text-emerald-400">Life</span>
            </h1>
          </div>
          <p className="text-muted-foreground">Sua jornada para uma vida saudável começa aqui.</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Entrar</CardTitle>
                <CardDescription>Acesse sua conta para sincronizar seus dados.</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Senha</Label>
                      <button 
                        type="button"
                        onClick={() => setView("forgot-password")}
                        className="text-xs text-emerald-400 hover:underline"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-600" type="submit" disabled={loading}>
                    {loading ? "Carregando..." : "Entrar"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Criar Conta</CardTitle>
                <CardDescription>Comece a salvar seu progresso na nuvem hoje.</CardDescription>
              </CardHeader>
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input id="signup-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-600" type="submit" disabled={loading}>
                    {loading ? "Criando conta..." : "Cadastrar"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-center items-center gap-6 text-muted-foreground/50">
          <Activity className="w-5 h-5" />
          <Sparkles className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
