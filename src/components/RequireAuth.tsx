import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { AppLayout } from "./AppLayout";
import diprolamIcon from "@/assets/diprolam-icon.png";

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: AppRole[] }) {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-sidebar">
        <div className="flex flex-col items-center gap-5">
          <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center p-3 shadow-xl animate-pulse">
            <img src={diprolamIcon} alt="Diprolam" className="h-full w-full object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
          </div>
          <div className="text-[11px] text-sidebar-foreground/60 uppercase tracking-[0.2em]">Diprolam Bjx</div>
        </div>
      </div>
    );
  }

  if (roles && role && !roles.includes(role)) {
    return (
      <AppLayout>
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold mb-2">Acceso restringido</h2>
          <p className="text-sm text-muted-foreground">
            Tu rol ({role}) no tiene permisos para ver esta sección.
          </p>
        </div>
      </AppLayout>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
