import { useState } from "react";
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
  Search,
  X,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Task, Permit, Project } from "@shared/schema";
import { parseDateSafe } from "@/lib/dateUtils";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/projects", label: "Projects", icon: FolderKanban },
  { path: "/tasks", label: "Tasks", icon: CheckSquare },
  { path: "/alerts", label: "Alerts", icon: Bell },
  { path: "/calendar", label: "Calendar", icon: CalendarDays },
  { path: "/reports", label: "Reports", icon: BarChart3 },
  { path: "/users", label: "Team", icon: Users },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim() && location !== "/projects") {
      navigate("/projects");
    }
  };

  const getBadge = (path: string) => {
    if (path === "/tasks") return activeTasks || undefined;
    if (path === "/alerts") return alertCount || undefined;
    return undefined;
  };

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
          {sidebarOpen && (
            <div className="px-3 py-2">
              <p className="text-[8px] font-bold text-blue-300/40 uppercase tracking-[0.2em]">
                Quattrone & Associates
              </p>
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

            {location !== "/" && (
              <div className="relative flex-1 max-w-md">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Search projects, permits, addresses..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full pl-9 pr-8 py-2 bg-muted/50 border border-transparent rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                  data-testid="input-search"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
                    data-testid="button-clear-search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
