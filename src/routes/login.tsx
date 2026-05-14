import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Boxes } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { session, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [session, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      toast.success("Sesión iniciada");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center bg-sidebar text-sidebar-foreground p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="relative flex flex-col items-center gap-6">
          <div className="h-32 w-32 rounded-2xl bg-white flex items-center justify-center p-4 shadow-xl">
            <Boxes className="h-full w-full text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">InventaPro</h1>
          <div className="text-sm text-sidebar-foreground/70 tracking-wide uppercase font-bold">
            Plataforma de inventario
          </div>
        </div>
        <div className="absolute bottom-6 text-[11px] text-sidebar-foreground/40">
          © {new Date().getFullYear()} InventaPro
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <div className="h-16 w-16 rounded-xl bg-sidebar flex items-center justify-center p-2">
              <Boxes className="h-full w-full text-primary" strokeWidth={1.5} />
            </div>
            <div className="text-xl font-bold">InventaPro</div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Ingresa con tu correo corporativo.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">Correo</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Procesando..." : "Entrar"}
            </Button>
          </form>

          <div className="text-center mt-6 text-xs text-muted-foreground">
            Acceso restringido. Si no tienes cuenta, contacta al administrador.
          </div>
        </div>
      </div>
    </div>
  );
}
