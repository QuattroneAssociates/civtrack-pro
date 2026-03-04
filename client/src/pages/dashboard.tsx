import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Project, Permit, Task } from "@shared/schema";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, parseDateSafe } from "@/lib/dateUtils";
import {
  LayoutGrid,
  Target,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

export default function Dashboard() {
  const { data: projects = [], isLoading: pLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  const { data: permits = [], isLoading: perLoading } = useQuery<Permit[]>({
    queryKey: ["/api/permits"],
  });
  const { data: tasks = [], isLoading: tLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const isLoading = pLoading || perLoading || tLoading;

  const stats = useMemo(() => {
    const activeCount = projects.filter(
      (p) => p.status === "Active" || p.status === "Active Priority" || p.status === "Construction"
    ).length;
    const unpaidFees = permits.filter(
      (p) => p.applicationStatus === "Fees Posted - Unpaid"
    ).length;
    const criticalTasks = tasks.filter(
      (t) => t.isImportant && t.status !== "Completed"
    ).length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const radarAlerts = permits.filter((p) => {
      if (p.expirationDate) {
        const d = parseDateSafe(p.expirationDate);
        if (d) {
          const diff = Math.ceil(
            (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diff >= 0 && diff <= 45) return true;
        }
      }
      if (p.targetDate && !p.submittalDate && !p.approvalDate) {
        const d = parseDateSafe(p.targetDate);
        if (d) {
          const diff = Math.ceil(
            (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diff <= 7) return true;
        }
      }
      return false;
    }).length;
    return { total: projects.length, activeCount, unpaidFees, criticalTasks, radarAlerts };
  }, [projects, permits, tasks]);

  const deadlineRadar = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return permits
      .map((p) => {
        const project = projects.find((pr) => pr.id === p.projectId);
        if (!project) return null;
        let dateToTrack: Date | null = null;
        let typeLabel = "";
        let isExpiration = false;

        if (p.targetDate && !p.submittalDate && !p.approvalDate) {
          dateToTrack = parseDateSafe(p.targetDate);
          typeLabel = "Target Deadline";
        } else if (p.expirationDate) {
          dateToTrack = parseDateSafe(p.expirationDate);
          typeLabel = "Permit Expiration";
          isExpiration = true;
        }
        if (!dateToTrack) return null;
        const diff = Math.ceil(
          (dateToTrack.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff > 45) return null;
        return {
          ...p,
          diff,
          projectName: project.name,
          projectId: project.id,
          typeLabel,
          isExpiration,
          displayDate: dateToTrack.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.diff - b!.diff)
      .slice(0, 7) as Array<{
      id: string;
      type: string;
      diff: number;
      projectName: string;
      projectId: string;
      typeLabel: string;
      isExpiration: boolean;
      displayDate: string;
    }>;
  }, [permits, projects]);

  const recentProjects = useMemo(() => {
    return projects
      .filter((p) => p.status === "Active" || p.status === "Active Priority")
      .slice(0, 5);
  }, [projects]);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-lg lg:col-span-2" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight uppercase" data-testid="text-dashboard-title">
            Dashboard
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational overview for Quattrone & Associates
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard
          to="/projects"
          label="Total Projects"
          value={stats.total}
          sub="All Records"
          icon={<LayoutGrid size={18} />}
          variant="default"
        />
        <MetricCard
          to="/projects"
          label="Active Pipeline"
          value={stats.activeCount}
          sub="Active + Construction"
          icon={<Target size={18} />}
          variant="primary"
        />
        <MetricCard
          to="/alerts"
          label="Unpaid Fees"
          value={stats.unpaidFees}
          sub="Fees Posted"
          icon={<Wallet size={18} />}
          variant={stats.unpaidFees > 0 ? "warning" : "default"}
        />
        <MetricCard
          to="/tasks"
          label="Critical Tasks"
          value={stats.criticalTasks}
          sub="High Priority"
          icon={<AlertTriangle size={18} />}
          variant={stats.criticalTasks > 0 ? "danger" : "default"}
        />
        <MetricCard
          to="/alerts"
          label="Radar Alerts"
          value={stats.radarAlerts}
          sub="Next 45 Days"
          icon={<Target size={18} />}
          variant={stats.radarAlerts > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 border-card-border">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest">
              Active Projects
            </h3>
            <Link href="/projects">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider cursor-pointer flex items-center gap-1" data-testid="link-view-all-projects">
                View All <ChevronRight size={12} />
              </span>
            </Link>
          </div>
          <CardContent className="p-0">
            {recentProjects.length > 0 ? (
              <div className="divide-y">
                {recentProjects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div
                      className="px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      data-testid={`row-project-${project.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground">
                            {project.number}
                          </span>
                          <StatusBadge status={project.status} />
                        </div>
                        <p className="text-sm font-bold mt-0.5 truncate">
                          {project.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.clientName} &middot; {project.agency}
                        </p>
                      </div>
                      <ArrowUpRight
                        size={14}
                        className="text-muted-foreground flex-shrink-0"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  No active projects yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <div className="px-5 py-4 border-b">
            <h3 className="text-xs font-black uppercase tracking-widest">
              Deadline Radar
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Upcoming deadlines &amp; expirations
            </p>
          </div>
          <CardContent className="p-0">
            {deadlineRadar.length > 0 ? (
              <div className="divide-y">
                {deadlineRadar.map((item) => (
                  <Link key={item.id} href={`/projects/${item.projectId}`}>
                    <div
                      className="px-5 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      data-testid={`radar-item-${item.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold truncate flex-1">
                          {item.projectName}
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            item.diff < 0
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                              : item.diff <= 7
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {item.diff < 0
                            ? `${Math.abs(item.diff)}d overdue`
                            : item.diff === 0
                            ? "Today"
                            : `${item.diff}d`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                          {item.typeLabel}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          &middot; {item.type}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <CheckCircle2
                  size={32}
                  className="mx-auto mb-2 text-emerald-400"
                />
                <p className="text-xs font-bold text-muted-foreground">
                  All clear - no upcoming deadlines
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  to,
  label,
  value,
  sub,
  icon,
  variant = "default",
}: {
  to: string;
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  variant?: "default" | "primary" | "warning" | "danger";
}) {
  const colors = {
    default: "bg-card border-card-border",
    primary: "bg-primary/5 border-primary/20",
    warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    danger: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800",
  };
  const iconColors = {
    default: "text-muted-foreground",
    primary: "text-primary",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-rose-600 dark:text-rose-400",
  };

  return (
    <Link href={to}>
      <Card
        className={`${colors[variant]} cursor-pointer hover-elevate transition-all`}
        data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={iconColors[variant]}>{icon}</span>
            <ArrowUpRight size={12} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-black tracking-tight">{value}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5">
            {label}
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
