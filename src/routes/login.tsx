import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Boxes } from "lucide-react";
import { toast } from "sonner";

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
      {/* Panel izquierdo branding */}
      <div className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-white/15 flex items-center justify-center">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <div className="font-semibold">Inventario Taller</div>
            <div className="text-xs text-primary-foreground/70">Sistema empresarial</div>
          </div>
        </div>
        <div className="space-y-6 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight">
            Control total de tu almacén,<br />en una sola plataforma.
          </h1>
          <p className="text-primary-foreground/80 leading-relaxed">
            Gestiona herramientas, materiales y refacciones. Aprueba solicitudes internas,
            registra entradas y salidas, y mantén tu inventario actualizado en tiempo real.
          </p>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li>• Tres roles: administrador, almacén y solicitante</li>
            <li>• Descuento automático de stock al entregar</li>
            <li>• Historial completo de movimientos</li>
            <li>• Alertas de stock mínimo</li>
          </ul>
        </div>
        <div className="text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} Inventario Taller — Plataforma interna
        </div>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="font-semibold">Inventario Taller</div>
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
