import { useState, useMemo } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Task, Permit } from "@shared/schema";
import { parseDateSafe } from "@/lib/dateUtils";
import { useAuth } from "@/lib/auth";

const allNavItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, roles: null },
  { path: "/projects", label: "Projects", icon: FolderKanban, roles: null },
  { path: "/calendar", label: "Calendar", icon: CalendarDays, roles: null },
  { path: "/tasks", label: "Tasks", icon: CheckSquare, roles: null },
  { path: "/alerts", label: "Alerts", icon: Bell, roles: null },
  { path: "/reports", label: "Reports", icon: BarChart3, roles: ["admin"] as string[] },
  { path: "/users", label: "Personnel", icon: Users, roles: ["admin"] as string[] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout, hasRole } = useAuth();

  const navItems = useMemo(
    () => allNavItems.filter((item) => !item.roles || hasRole(...item.roles)),
    [hasRole]
  );

  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: permits = [] } = useQuery<Permit[]>({ queryKey: ["/api/permits"] });

  const activeTasks = tasks.filter((t) => t.status !== "Completed").length;

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
    if (path === "/tasks") return activeTasks || undefined;
    if (path === "/alerts") return alertCount || undefined;
    return undefined;
  };

  const firstName = user?.name?.split(" ")[0] || "User";

  return (
    <div className="flex h-screen w-full bg-background" data-testid="app-layout">
      <aside
        className={`${
          sidebarOpen ? "w-56" : "w-[60px]"
        } flex-shrink-0 bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 ease-in-out`}
        data-testid="sidebar"
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <HardHat size={18} className="text-white/80" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <h1 className="text-[13px] font-black tracking-tight leading-none truncate text-white">
                CIVTRACK
              </h1>
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.15em] mt-0.5">
                PRO
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location === "/"
                : location.startsWith(item.path);
            const badge = getBadge(item.path);
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all ${
                    isActive
                      ? "bg-white/10 text-white font-bold"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon size={16} className="flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="text-[11px] font-bold uppercase tracking-wider flex-1 truncate">
                        {item.label}
                      </span>
                      {badge !== undefined && badge > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                            isActive
                              ? "bg-white/15 text-white/90"
                              : "bg-rose-500/80 text-white"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-3 border-t border-white/5">
          {sidebarOpen ? (
            <div className="px-3 py-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-[9px] font-black flex-shrink-0">
                  {firstName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-white/80 truncate" data-testid="text-user-name">
                    {user?.name}
                  </p>
                  <p className="text-[8px] text-white/30 truncate uppercase tracking-wider" data-testid="text-user-role">
                    {user?.authRole?.replace("_", " ")}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="p-1 rounded text-white/20 hover:text-rose-300 hover:bg-white/5 transition-colors"
                  title="Sign out"
                  data-testid="button-logout"
                >
                  <LogOut size={12} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={logout}
                className="p-2 rounded text-white/20 hover:text-rose-300 hover:bg-white/5 transition-colors"
                title="Sign out"
                data-testid="button-logout-collapsed"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header
          className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b px-4 py-2.5 flex items-center justify-between gap-4"
          data-testid="header"
        >
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-sidebar-toggle"
            >
              {sidebarOpen ? (
                <PanelLeftClose size={16} />
              ) : (
                <PanelLeftOpen size={16} />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
