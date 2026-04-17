import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Briefcase, CheckCircle2, XCircle, Package } from "lucide-react";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/fmt";

export const Route = createFileRoute("/proyectos/$id")({
  component: Page,
});

interface Proyecto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

interface DetalleItem {
  id: string;
  cantidad_solicitada: number;
  cantidad_entregada: number;
  productos: { nombre: string; sku: string; unidad_medida: string } | null;
}

interface Sol {
  id: string;
  folio: number;
  estatus: string;
  fecha_solicitud: string;
  fecha_requerida: string | null;
  fecha_autorizacion: string | null;
  fecha_lista: string | null;
  fecha_entrega: string | null;
  comentarios_usuario: string | null;
  usuario_id: string;
  profiles?: { nombre: string; area: string | null } | null;
  detalle_solicitud: DetalleItem[];
}

function Page() {
  return (
    <RequireAuth roles={["admin"]}>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { id } = Route.useParams();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [sols, setSols] = useState<Sol[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const { data: p, error: e1 } = await supabase
      .from("proyectos")
      .select("id, codigo, nombre, descripcion, activo")
      .eq("id", id)
      .maybeSingle();
    if (e1) return toast.error(e1.message);
    setProyecto(p as Proyecto | null);

    const { data: s, error: e2 } = await supabase
      .from("solicitudes")
      .select("id, folio, estatus, fecha_solicitud, fecha_requerida, fecha_autorizacion, fecha_lista, fecha_entrega, comentarios_usuario, usuario_id, detalle_solicitud(id, cantidad_solicitada, cantidad_entregada, productos(nombre, sku, unidad_medida))")
      .eq("proyecto_id", id)
      .order("fecha_solicitud", { ascending: false });
    if (e2) return toast.error(e2.message);

    const rows = (s ?? []) as unknown as Sol[];
    const ids = Array.from(new Set(rows.map((r) => r.usuario_id)));
    let profMap: Record<string, { nombre: string; area: string | null }> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles").select("id, nombre, area").in("id", ids);
      profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, { nombre: p.nombre, area: p.area }]));
    }
    setSols(rows.map((r) => ({ ...r, profiles: profMap[r.usuario_id] ?? null })));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const totalSols = sols.length;
  const entregadas = sols.filter((s) => s.estatus === "entregada").length;
  const pendientes = sols.filter((s) => ["pendiente", "aprobada", "lista"].includes(s.estatus)).length;
  const totalItems = sols.reduce((acc, s) =>
    acc + s.detalle_solicitud.reduce((a, d) => a + Number(d.cantidad_entregada || 0), 0), 0);

  if (!proyecto) {
    return (
      <div className="text-sm text-muted-foreground">Cargando proyecto…</div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/proyectos"><ArrowLeft className="h-4 w-4 mr-1" /> Volver a proyectos</Link>
        </Button>
      </div>

      <PageHeader
        title={`${proyecto.codigo} — ${proyecto.nombre}`}
        description={proyecto.descripcion ?? "Historial completo de solicitudes asignadas a este proyecto."}
        actions={
          proyecto.activo
            ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Activo</span>
            : <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs font-medium"><XCircle className="h-3.5 w-3.5" /> Terminado</span>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Solicitudes totales" value={totalSols} icon={Briefcase} />
        <Stat label="Entregadas" value={entregadas} />
        <Stat label="En proceso" value={pendientes} />
        <Stat label="Items entregados" value={totalItems} icon={Package} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border text-sm font-medium">Historial de solicitudes</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Folio</th>
                <th className="px-4 py-3 font-medium">Solicitante</th>
                <th className="px-4 py-3 font-medium">Estatus</th>
                <th className="px-4 py-3 font-medium">Solicitado</th>
                <th className="px-4 py-3 font-medium">Entregado</th>
                <th className="px-4 py-3 font-medium text-right">Items</th>
                <th className="px-4 py-3 font-medium w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sols.map((s) => {
                const open = !!expanded[s.id];
                const items = s.detalle_solicitud.length;
                return (
                  <FragmentRow key={s.id} s={s} open={open} onToggle={() => setExpanded((e) => ({ ...e, [s.id]: !open }))} />
                );
                        <div className="font-medium">{s.profiles?.nombre ?? "—"}</div>
                        {s.profiles?.area && <div className="text-xs text-muted-foreground">{s.profiles.area}</div>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={s.estatus} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDateTime(s.fecha_solicitud)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDateTime(s.fecha_entrega)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{items}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost"
                          onClick={() => setExpanded((e) => ({ ...e, [s.id]: !open }))}>
                          {open ? "Ocultar" : "Ver"}
                        </Button>
                      </td>
                    </tr>
                    {open && (
                      <tr key={s.id + "-d"} className="bg-muted/20">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid md:grid-cols-2 gap-4 mb-3 text-xs">
                            <Info label="Solicitada" value={fmtDateTime(s.fecha_solicitud)} />
                            <Info label="Requerida" value={fmtDateTime(s.fecha_requerida)} />
                            <Info label="Autorizada" value={fmtDateTime(s.fecha_autorizacion)} />
                            <Info label="Lista" value={fmtDateTime(s.fecha_lista)} />
                            <Info label="Entregada" value={fmtDateTime(s.fecha_entrega)} />
                            {s.comentarios_usuario && (
                              <Info label="Comentarios" value={s.comentarios_usuario} />
                            )}
                          </div>
                          <div className="rounded-md border border-border bg-card overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/40 text-muted-foreground">
                                <tr className="text-left">
                                  <th className="px-3 py-2 font-medium">SKU</th>
                                  <th className="px-3 py-2 font-medium">Producto</th>
                                  <th className="px-3 py-2 font-medium text-right">Solicitado</th>
                                  <th className="px-3 py-2 font-medium text-right">Entregado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {s.detalle_solicitud.map((d) => (
                                  <tr key={d.id}>
                                    <td className="px-3 py-2 font-mono">{d.productos?.sku ?? "—"}</td>
                                    <td className="px-3 py-2">{d.productos?.nombre ?? "—"}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {Number(d.cantidad_solicitada)} {d.productos?.unidad_medida ?? ""}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {Number(d.cantidad_entregada)} {d.productos?.unidad_medida ?? ""}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {sols.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  Este proyecto aún no tiene solicitudes.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-start justify-between">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
        <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      </div>
      {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
