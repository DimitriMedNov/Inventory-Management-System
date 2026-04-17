import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "destructive" | "info";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const toneCls: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  };
  return (
    <div className="rounded-lg border border-border bg-card p-5 flex items-start justify-between">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
        <div className="text-3xl font-semibold mt-2 tracking-tight">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </div>
      {Icon && (
        <div className={`h-10 w-10 rounded-md flex items-center justify-center ${toneCls[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendiente: "bg-warning/15 text-warning-foreground border border-warning/30",
    aprobada: "bg-info/10 text-info border border-info/30",
    lista: "bg-primary/10 text-primary border border-primary/30",
    entregada: "bg-success/10 text-success border border-success/30",
    rechazada: "bg-destructive/10 text-destructive border border-destructive/30",
    cancelada: "bg-muted text-muted-foreground border border-border",
    entrada: "bg-success/10 text-success border border-success/30",
    salida: "bg-destructive/10 text-destructive border border-destructive/30",
    ajuste: "bg-info/10 text-info border border-info/30",
  };
  const labels: Record<string, string> = {
    lista: "Lista para recoger",
  };
  const cls = map[status] ?? "bg-muted text-muted-foreground border border-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {labels[status] ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
