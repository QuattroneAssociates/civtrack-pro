import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Project, Permit, Task } from "@shared/schema";
import { parseDateSafe } from "@/lib/dateUtils";
import {
  LayoutGrid,
  Target,
  AlertTriangle,
  Clock,
  FileText,
  ChevronRight,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X } from "lucide-react";

const DISMISSED_KEY = "civtrack-dismissed-radar";

function getDismissedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

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

  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedIds);
  const [dismissTarget, setDismissTarget] = useState<{ id: string; projectName: string } | null>(null);

  const handleDismiss = useCallback((id: string, projectName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissTarget({ id, projectName });
  }, []);

  const confirmDismiss = useCallback(() => {
    if (!dismissTarget) return;
    setDismissedIds((prev) => {
      if (prev.includes(dismissTarget.id)) return prev;
      const updated = [...prev, dismissTarget.id];
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
      return updated;
    });
    setDismissTarget(null);
  }, [dismissTarget]);

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

  const recentlySubmitted = useMemo(() => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    return permits
      .map((p) => {
        if (!p.submittalDate) return null;
        const d = parseDateSafe(p.submittalDate);
        if (!d || d < fourteenDaysAgo) return null;
        const project = projects.find((pr) => pr.id === p.projectId);
        return {
          ...p,
          submitDate: d,
          projectName: project?.name || "Unknown",
          projectNumber: project?.number || "",
          projectId: project?.id || "",
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.submitDate.getTime() - a!.submitDate.getTime())
      .slice(0, 8) as Array<{
      id: string;
      type: string;
      number: string;
      submitDate: Date;
      projectName: string;
      projectNumber: string;
      projectId: string;
    }>;
  }, [permits, projects]);

  const deadlineRadar = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return permits
      .map((p) => {
        const project = projects.find((pr) => pr.id === p.projectId);
        if (!project) return null;
        let dateToTrack: Date | null = null;
        let typeLabel = "";

        if (p.targetDate && !p.submittalDate && !p.approvalDate) {
          dateToTrack = parseDateSafe(p.targetDate);
          typeLabel = "Target";
        } else if (p.expirationDate) {
          dateToTrack = parseDateSafe(p.expirationDate);
          typeLabel = "Expiration";
        }
        if (!dateToTrack) return null;
        const diff = Math.ceil(
          (dateToTrack.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff > 45) return null;
        return {
          ...p,
          diff,
          dateToTrack,
          projectName: project.name,
          projectId: project.id,
          typeLabel,
        };
      })
      .filter(Boolean)
      .filter((item) => !dismissedIds.includes(item!.id))
      .sort((a, b) => a!.diff - b!.diff) as Array<{
      id: string;
      type: string;
      diff: number;
      dateToTrack: Date;
      projectName: string;
      projectId: string;
      typeLabel: string;
    }>;
  }, [permits, projects, dismissedIds]);

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="dashboard-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const statItems = [
    { to: "/projects", label: "Projects", value: stats.total, color: "bg-[#2d3a4e]", icon: LayoutGrid },
    { to: "/projects", label: "Active", value: stats.activeCount, color: "bg-[#c4917a]", icon: Target },
    { to: "/alerts", label: "Unpaid Fees", value: stats.unpaidFees, color: "bg-[#8fa5b8]", icon: FileText },
    { to: "/tasks", label: "Critical Tasks", value: stats.criticalTasks, color: "bg-[#c4917a]", icon: AlertTriangle },
    { to: "/alerts", label: "Radar Alerts", value: stats.radarAlerts, color: "bg-[#8fa5b8]", icon: Clock },
  ];

  return (
    <div className="space-y-4" data-testid="dashboard-page">
      <h2 className="text-xl font-black tracking-tight uppercase" data-testid="text-dashboard-title">
        Dashboard
      </h2>

      <div className="flex flex-wrap gap-2" data-testid="stats-strip">
        {statItems.map((s) => (
          <Link key={s.label} href={s.to}>
            <div
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border bg-card text-card-foreground hover:shadow-sm transition-all cursor-pointer"
              data-testid={`metric-${s.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <div className={`w-7 h-7 rounded-full ${s.color} bg-opacity-15 flex items-center justify-center`}>
                <s.icon size={13} className="text-card-foreground/60" />
              </div>
              <div>
                <p className="text-lg font-black leading-none tracking-tight text-card-foreground">{s.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-card-foreground/50 mt-0.5">{s.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-card-border rounded-xl">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                <Clock size={12} className="text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest">
                  Recently Submitted
                </h3>
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider">
                  Last 14 days
                </p>
              </div>
            </div>
            <Link href="/alerts">
              <Button variant="outline" size="sm" className="text-[9px] font-bold uppercase tracking-wider rounded-full h-7 px-3" data-testid="link-view-all-submitted">
                View All
              </Button>
            </Link>
          </div>
          <CardContent className="p-0">
            {recentlySubmitted.length > 0 ? (
              <div className="divide-y">
                {recentlySubmitted.map((item) => (
                  <Link key={item.id} href={`/projects/${item.projectId}`}>
                    <div
                      className="px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      data-testid={`row-submitted-${item.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold truncate">
                          {item.projectName}
                        </p>
                        <p className="text-[9px] text-muted-foreground truncate">
                          {item.type}
                        </p>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-medium whitespace-nowrap">
                        {item.submitDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-xs text-muted-foreground">
                  No permits submitted in the last 14 days
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-card-border rounded-xl" data-testid="deadline-radar">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                <CalendarClock size={12} className="text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest">
                  Deadline Radar
                </h3>
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider">
                  Upcoming deadlines &amp; expirations
                </p>
              </div>
            </div>
            <Link href="/alerts">
              <Button variant="outline" size="sm" className="text-[9px] font-bold uppercase tracking-wider rounded-full h-7 px-3" data-testid="link-view-all-deadlines">
                View All
              </Button>
            </Link>
          </div>
          <CardContent className="p-0">
            {deadlineRadar.length > 0 ? (
              <div className="divide-y">
                {deadlineRadar.slice(0, 8).map((item) => {
                  const urgencyClass =
                    item.diff < 0
                      ? "text-[#8b4a3a] bg-[#f3e0d8] border-[#e8cfc5]"
                      : item.diff <= 7
                      ? "text-[#7a5835] bg-[#f0e9dd] border-[#e4d9c8]"
                      : "text-[#4a5a6a] bg-[#e3e8ed] border-[#d0d8e2]";
                  const diffLabel =
                    item.diff < 0
                      ? `${Math.abs(item.diff)}d overdue`
                      : item.diff === 0
                      ? "Today"
                      : item.diff === 1
                      ? "Tomorrow"
                      : `${item.diff}d`;
                  return (
                    <Link key={item.id} href={`/projects/${item.projectId}`}>
                      <div
                        className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors group"
                        data-testid={`row-deadline-${item.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold truncate">
                            {item.projectName}
                          </p>
                          <p className="text-[9px] text-muted-foreground truncate">
                            {item.typeLabel} · {item.type}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${urgencyClass}`}>
                            {diffLabel}
                          </span>
                          <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                            {item.dateToTrack.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                          <button
                            onClick={(e) => handleDismiss(item.id, item.projectName, e)}
                            className="p-0.5 rounded text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Dismiss"
                            data-testid={`button-dismiss-${item.id}`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-xs text-muted-foreground">
                  No upcoming deadlines
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!dismissTarget} onOpenChange={(open) => !open && setDismissTarget(null)}>
        <AlertDialogContent data-testid="dismiss-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss from Deadline Radar?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to dismiss <span className="font-semibold text-foreground">{dismissTarget?.projectName}</span> from the Deadline Radar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="dismiss-cancel-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDismiss} data-testid="dismiss-confirm-btn">
              Dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
