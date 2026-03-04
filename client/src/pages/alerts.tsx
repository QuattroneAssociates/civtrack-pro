import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Project, Permit } from "@shared/schema";
import { formatDate, parseDateSafe } from "@/lib/dateUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  Clock,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { useMemo } from "react";

export default function Alerts() {
  const { data: projects = [], isLoading: pLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  const { data: permits = [], isLoading: perLoading } = useQuery<Permit[]>({
    queryKey: ["/api/permits"],
  });

  const isLoading = pLoading || perLoading;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alertsData = useMemo(() => {
    const data = permits
      .map((p) => ({
        permit: p,
        project: projects.find((pr) => pr.id === p.projectId),
      }))
      .filter((item) => item.project);

    const getDaysDiff = (dateStr: string) => {
      const d = parseDateSafe(dateStr);
      if (!d) return null;
      return Math.floor(
        (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
      );
    };

    const isWithinDays = (dateStr: string, days: number) => {
      const d = parseDateSafe(dateStr);
      if (!d) return false;
      const diff = Math.ceil(
        (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diff >= 0 && diff <= days;
    };

    const isPast = (dateStr: string) => {
      const d = parseDateSafe(dateStr);
      return d ? d.getTime() < today.getTime() : false;
    };

    return {
      target: data.filter(({ permit }) => {
        if (permit.submittalDate || permit.approvalDate) return false;
        if (!permit.targetDate) return false;
        return isPast(permit.targetDate) || isWithinDays(permit.targetDate, 7);
      }),
      expiration: data.filter(({ permit }) => {
        if (!permit.expirationDate) return false;
        return (
          isPast(permit.expirationDate) ||
          isWithinDays(permit.expirationDate, 90)
        );
      }),
      stagnant: data.filter(({ permit }) => {
        if (!permit.submittalDate || permit.approvalDate) return false;
        if (permit.comments1Date) return false;
        const diff = getDaysDiff(permit.submittalDate);
        return diff !== null && diff >= 30;
      }),
      unpaidFees: data.filter(({ permit }) => {
        return permit.applicationStatus === "Fees Posted - Unpaid";
      }),
    };
  }, [projects, permits]);

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="alerts-loading">
        <Skeleton className="h-8 w-48" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    );
  }

  const totalAlerts =
    alertsData.target.length +
    alertsData.expiration.length +
    alertsData.stagnant.length +
    alertsData.unpaidFees.length;

  return (
    <div className="space-y-6" data-testid="alerts-page">
      <div>
        <h2 className="text-xl font-black tracking-tight uppercase" data-testid="text-alerts-title">
          Alert Center
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalAlerts} items requiring attention
        </p>
      </div>

      {totalAlerts === 0 ? (
        <div className="py-20 text-center">
          <CheckCircle2
            size={48}
            className="mx-auto mb-4 text-emerald-400"
          />
          <h3 className="text-sm font-black uppercase tracking-tight">
            All Clear
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            No alerts at this time
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <AlertSection
            title="Target Deadlines"
            subtitle="Permits approaching or past target submittal dates"
            icon={<Target size={16} />}
            items={alertsData.target}
            color="amber"
            dateField="targetDate"
            dateLabel="Target"
          />
          <AlertSection
            title="Permit Expirations"
            subtitle="Permits expiring within 90 days"
            icon={<Clock size={16} />}
            items={alertsData.expiration}
            color="rose"
            dateField="expirationDate"
            dateLabel="Expires"
          />
          <AlertSection
            title="Stagnant Submittals"
            subtitle="Submitted 30+ days with no response"
            icon={<AlertTriangle size={16} />}
            items={alertsData.stagnant}
            color="orange"
            dateField="submittalDate"
            dateLabel="Submitted"
          />
          <AlertSection
            title="Unpaid Fees"
            subtitle="Permits with outstanding fee balances"
            icon={<Wallet size={16} />}
            items={alertsData.unpaidFees}
            color="red"
            dateField=""
            dateLabel=""
          />
        </div>
      )}
    </div>
  );
}

function AlertSection({
  title,
  subtitle,
  icon,
  items,
  color,
  dateField,
  dateLabel,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: Array<{ permit: Permit; project?: Project }>;
  color: string;
  dateField: string;
  dateLabel: string;
}) {
  if (items.length === 0) return null;

  const colorMap: Record<string, string> = {
    amber: "border-amber-200 dark:border-amber-800",
    rose: "border-rose-200 dark:border-rose-800",
    orange: "border-orange-200 dark:border-orange-800",
    red: "border-red-200 dark:border-red-800",
  };

  const iconColorMap: Record<string, string> = {
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
    orange: "text-orange-600 dark:text-orange-400",
    red: "text-red-600 dark:text-red-400",
  };

  return (
    <Card className={`${colorMap[color] || ""}`}>
      <div className="px-5 py-3 border-b flex items-center gap-2">
        <span className={iconColorMap[color]}>{icon}</span>
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest">
            {title}
            <span className="ml-2 text-muted-foreground">({items.length})</span>
          </h3>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <CardContent className="p-0">
        <div className="divide-y">
          {items.map(({ permit, project }) => {
            const dateValue =
              dateField && (permit as any)[dateField]
                ? formatDate((permit as any)[dateField])
                : "";
            return (
              <Link
                key={permit.id}
                href={project ? `/projects/${project.id}` : "#"}
              >
                <div
                  className="px-5 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  data-testid={`alert-item-${permit.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">
                      {project?.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{permit.type}</span>
                      {permit.number && (
                        <span className="font-mono">#{permit.number}</span>
                      )}
                      {dateLabel && dateValue && (
                        <span>
                          &middot; {dateLabel}: {dateValue}
                        </span>
                      )}
                      {permit.feeAmount && (
                        <span>&middot; {permit.feeAmount}</span>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight
                    size={12}
                    className="text-muted-foreground flex-shrink-0"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
