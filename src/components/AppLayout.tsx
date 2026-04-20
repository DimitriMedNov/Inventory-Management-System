import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  ClipboardList,
  LogOut,
  Boxes,
  ShieldCheck,
  Wrench,
  Tags,
  MapPin,
  Users,
  Warehouse,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import diprolamIcon from "@/assets/diprolam-icon.png";
import diprolamLogo from "@/assets/diprolam-logo.png";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: AppRole[];
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Panel principal", icon: LayoutDashboard, roles: ["admin", "almacen", "solicitante"] },
  { to: "/productos", label: "Productos", icon: Package, roles: ["admin", "almacen"] },
  { to: "/movimientos", label: "Movimientos", icon: ArrowLeftRight, roles: ["admin", "almacen"] },
  { to: "/solicitudes", label: "Solicitudes", icon: ClipboardList, roles: ["admin", "almacen", "solicitante"] },
  { to: "/catalogo", label: "Inventario", icon: Warehouse, roles: ["solicitante", "admin", "almacen"] },
  { to: "/categorias", label: "Categorías", icon: Tags, roles: ["admin", "almacen"] },
  { to: "/ubicaciones", label: "Ubicaciones", icon: MapPin, roles: ["admin", "almacen"] },
  { to: "/proyectos", label: "Proyectos", icon: Briefcase, roles: ["admin"] },
  { to: "/usuarios", label: "Usuarios", icon: Users, roles: ["admin"] },
];

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  almacen: "Encargado de almacén",
  solicitante: "Solicitante",
};

const ROLE_ICON: Record<AppRole, typeof ShieldCheck> = {
  admin: ShieldCheck,
  almacen: Boxes,
  solicitante: Wrench,
};

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const visible = NAV.filter((n) => role && n.roles.includes(role));
  const RoleIcon = role ? ROLE_ICON[role] : ShieldCheck;

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar fijo */}
      <aside
        className="hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
        style={{ width: "var(--sidebar-width)" }}
      >
        <div className="flex items-center gap-2 px-5 border-b border-sidebar-border" style={{ height: "var(--header-height)" }}>
          <img src={diprolamIcon} alt="Diprolam" className="h-9 w-9 rounded-md bg-white p-1" />
          <div className="leading-tight">
            <div className="font-semibold text-sm">Diprolam Bjx</div>
            <div className="text-[11px] text-sidebar-foreground/70">Inventario interno</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visible.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "hover:bg-sidebar-hover text-sidebar-foreground/85"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 rounded-md bg-sidebar-hover/40 px-3 py-2">
            <RoleIcon className="h-4 w-4 text-sidebar-foreground/70" />
            <div className="text-xs leading-tight">
              <div className="font-medium">{role ? ROLE_LABEL[role] : ""}</div>
              <div className="text-sidebar-foreground/60 truncate max-w-[150px]">{profile?.nombre}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex items-center justify-between gap-4 border-b border-border bg-card px-6"
          style={{ height: "var(--header-height)" }}
        >
          <div>
            <div className="text-xs text-muted-foreground">Diprolam Bjx</div>
            <div className="text-sm font-semibold">{currentTitle(location.pathname)}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right text-xs">
              <div className="font-medium">{profile?.nombre}</div>
              <div className="text-muted-foreground">{profile?.area || profile?.correo}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" /> Salir
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background">
          <div className="px-6 py-6 max-w-[1600px] mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}

function currentTitle(path: string) {
  if (path.startsWith("/dashboard")) return "Panel principal";
  if (path.startsWith("/productos")) return "Productos";
  if (path.startsWith("/movimientos")) return "Movimientos de inventario";
  if (path.startsWith("/solicitudes")) return "Solicitudes internas";
  if (path.startsWith("/catalogo")) return "Inventario disponible";
  if (path.startsWith("/categorias")) return "Categorías";
  if (path.startsWith("/ubicaciones")) return "Ubicaciones";
  if (path.startsWith("/proyectos")) return "Proyectos";
  if (path.startsWith("/usuarios")) return "Gestión de usuarios";
  return "Panel";
}
