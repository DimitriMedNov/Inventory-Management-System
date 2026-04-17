import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { AppLayout } from "./AppLayout";

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: AppRole[] }) {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">
        Cargando…
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
