import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Project, Permit, Task } from "@shared/schema";
import { parseDateSafe } from "@/lib/dateUtils";
import {
  LayoutGrid,
  Target,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Clock,
  FileText,
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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
      .slice(0, 5) as Array<{
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
          typeLabel = "Target Deadline";
        } else if (p.expirationDate) {
          dateToTrack = parseDateSafe(p.expirationDate);
          typeLabel = "Permit Expiration";
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
      <div className="space-y-6" data-testid="dashboard-loading">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <h2 className="text-xl font-black tracking-tight uppercase" data-testid="text-dashboard-title">
        Dashboard
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard
          to="/projects"
          label="Total Projects"
          sub="All Records"
          value={stats.total}
          icon={<LayoutGrid size={20} />}
          accentColor="bg-[#2d3a4e]"
        />
        <MetricCard
          to="/projects"
          label="Active Pipeline"
          sub="Ongoing Ops"
          value={stats.activeCount}
          icon={<Target size={20} />}
          accentColor="bg-[#c4917a]"
        />
        <MetricCard
          to="/alerts"
          label="Unpaid Fees"
          sub="Pending Payment"
          value={stats.unpaidFees}
          icon={<FileText size={20} />}
          accentColor="bg-[#8fa5b8]"
        />
        <MetricCard
          to="/tasks"
          label="Critical Tasks"
          sub="High Priority"
          value={stats.criticalTasks}
          icon={<AlertTriangle size={20} />}
          accentColor="bg-[#c4917a]"
        />
        <MetricCard
          to="/alerts"
          label="Radar Alerts"
          sub="Overdue Actions"
          value={stats.radarAlerts}
          icon={<Clock size={20} />}
          accentColor="bg-[#8fa5b8]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-card-border rounded-xl">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Clock size={14} className="text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest">
                  Recently Submitted
                </h3>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  Permits submitted in the last 14 days
                </p>
              </div>
            </div>
            <Link href="/alerts">
              <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase tracking-wider rounded-full" data-testid="link-view-all-submitted">
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
                      className="px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      data-testid={`row-submitted-${item.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">
                          {item.type} {item.number ? `#${item.number}` : ""} &mdash; {item.projectName}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                        {item.submitDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-xs text-muted-foreground">
                  No permits submitted in the last 14 days
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <DeadlineRadarCalendar deadlineItems={deadlineRadar} />
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

function MetricCard({
  to,
  label,
  value,
  sub,
  icon,
  accentColor,
}: {
  to: string;
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  accentColor: string;
}) {
  return (
    <Link href={to}>
      <Card
        className="cursor-pointer hover-elevate transition-all border-card-border rounded-xl"
        data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center text-foreground/60">
              {icon}
            </div>
          </div>
          <p className="text-3xl font-black tracking-tight leading-none">{value}</p>
          <div className="mt-2">
            <div className={`h-1 w-12 rounded-full ${accentColor} opacity-60`} />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] mt-2">
            {label}
          </p>
          <p className="text-[9px] text-muted-foreground">{sub}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

interface DeadlineItem {
  id: string;
  type: string;
  diff: number;
  dateToTrack: Date;
  projectName: string;
  projectId: string;
  typeLabel: string;
}

function DeadlineRadarCalendar({ deadlineItems }: { deadlineItems: DeadlineItem[] }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const prevMonthLast = new Date(viewYear, viewMonth, 0).getDate();
    const days: Array<{ day: number; inMonth: boolean; date: Date }> = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      days.push({ day: d, inMonth: false, date: new Date(viewYear, viewMonth - 1, d) });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, inMonth: true, date: new Date(viewYear, viewMonth, i) });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, inMonth: false, date: new Date(viewYear, viewMonth + 1, i) });
    }
    return days;
  }, [viewMonth, viewYear]);

  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, DeadlineItem[]>();
    deadlineItems.forEach((item) => {
      const key = `${item.dateToTrack.getFullYear()}-${item.dateToTrack.getMonth()}-${item.dateToTrack.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  }, [deadlineItems]);

  const getDeadlinesForDay = (date: Date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return deadlinesByDate.get(key) || [];
  };

  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <Card className="border-card-border rounded-xl" data-testid="deadline-radar-calendar">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Target size={14} className="text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest">
              Deadline Radar
            </h3>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
              Active action items
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-muted transition-colors" data-testid="button-prev-month">
            <ChevronLeft size={14} className="text-muted-foreground" />
          </button>
          <span className="text-[11px] font-bold min-w-[100px] text-center">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-muted transition-colors" data-testid="button-next-month">
            <ChevronRight size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-[9px] font-bold text-muted-foreground uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((cell, i) => {
            const deadlines = getDeadlinesForDay(cell.date);
            const todayCell = isToday(cell.date);
            return (
              <div
                key={i}
                className={`relative py-1 text-center min-h-[40px] flex flex-col items-center ${
                  !cell.inMonth ? "opacity-30" : ""
                }`}
              >
                <span
                  className={`text-[11px] w-6 h-6 flex items-center justify-center rounded-full font-semibold ${
                    todayCell
                      ? "bg-[#2d3a4e] text-white font-black"
                      : ""
                  }`}
                >
                  {cell.day}
                </span>
                {deadlines.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-0.5 w-full px-0.5">
                    {deadlines.slice(0, 2).map((dl) => (
                      <Link key={dl.id} href={`/projects/${dl.projectId}`}>
                        <div
                          className={`text-[6px] font-bold px-1 py-0.5 rounded truncate cursor-pointer leading-tight ${
                            dl.diff < 0
                              ? "bg-red-200/60 text-red-800"
                              : dl.diff <= 7
                              ? "bg-[#c4917a]/25 text-[#8b5e3c]"
                              : "bg-[#8fa5b8]/20 text-[#4a6a82]"
                          }`}
                          title={`${dl.typeLabel}: ${dl.projectName}`}
                          data-testid={`link-deadline-${dl.id}`}
                        >
                          {dl.typeLabel === "Permit Expiration" ? "Expir" : "Target"}
                        </div>
                      </Link>
                    ))}
                    {deadlines.length > 2 && (
                      <span className="text-[6px] text-muted-foreground text-center">
                        +{deadlines.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
