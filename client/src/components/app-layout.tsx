import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bell,
  CalendarDays,
  BarChart3,
  Users,
  HardHat,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Moon,
  Sun,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Task, Permit } from "@shared/schema";
import { parseDateSafe } from "@/lib/dateUtils";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

const allNavItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, roles: null, bottomTab: true },
  { path: "/projects", label: "Projects", icon: FolderKanban, roles: null, bottomTab: true },
  { path: "/tasks", label: "Tasks", icon: CheckSquare, roles: null, bottomTab: true },
  { path: "/calendar", label: "Calendar", icon: CalendarDays, roles: null, bottomTab: true },
  { path: "/alerts", label: "Alerts", icon: Bell, roles: null, bottomTab: true },
  { path: "/reports", label: "Reports", icon: BarChart3, roles: ["admin"] as string[], bottomTab: false },
  { path: "/users", label: "Personnel", icon: Users, roles: ["admin"] as string[], bottomTab: false },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout, hasRole } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = useMemo(
    () => allNavItems.filter((item) => !item.roles || hasRole(...item.roles)),
    [hasRole]
  );

  const bottomTabItems = useMemo(() => navItems.filter((item) => item.bottomTab), [navItems]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMobileMenuOpen(false);
      };
      document.addEventListener("keydown", handleEsc);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleEsc);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userMenuOpen]);

  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: permits = [] } = useQuery<Permit[]>({ queryKey: ["/api/permits"] });

  const myActiveTasks = tasks.filter(
    (t) => t.status !== "Completed" && user?.name && t.assignedTo.toLowerCase() === user.name.toLowerCase()
  ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alertCount = permits.filter((p) => {
    if (p.expirationDate) {
      const d = parseDateSafe(p.expirationDate);
      if (d) {
        const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 90 && diff >= 0) return true;
      }
    }
    if (p.applicationStatus === "Fees Posted - Unpaid") return true;
    return false;
  }).length;

  const getBadge = (path: string) => {
    if (path === "/tasks") return myActiveTasks || undefined;
    if (path === "/alerts") return alertCount || undefined;
    return undefined;
  };

  const isActive = (path: string) =>
    path === "/" ? location === "/" : location.startsWith(path);

  const firstName = user?.name?.split(" ")[0] || "User";

  return (
    <div className="flex flex-col h-screen w-full bg-background" data-testid="app-layout">
      <header
        className="hidden md:flex sticky top-0 z-40 bg-sidebar text-sidebar-foreground items-center px-5 h-12 flex-shrink-0"
        data-testid="top-nav"
      >
        <div className="flex items-center gap-2.5 mr-6">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <HardHat size={15} className="text-white/80" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[12px] font-black tracking-tight leading-none text-white">
              CIVTRACK <span className="text-white/30 font-bold text-[9px] tracking-[0.15em]">PRO</span>
            </h1>
          </div>
        </div>

        <nav className="flex items-center gap-0.5 flex-1" data-testid="desktop-nav">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const badge = getBadge(item.path);
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer transition-all relative ${
                    active
                      ? "bg-white/10 text-white font-bold"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon size={14} className="flex-shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {item.label}
                  </span>
                  {badge !== undefined && badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-black leading-none ${
                        active
                          ? "bg-white/15 text-white/90"
                          : "bg-rose-500/80 text-white"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                  {active && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-amber-400 rounded-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-2 py-1 rounded-md text-white/60 hover:text-white/90 hover:bg-white/5 transition-colors"
            data-testid="button-user-menu"
          >
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-[9px] font-black flex-shrink-0">
              {firstName[0]}
            </div>
            <span className="text-[10px] font-bold" data-testid="text-user-name">{firstName}</span>
            <ChevronDown size={10} />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-card border rounded-lg shadow-lg py-1 z-50" data-testid="user-dropdown">
              <div className="px-3 py-2 border-b">
                <p className="text-[11px] font-bold truncate">{user?.name}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  {user?.authRole?.replace("_", " ")}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="w-full text-left px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                data-testid="button-toggle-theme"
              >
                {theme === "light" ? <Moon size={12} /> : <Sun size={12} />}
                {theme === "light" ? "Dark Mode" : "Light Mode"}
              </button>
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-destructive hover:bg-muted transition-colors flex items-center gap-2"
                data-testid="button-logout"
              >
                <LogOut size={12} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <header
        className="sticky top-0 z-40 bg-sidebar text-sidebar-foreground px-3 py-2 flex items-center gap-3 md:hidden flex-shrink-0"
        data-testid="header"
      >
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-1.5 rounded-md text-white/50 hover:text-white transition-colors"
          data-testid="button-mobile-menu"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2">
          <HardHat size={15} className="text-white/80" />
          <span className="text-[11px] font-black tracking-tight text-white">CIVTRACK <span className="text-white/30 font-bold text-[9px] tracking-[0.15em]">PRO</span></span>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          data-testid="mobile-menu-overlay"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar text-sidebar-foreground flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <HardHat size={18} className="text-white/80" />
                </div>
                <div>
                  <h1 className="text-[13px] font-black tracking-tight leading-none text-white">
                    CIVTRACK
                  </h1>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.15em] mt-0.5">
                    PRO
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                data-testid="button-close-mobile-menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => {
                const active = isActive(item.path);
                const badge = getBadge(item.path);
                return (
                  <Link key={item.path} href={item.path}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all ${
                        active
                          ? "bg-white/10 text-white font-bold"
                          : "text-white/50 hover:text-white/80 hover:bg-white/5"
                      }`}
                      data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                    >
                      <item.icon size={16} className="flex-shrink-0" />
                      <span className="text-[11px] font-bold uppercase tracking-wider flex-1 truncate">
                        {item.label}
                      </span>
                      {badge !== undefined && badge > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                            active
                              ? "bg-white/15 text-white/90"
                              : "bg-rose-500/80 text-white"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 py-4 border-t border-white/5">
              <div className="flex items-center gap-3 px-2">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-[10px] font-black flex-shrink-0">
                  {firstName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-white/80 truncate" data-testid="mobile-text-user-name">
                    {user?.name}
                  </p>
                  <p className="text-[9px] text-white/30 truncate uppercase tracking-wider" data-testid="mobile-text-user-role">
                    {user?.authRole?.replace("_", " ")}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="mt-3 w-full flex items-center gap-2 px-4 py-2 rounded-md text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors text-[11px] font-bold uppercase tracking-wider"
                data-testid="mobile-button-toggle-theme"
              >
                {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
                {theme === "light" ? "Dark Mode" : "Light Mode"}
              </button>
              <button
                onClick={logout}
                className="mt-1 w-full flex items-center gap-2 px-4 py-2 rounded-md text-white/40 hover:text-rose-300 hover:bg-white/5 transition-colors text-[11px] font-bold uppercase tracking-wider"
                data-testid="mobile-button-logout"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-safe-bottom md:pb-0">
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto">{children}</div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-sidebar border-t border-white/10 safe-area-bottom"
        data-testid="bottom-tab-bar"
      >
        <div className="flex items-stretch">
          {bottomTabItems.map((item) => {
            const active = isActive(item.path);
            const badge = getBadge(item.path);
            return (
              <Link key={item.path} href={item.path} className="flex-1">
                <div
                  className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative ${
                    active
                      ? "text-white"
                      : "text-white/40"
                  }`}
                  data-testid={`tab-${item.label.toLowerCase()}`}
                >
                  {active && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber-400 rounded-full" />
                  )}
                  <div className="relative">
                    <item.icon size={18} />
                    {badge !== undefined && badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[8px] font-black bg-rose-500 text-white">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
