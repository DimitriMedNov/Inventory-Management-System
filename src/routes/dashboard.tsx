import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader, StatCard, StatusBadge } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Package, AlertTriangle, ClipboardList, CheckCircle2, ArrowDown, ArrowUp } from "lucide-react";
import { fmtDateTime } from "@/lib/fmt";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

interface Stats {
  totalProductos: number;
  stockBajo: number;
  pendientes: number;
  aprobadas: number;
  entregadas: number;
  misPendientes: number;
  misEntregadas: number;
  movimientos: number;
}

function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}

function DashboardInner() {
  const { role, profile, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  type Movimiento = { id: string; tipo: string; cantidad: number; fecha: string; productos: { nombre: string; sku: string } | null };
  type Solicitud = { id: string; folio: number; estatus: string; fecha_solicitud: string; profiles: { nombre: string } | null };
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [recientes, setRecientes] = useState<Solicitud[]>([]);

  useEffect(() => {
    (async () => {
      const [prod, stockBajo, sPend, sAprob, sEntr, misPend, misEntr, movCount, ultMov, ultSol] = await Promise.all([
        supabase.from("productos").select("*", { count: "exact", head: true }).eq("activo", true),
        supabase.from("productos").select("id, nombre, stock_actual, stock_minimo").eq("activo", true),
        supabase.from("solicitudes").select("*", { count: "exact", head: true }).eq("estatus", "pendiente"),
        supabase.from("solicitudes").select("*", { count: "exact", head: true }).eq("estatus", "aprobada"),
        supabase.from("solicitudes").select("*", { count: "exact", head: true }).eq("estatus", "entregada"),
        user ? supabase.from("solicitudes").select("*", { count: "exact", head: true }).eq("usuario_id", user.id).eq("estatus", "pendiente") : Promise.resolve({ count: 0 }),
        user ? supabase.from("solicitudes").select("*", { count: "exact", head: true }).eq("usuario_id", user.id).eq("estatus", "entregada") : Promise.resolve({ count: 0 }),
        supabase.from("movimientos_inventario").select("*", { count: "exact", head: true }),
        supabase.from("movimientos_inventario").select("id, tipo, cantidad, fecha, productos(nombre, sku)").order("fecha", { ascending: false }).limit(8),
        supabase.from("solicitudes").select("id, folio, estatus, fecha_solicitud, usuario_id").order("fecha_solicitud", { ascending: false }).limit(8),
      ]);

      const solRows = (ultSol.data ?? []) as Array<{ id: string; folio: number; estatus: string; fecha_solicitud: string; usuario_id: string }>;
      const userIds = Array.from(new Set(solRows.map((s) => s.usuario_id)));
      let profMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, nombre").in("id", userIds);
        profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.nombre]));
      }

      const stockBajoCount = (stockBajo.data || []).filter((p) => Number(p.stock_actual) <= Number(p.stock_minimo)).length;

      setStats({
        totalProductos: prod.count ?? 0,
        stockBajo: stockBajoCount,
        pendientes: sPend.count ?? 0,
        aprobadas: sAprob.count ?? 0,
        entregadas: sEntr.count ?? 0,
        misPendientes: misPend.count ?? 0,
        misEntregadas: misEntr.count ?? 0,
        movimientos: movCount.count ?? 0,
      });
      setMovs((ultMov.data ?? []) as unknown as Movimiento[]);
      setRecientes(solRows.map((s) => ({ ...s, profiles: { nombre: profMap[s.usuario_id] ?? "—" } })) as unknown as Solicitud[]);
    })();
  }, [user]);

  return (
    <>
      <PageHeader
        title={`Hola, ${profile?.nombre?.split(" ")[0] ?? ""}`}
        description={`Vista general del sistema · Rol: ${role}`}
      />

      {/* Cards de métricas */}
      {role === "solicitante" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-6">
          <StatCard label="Mis solicitudes pendientes" value={stats?.misPendientes ?? "—"} icon={ClipboardList} tone="warning" />
          <StatCard label="Mis entregadas" value={stats?.misEntregadas ?? "—"} icon={CheckCircle2} tone="success" />
          <StatCard label="Productos disponibles" value={stats?.totalProductos ?? "—"} icon={Package} tone="info" />
          <StatCard label="Stock bajo" value={stats?.stockBajo ?? "—"} icon={AlertTriangle} tone="destructive" hint="Artículos por debajo del mínimo" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
          <StatCard label="Productos" value={stats?.totalProductos ?? "—"} icon={Package} tone="info" />
          <StatCard label="Stock bajo" value={stats?.stockBajo ?? "—"} icon={AlertTriangle} tone="destructive" />
          <StatCard label="Pendientes" value={stats?.pendientes ?? "—"} icon={ClipboardList} tone="warning" />
          <StatCard label="Aprobadas" value={stats?.aprobadas ?? "—"} icon={ClipboardList} tone="info" />
          <StatCard label="Entregadas" value={stats?.entregadas ?? "—"} icon={CheckCircle2} tone="success" />
          <StatCard label="Movimientos" value={stats?.movimientos ?? "—"} icon={ArrowDown} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Movimientos recientes */}
        {role !== "solicitante" && (
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 md:px-5 py-4 border-b border-border">
              <h3 className="font-semibold">Movimientos recientes</h3>
              <p className="text-xs text-muted-foreground">Últimas entradas, salidas y ajustes</p>
            </div>
            <div className="divide-y divide-border">
              {movs.length === 0 && <p className="p-5 text-sm text-muted-foreground">Sin movimientos registrados.</p>}
              {movs.map((m) => (
                <div key={m.id} className="px-4 md:px-5 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${m.tipo === "entrada" ? "bg-success/10 text-success" : m.tipo === "salida" ? "bg-destructive/10 text-destructive" : "bg-info/10 text-info"}`}>
                      {m.tipo === "entrada" ? <ArrowDown className="h-4 w-4" /> : m.tipo === "salida" ? <ArrowUp className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{m.productos?.nombre ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{m.productos?.sku} · {fmtDateTime(m.fecha)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={m.tipo} />
                    <div className="text-sm font-medium mt-1">{Math.abs(Number(m.cantidad))}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Solicitudes recientes */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 md:px-5 py-4 border-b border-border">
            <h3 className="font-semibold">Solicitudes recientes</h3>
            <p className="text-xs text-muted-foreground">Últimas solicitudes registradas</p>
          </div>
          <div className="divide-y divide-border">
            {recientes.length === 0 && <p className="p-5 text-sm text-muted-foreground">Sin solicitudes.</p>}
            {recientes.map((s) => (
              <div key={s.id} className="px-4 md:px-5 py-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">Folio #{s.folio} · {s.profiles?.nombre ?? ""}</div>
                  <div className="text-xs text-muted-foreground">{fmtDateTime(s.fecha_solicitud)}</div>
                </div>
                <StatusBadge status={s.estatus} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
