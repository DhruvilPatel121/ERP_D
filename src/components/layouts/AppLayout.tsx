import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Gem,
  Package,
  ShoppingCart,
  Hammer,
  Factory,
  BarChart3,
  Settings,
  FileDown,
  LogOut,
  Menu,
  ChevronRight,
  Database,
  History,
  Sparkles,
  Circle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/ERPAuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  children?: { label: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Customers", icon: Users, href: "/customers" },
  { label: "Stones", icon: Gem, href: "/stones" },
  { label: "Patterns", icon: Package, href: "/patterns" },
  { label: "Orders", icon: ShoppingCart, href: "/orders" },
  { label: "Karigars", icon: Hammer, href: "/karigars" },
  { label: "Production", icon: Factory, href: "/production" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Export", icon: FileDown, href: "/export" },
  { label: "Backup", icon: Database, href: "/backup" },
  { label: "Activity Log", icon: History, href: "/activity" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

function NavLink({
  item,
  collapsed,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const location = useLocation();
  const isActive =
    location.pathname === item.href ||
    (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
  const Icon = item.icon;

  const inner = (
    <Link
      to={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded text-[12.5px] font-medium transition-all duration-100 select-none",
        "text-[hsl(var(--sidebar-foreground)/0.65)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]",
        isActive &&
          "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))] border-l-[3px] border-[hsl(var(--sidebar-primary))] pl-[calc(0.625rem-1px)]",
        collapsed && "justify-center px-0 border-l-0 pl-0",
      )}
    >
      <Icon size={15} className="shrink-0" />
      {!collapsed && (
        <span className="truncate leading-none">{item.label}</span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }
  return inner;
}

function SidebarInner({
  collapsed,
  onClose,
}: {
  collapsed: boolean;
  onClose?: () => void;
}) {
  const { auth, businessSettings, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "hsl(var(--sidebar))" }}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center gap-2.5 border-b px-3 py-3 shrink-0",
          "border-[hsl(var(--sidebar-border))]",
          collapsed && "justify-center",
        )}
      >
        <div className="w-7 h-7 rounded bg-[hsl(var(--sidebar-primary))] flex items-center justify-center shrink-0">
          <Sparkles
            size={13}
            className="text-[hsl(var(--sidebar-primary-foreground))]"
          />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-[hsl(var(--sidebar-foreground))] truncate leading-tight">
              {businessSettings.businessName || "Silver ERP"}
            </p>
            <p className="text-[10px] text-[hsl(var(--sidebar-foreground)/0.45)] leading-none mt-0.5">
              Manufacturing ERP
            </p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* User footer */}
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-2 border-t border-[hsl(var(--sidebar-border))] shrink-0",
          collapsed && "justify-center",
        )}
      >
        <div className="w-6 h-6 rounded-full bg-[hsl(var(--sidebar-primary))] flex items-center justify-center text-[10px] font-bold text-[hsl(var(--sidebar-primary-foreground))] shrink-0 select-none">
          {(auth.userId.slice(0, 2) || "AD").toUpperCase()}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-[11.5px] font-medium text-[hsl(var(--sidebar-foreground))] truncate">
              {auth.userId}
            </p>
            <p className="text-[10px] text-[hsl(var(--sidebar-foreground)/0.45)] capitalize">
              Administrator
            </p>
          </div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="w-6 h-6 flex items-center justify-center rounded text-[hsl(var(--sidebar-foreground)/0.5)] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
            >
              <LogOut size={13} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Logout
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

/* ── Status Bar ─────────────────────────────────────────────── */
function StatusBar() {
  const { auth } = useAuth();
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );
  useEffect(() => {
    const t = setInterval(
      () =>
        setTime(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        ),
      30000,
    );
    return () => clearInterval(t);
  }, []);
  return (
    <div className="erp-statusbar">
      <span className="flex items-center gap-1.5">
        <Circle size={6} className="fill-green-400 text-green-400" />
        <span className="opacity-80">DB: Connected</span>
      </span>
      <span className="opacity-60">|</span>
      <span className="opacity-80">User: {auth.userId}</span>
      <span className="flex-1" />
      <span className="opacity-70 font-mono">{time}</span>
    </div>
  );
}

/* ── Main App Layout ────────────────────────────────────────── */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="erp-shell">
        {/* Desktop sidebar */}
        <div
          className="erp-sidebar hidden md:flex"
          style={{
            width: collapsed
              ? "var(--sidebar-collapsed-width)"
              : "var(--sidebar-width)",
          }}
        >
          <SidebarInner collapsed={collapsed} />
        </div>

        {/* Mobile sidebar (Sheet) */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="p-0 w-56 border-0"
            style={{ background: "hsl(var(--sidebar))" }}
          >
            <SidebarInner
              collapsed={false}
              onClose={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main area */}
        <div className="erp-main">
          {/* Top toolbar */}
          <div className="erp-toolbar">
            {/* Desktop collapse toggle */}
            <button
              onClick={() => setCollapsed((p) => !p)}
              className="hidden md:flex w-7 h-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            >
              {collapsed ? (
                <PanelLeftOpen size={15} />
              ) : (
                <PanelLeftClose size={15} />
              )}
            </button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:bg-muted"
            >
              <Menu size={15} />
            </button>
            <div className="flex-1 min-w-0" />
          </div>

          {/* Page content */}
          <div className="erp-content animate-fade-in">{children}</div>

          {/* Status bar */}
          <StatusBar />
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ── Breadcrumb ─────────────────────────────────────────────── */
export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string; onClick?: () => void }[];
}) {
  const navigate = useNavigate();
  return (
    <nav className="breadcrumb">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={10} className="opacity-40 shrink-0" />}
          {(item.href || item.onClick) && i < items.length - 1 ? (
            <button
              onClick={() => {
                if (item.onClick) item.onClick();
                else if (item.href) navigate(item.href);
              }}
            >
              {item.label}
            </button>
          ) : (
            <span className={i === items.length - 1 ? "current" : ""}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/* ── Page Toolbar (replaces PageHeader) ────────────────────── */
export function PageToolbar({
  breadcrumbs,
  title,
  actions,
  subtitle,
}: {
  breadcrumbs?: { label: string; href?: string; onClick?: () => void }[];
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="erp-toolbar border-b border-border bg-card"
      style={{
        height: "auto",
        minHeight: "var(--toolbar-height)",
        padding: "0 16px",
        flexWrap: "wrap",
        gap: 6,
      }}
    >
      <div className="flex flex-col justify-center py-1.5 flex-1 min-w-0">
        {breadcrumbs && <Breadcrumb items={breadcrumbs} />}
        {title && (
          <h1 className="text-[13.5px] font-semibold text-foreground truncate leading-tight mt-0.5">
            {title}
            {subtitle && (
              <span className="ml-2 text-[11.5px] font-normal text-muted-foreground">
                {subtitle}
              </span>
            )}
          </h1>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1.5 shrink-0 py-1">{actions}</div>
      )}
    </div>
  );
}

/* ── Keep PageHeader as alias for compatibility ─────────────── */
export function PageHeader({
  title,
  subtitle,
  actions,
  backHref,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  backHref?: string;
}) {
  const navigate = useNavigate();
  const crumbs = backHref
    ? [{ label: title.split(" ")[0], href: backHref }, { label: title }]
    : [{ label: title }];
  return (
    <PageToolbar
      breadcrumbs={crumbs}
      title={title}
      subtitle={subtitle}
      actions={actions}
    />
  );
}
