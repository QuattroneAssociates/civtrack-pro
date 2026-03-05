import { useQuery } from "@tanstack/react-query";
import type { Project, Permit, User } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Users,
  PieChart as PieChartIcon,
  Landmark,
  ArrowLeft,
  Wallet,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type ReportType = "overview" | "workload" | "pipeline" | "agencies" | "financial";

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(173, 58%, 39%)",
  "hsl(43, 74%, 49%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 52%, 47%)",
  "hsl(197, 37%, 45%)",
  "hsl(27, 87%, 50%)",
];

export default function Reports() {
  const { data: projects = [], isLoading: pLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  const { data: permits = [] } = useQuery<Permit[]>({
    queryKey: ["/api/permits"],
  });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const [activeReport, setActiveReport] = useState<ReportType>("overview");

  const workloadData = useMemo(() => {
    const pmMap = new Map<string, { active: number; construction: number; onHold: number }>();
    projects.forEach((p) => {
      const pm = users.find((u) => u.id === p.projectManagerId);
      if (!pm) return;
      if (!pmMap.has(pm.name)) pmMap.set(pm.name, { active: 0, construction: 0, onHold: 0 });
      const entry = pmMap.get(pm.name)!;
      if (p.status === "Active" || p.status === "Active Priority") entry.active++;
      else if (p.status === "Construction") entry.construction++;
      else if (p.status === "On Hold") entry.onHold++;
    });
    return Array.from(pmMap.entries())
      .map(([name, data]) => ({ name: name.split(" ")[0], ...data }))
      .filter((d) => d.active + d.construction + d.onHold > 0)
      .sort((a, b) => b.active - a.active);
  }, [projects, users]);

  const pipelineData = useMemo(() => {
    const statusMap = new Map<string, number>();
    projects.forEach((p) => {
      statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1);
    });
    return Array.from(statusMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [projects]);

  const agencyData = useMemo(() => {
    const agencyMap = new Map<string, number>();
    projects.forEach((p) => {
      agencyMap.set(p.agency, (agencyMap.get(p.agency) || 0) + 1);
    });
    return Array.from(agencyMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [projects]);

  const unpaidFees = useMemo(() => {
    return permits
      .filter((p) => p.applicationStatus === "Fees Posted - Unpaid")
      .map((p) => ({
        ...p,
        project: projects.find((pr) => pr.id === p.projectId),
      }));
  }, [permits, projects]);

  if (pLoading) {
    return (
      <div className="space-y-4" data-testid="reports-loading">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (activeReport !== "overview") {
    return (
      <div className="space-y-5" data-testid="report-detail-page">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveReport("overview")}
            data-testid="button-back-reports"
          >
            <ArrowLeft size={16} />
          </Button>
          <h2 className="text-lg font-black tracking-tight uppercase">
            {activeReport === "workload" && "Personnel Workload"}
            {activeReport === "pipeline" && "Portfolio Pipeline"}
            {activeReport === "agencies" && "Agency Distribution"}
            {activeReport === "financial" && "Fee Tracking"}
          </h2>
        </div>

        {activeReport === "workload" && (
          <Card className="border-card-border">
            <CardContent className="p-5">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "none", fontSize: "11px", fontWeight: "bold" }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: "16px", fontSize: "10px", fontWeight: 800, textTransform: "uppercase" }} />
                    <Bar dataKey="active" name="Active" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="construction" name="Construction" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="onHold" name="On Hold" fill="hsl(43, 74%, 49%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {activeReport === "pipeline" && (
          <Card className="border-card-border">
            <CardContent className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={70} outerRadius={130} paddingAngle={5} dataKey="value">
                        {pipelineData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none", fontSize: "11px", fontWeight: "bold" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {pipelineData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs font-bold">{d.name}</span>
                      </div>
                      <span className="text-sm font-black">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeReport === "agencies" && (
          <Card className="border-card-border">
            <CardContent className="p-5">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agencyData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} width={90} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "none", fontSize: "11px", fontWeight: "bold" }} />
                    <Bar dataKey="value" name="Projects" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {activeReport === "financial" && (
          <Card className="border-card-border">
            <CardContent className="p-5">
              {unpaidFees.length > 0 ? (
                <div className="divide-y">
                  {unpaidFees.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{item.project?.name}</p>
                        <p className="text-xs text-muted-foreground">{item.type} {item.number && `#${item.number}`}</p>
                      </div>
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400">{item.feeAmount || "Amount TBD"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-xs font-bold text-muted-foreground">No unpaid fees</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="reports-page">
      <div>
        <h2 className="text-xl font-black tracking-tight uppercase" data-testid="text-reports-title">
          Reports
        </h2>
        <p className="text-xs text-muted-foreground dark:text-foreground/50 mt-0.5">
          Portfolio analytics and insights
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReportCard title="Personnel Workload" subtitle="Active projects per PM" icon={<Users size={20} />} onClick={() => setActiveReport("workload")} />
        <ReportCard title="Portfolio Pipeline" subtitle="Project status distribution" icon={<PieChartIcon size={20} />} onClick={() => setActiveReport("pipeline")} />
        <ReportCard title="Agency Distribution" subtitle="Projects by jurisdiction" icon={<Landmark size={20} />} onClick={() => setActiveReport("agencies")} />
        <ReportCard title="Fee Tracking" subtitle="Permits with unpaid fees" icon={<Wallet size={20} />} onClick={() => setActiveReport("financial")} />
      </div>
    </div>
  );
}

function ReportCard({
  title,
  subtitle,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Card
      className="border-card-border cursor-pointer hover-elevate transition-all"
      onClick={onClick}
      data-testid={`report-card-${title.toLowerCase().replace(/\s/g, "-")}`}
    >
      <CardContent className="p-5 flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-md text-primary">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-black">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}
