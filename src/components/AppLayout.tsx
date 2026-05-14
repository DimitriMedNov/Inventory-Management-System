import { ReactNode, useEffect, useState } from "react";
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
  Menu,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

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
  { to: "/analisis-ia", label: "Análisis IA", icon: Sparkles, roles: ["admin", "almacen"] },
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
  super_admin: "Super administrador",
};

const ROLE_ICON: Record<AppRole, typeof ShieldCheck> = {
  admin: ShieldCheck,
  almacen: Boxes,
  solicitante: Wrench,
  super_admin: ShieldCheck,
};

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, role, signOut, empresa } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const empresaNombre = empresa?.nombre ?? "InventaPro";
  const empresaLogo = empresa?.logo_url ?? null;

  const visible = NAV.filter((n) => role && n.roles.includes(role));
  const RoleIcon = role ? ROLE_ICON[role] : ShieldCheck;

  // Cerrar sheet al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
      {visible.map((item) => {
        const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
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
  );

  const SidebarBranding = () => (
    <div
      className="flex items-center gap-3 px-5 border-b border-sidebar-border bg-white/5"
      style={{ height: "var(--header-height)" }}
    >
      {empresaLogo ? (
        <img src={empresaLogo} alt={empresaNombre} className="h-10 w-10 rounded-md bg-white p-1 shrink-0 object-contain" />
      ) : (
        <div className="h-10 w-10 rounded-md bg-white flex items-center justify-center shrink-0">
          <Boxes className="h-7 w-7 text-primary" strokeWidth={1.5} />
        </div>
      )}
      <div className="text-base font-semibold tracking-tight truncate">{empresaNombre}</div>
    </div>
  );

  const SidebarFooter = () => (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-2 rounded-md bg-sidebar-hover/40 px-3 py-2">
        <RoleIcon className="h-4 w-4 text-sidebar-foreground/70" />
        <div className="text-xs leading-tight">
          <div className="font-medium">{role ? ROLE_LABEL[role] : ""}</div>
          <div className="text-sidebar-foreground/60 truncate max-w-[150px]">{profile?.nombre}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar fijo (desktop) */}
      <aside
        className="hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
        style={{ width: "var(--sidebar-width)" }}
      >
        <SidebarBranding />
        <NavList />
        <SidebarFooter />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 md:px-6"
          style={{ height: "var(--header-height)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Botón hamburguesa móvil */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0" aria-label="Abrir menú">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
              >
                <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                <div className="flex flex-col h-full">
                  <SidebarBranding />
                  <NavList onNavigate={() => setMobileOpen(false)} />
                  <SidebarFooter />
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <div className="hidden sm:block text-xs text-muted-foreground">{empresaNombre}</div>
              <div className="text-sm font-semibold truncate">{currentTitle(location.pathname)}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right text-xs">
              <div className="font-medium">{profile?.nombre}</div>
              <div className="text-muted-foreground">{profile?.area || profile?.correo}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Salir">
              <LogOut className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background">
          <div className="px-4 md:px-6 py-4 md:py-6 max-w-[1600px] mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}

function currentTitle(path: string) {
  if (path.startsWith("/dashboard")) return "Panel principal";
  if (path.startsWith("/productos")) return "Productos";
  if (path.startsWith("/movimientos")) return "Movimientos de inventario";
  if (path.startsWith("/analisis-ia")) return "Análisis IA de inventario";
  if (path.startsWith("/solicitudes")) return "Solicitudes internas";
  if (path.startsWith("/catalogo")) return "Inventario disponible";
  if (path.startsWith("/categorias")) return "Categorías";
  if (path.startsWith("/ubicaciones")) return "Ubicaciones";
  if (path.startsWith("/proyectos")) return "Proyectos";
  if (path.startsWith("/usuarios")) return "Gestión de usuarios";
  return "Panel";
}
