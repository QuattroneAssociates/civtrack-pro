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
  { path: "/tasks", label: "Tasks", icon: CheckSquare, roles: null },
  { path: "/alerts", label: "Alerts", icon: Bell, roles: null },
  { path: "/calendar", label: "Calendar", icon: CalendarDays, roles: null },
  { path: "/reports", label: "Reports", icon: BarChart3, roles: ["admin"] as string[] },
  { path: "/users", label: "Team", icon: Users, roles: ["admin"] as string[] },
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
          sidebarOpen ? "w-64" : "w-[72px]"
        } flex-shrink-0 bg-[#0c0054] text-white flex flex-col transition-all duration-300 ease-in-out`}
        data-testid="sidebar"
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-md bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <HardHat size={20} className="text-amber-400" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <h1 className="text-sm font-black tracking-tight leading-none truncate">
                CivTrack Pro
              </h1>
              <p className="text-[9px] font-bold text-blue-300/60 uppercase tracking-[0.2em] mt-0.5">
                Project Management
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location === "/"
                : location.startsWith(item.path);
            const badge = getBadge(item.path);
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                    isActive
                      ? "bg-amber-600/30 text-amber-200 font-bold"
                      : "text-blue-200/70 hover:text-white hover:bg-white/5"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="text-xs font-bold uppercase tracking-wide flex-1 truncate">
                        {item.label}
                      </span>
                      {badge !== undefined && badge > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                            isActive
                              ? "bg-white/20 text-amber-100"
                              : "bg-rose-600 text-white"
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

        <div className="px-3 py-4 border-t border-white/10">
          {sidebarOpen ? (
            <div className="px-3 py-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 text-[10px] font-black flex-shrink-0">
                  {firstName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-white/90 truncate" data-testid="text-user-name">
                    {user?.name}
                  </p>
                  <p className="text-[9px] text-blue-300/50 truncate capitalize" data-testid="text-user-role">
                    {user?.authRole?.replace("_", " ")}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-md text-blue-300/40 hover:text-rose-300 hover:bg-white/5 transition-colors"
                  title="Sign out"
                  data-testid="button-logout"
                >
                  <LogOut size={14} />
                </button>
              </div>
              <p className="text-[8px] font-bold text-blue-300/40 uppercase tracking-[0.2em]">
                Quattrone & Associates
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={logout}
                className="p-2 rounded-md text-blue-300/40 hover:text-rose-300 hover:bg-white/5 transition-colors"
                title="Sign out"
                data-testid="button-logout-collapsed"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header
          className="sticky top-0 z-40 bg-background border-b px-4 py-3 flex items-center justify-between gap-4"
          data-testid="header"
        >
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-sidebar-toggle"
            >
              {sidebarOpen ? (
                <PanelLeftClose size={18} />
              ) : (
                <PanelLeftOpen size={18} />
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
