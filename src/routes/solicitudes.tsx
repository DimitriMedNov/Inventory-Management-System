import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Eye, CheckCircle2, XCircle, Truck, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/solicitudes")({
  component: Page,
});

interface Sol {
  id: string;
  folio: number;
  estatus: "pendiente" | "aprobada" | "rechazada" | "cancelada" | "entregada";
  comentarios_usuario: string | null;
  comentarios_admin: string | null;
  comentarios_almacen: string | null;
  fecha_solicitud: string;
  fecha_autorizacion: string | null;
  fecha_entrega: string | null;
  usuario_id: string;
  profiles: { nombre: string; area: string | null } | null;
}

interface Detalle {
  id: string;
  cantidad_solicitada: number;
  cantidad_entregada: number;
  productos: { nombre: string; sku: string; unidad_medida: string; stock_actual: number } | null;
}

function Page() {
  return <RequireAuth><Inner /></RequireAuth>;
}

function Inner() {
  const { user, role } = useAuth();
  const [sols, setSols] = useState<Sol[]>([]);
  const [filter, setFilter] = useState<string>("todas");
  const [detail, setDetail] = useState<Sol | null>(null);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [comentario, setComentario] = useState("");
  const [entregas, setEntregas] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    let q = supabase.from("solicitudes")
      .select("*")
      .order("fecha_solicitud", { ascending: false });
    if (role === "solicitante" && user) q = q.eq("usuario_id", user.id);
    const { data, error } = await q;
    if (error) { toast.error(error.message); return; }
    const rows = (data ?? []) as unknown as Sol[];
    const ids = Array.from(new Set(rows.map((r) => r.usuario_id)));
    let profMap: Record<string, { nombre: string; area: string | null }> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles").select("id, nombre, area").in("id", ids);
      profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, { nombre: p.nombre, area: p.area }]));
    }
    setSols(rows.map((r) => ({ ...r, profiles: profMap[r.usuario_id] ?? null })));
  }, [role, user]);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (s: Sol) => {
    setDetail(s);
    setComentario("");
    const { data, error } = await supabase
      .from("detalle_solicitud")
      .select("id, cantidad_solicitada, cantidad_entregada, productos(nombre, sku, unidad_medida, stock_actual)")
      .eq("solicitud_id", s.id);
    if (error) { toast.error(error.message); return; }
    const det = (data ?? []) as unknown as Detalle[];
    setDetalles(det);
    const initEntr: Record<string, number> = {};
    det.forEach((d) => { initEntr[d.id] = Number(d.cantidad_solicitada); });
    setEntregas(initEntr);
  };

  const aprobar = async () => {
    if (!detail) return;
    const { error } = await supabase.from("solicitudes").update({
      estatus: "aprobada",
      autorizado_por: user?.id,
      fecha_autorizacion: new Date().toISOString(),
      comentarios_admin: comentario || null,
    }).eq("id", detail.id);
    if (error) return toast.error(error.message);
    toast.success("Solicitud aprobada");
    setDetail(null); load();
  };

  const rechazar = async () => {
    if (!detail) return;
    const { error } = await supabase.from("solicitudes").update({
      estatus: "rechazada",
      autorizado_por: user?.id,
      fecha_autorizacion: new Date().toISOString(),
      comentarios_admin: comentario || null,
    }).eq("id", detail.id);
    if (error) return toast.error(error.message);
    toast.success("Solicitud rechazada");
    setDetail(null); load();
  };

  const cancelar = async () => {
    if (!detail) return;
    const { error } = await supabase.from("solicitudes").update({ estatus: "cancelada" }).eq("id", detail.id);
    if (error) return toast.error(error.message);
    toast.success("Solicitud cancelada");
    setDetail(null); load();
  };

  const entregar = async () => {
    if (!detail) return;
    const payload = Object.entries(entregas).map(([detalle_id, cantidad_entregada]) => ({ detalle_id, cantidad_entregada }));
    const { error } = await supabase.rpc("entregar_solicitud", {
      _solicitud_id: detail.id,
      _entregas: payload,
      _comentarios: comentario || undefined,
    });
    if (error) return toast.error(error.message);
    toast.success("Solicitud entregada y stock descontado");
    setDetail(null); load();
  };

  const filtered = sols.filter((s) => filter === "todas" ? true : s.estatus === filter);

  return (
    <>
      <PageHeader
        title="Solicitudes internas"
        description={role === "solicitante" ? "Tus solicitudes al almacén." : "Gestión de solicitudes y entregas."}
        actions={
          <Link to="/catalogo">
            <Button><ShoppingCart className="h-4 w-4 mr-1" /> Nueva solicitud</Button>
          </Link>
        }
      />

      <Tabs value={filter} onValueChange={setFilter} className="mb-4">
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="pendiente">Pendientes</TabsTrigger>
          <TabsTrigger value="aprobada">Aprobadas</TabsTrigger>
          <TabsTrigger value="entregada">Entregadas</TabsTrigger>
          <TabsTrigger value="rechazada">Rechazadas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Folio</th>
              <th className="px-4 py-3 font-medium">Solicitante</th>
              <th className="px-4 py-3 font-medium">Área</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Estatus</th>
              <th className="px-4 py-3 font-medium">Entregada</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono">#{s.folio}</td>
                <td className="px-4 py-3 font-medium">{s.profiles?.nombre ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.profiles?.area ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(s.fecha_solicitud).toLocaleString()}</td>
                <td className="px-4 py-3"><StatusBadge status={s.estatus} /></td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.fecha_entrega ? new Date(s.fecha_entrega).toLocaleString() : "—"}</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="ghost" onClick={() => openDetail(s)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Sin solicitudes en este filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>Solicitud #{detail.folio} <StatusBadge status={detail.estatus} /></DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><div className="text-xs text-muted-foreground">Solicitante</div><div className="font-medium">{detail.profiles?.nombre}</div></div>
                <div><div className="text-xs text-muted-foreground">Área</div><div className="font-medium">{detail.profiles?.area ?? "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Fecha solicitud</div><div>{new Date(detail.fecha_solicitud).toLocaleString()}</div></div>
                {detail.fecha_entrega && <div><div className="text-xs text-muted-foreground">Fecha entrega</div><div>{new Date(detail.fecha_entrega).toLocaleString()}</div></div>}
                {detail.comentarios_usuario && <div className="col-span-2"><div className="text-xs text-muted-foreground">Comentarios del solicitante</div><div>{detail.comentarios_usuario}</div></div>}
                {detail.comentarios_admin && <div className="col-span-2"><div className="text-xs text-muted-foreground">Comentarios del administrador</div><div>{detail.comentarios_admin}</div></div>}
                {detail.comentarios_almacen && <div className="col-span-2"><div className="text-xs text-muted-foreground">Comentarios de almacén</div><div>{detail.comentarios_almacen}</div></div>}
              </div>

              <div className="rounded-md border border-border overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr className="text-left">
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2 text-right">Solicitada</th>
                      <th className="px-3 py-2 text-right">Stock</th>
                      {detail.estatus === "aprobada" && role !== "solicitante" && <th className="px-3 py-2 text-right">Entregar</th>}
                      {(detail.estatus === "entregada") && <th className="px-3 py-2 text-right">Entregada</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detalles.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-2"><div className="font-medium">{d.productos?.nombre}</div><div className="text-xs text-muted-foreground">{d.productos?.sku}</div></td>
                        <td className="px-3 py-2 text-right">{d.cantidad_solicitada} {d.productos?.unidad_medida}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{d.productos?.stock_actual}</td>
                        {detail.estatus === "aprobada" && role !== "solicitante" && (
                          <td className="px-3 py-2 text-right">
                            <Input type="number" className="h-8 w-24 ml-auto text-right"
                              value={entregas[d.id] ?? 0}
                              max={Math.min(Number(d.cantidad_solicitada), Number(d.productos?.stock_actual ?? 0))}
                              min={0}
                              onChange={(e) => setEntregas({ ...entregas, [d.id]: Number(e.target.value) })} />
                          </td>
                        )}
                        {detail.estatus === "entregada" && (
                          <td className="px-3 py-2 text-right font-medium">{d.cantidad_entregada}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {role !== "solicitante" && detail.estatus !== "cancelada" && (
                <div className="mb-3">
                  <Label>Comentario {detail.estatus === "pendiente" ? "(autorización)" : detail.estatus === "aprobada" ? "(entrega)" : ""}</Label>
                  <Textarea rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Notas internas para esta solicitud..." />
                </div>
              )}
              {role === "solicitante" && detail.estatus === "pendiente" && detail.usuario_id === user?.id && (
                <div className="mb-3">
                  <Label>Comentario</Label>
                  <Textarea rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} />
                </div>
              )}

              <DialogFooter className="flex flex-wrap gap-2">
                {(role === "admin" || role === "almacen") && detail.estatus === "pendiente" && (
                  <>
                    <Button variant="outline" onClick={rechazar}><XCircle className="h-4 w-4 mr-1" /> Rechazar</Button>
                    <Button onClick={aprobar}><CheckCircle2 className="h-4 w-4 mr-1" /> Aprobar</Button>
                  </>
                )}
                {(role === "admin" || role === "almacen") && detail.estatus === "aprobada" && (
                  <Button onClick={entregar}><Truck className="h-4 w-4 mr-1" /> Marcar como entregada</Button>
                )}
                {role === "solicitante" && detail.estatus === "pendiente" && detail.usuario_id === user?.id && (
                  <Button variant="outline" onClick={cancelar}>Cancelar solicitud</Button>
                )}
                <Button variant="ghost" onClick={() => setDetail(null)}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
