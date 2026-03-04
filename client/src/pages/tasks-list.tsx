import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Task, Project, User } from "@shared/schema";
import { formatDate, parseDateSafe } from "@/lib/dateUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  AlertTriangle,
  Calendar,
  SearchX,
  Archive,
  Briefcase,
  ListTodo,
  LayoutGrid,
  ChevronDown,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";

type ViewMode = "board" | "active" | "archived";

export default function TasksList() {
  const { data: tasks = [], isLoading: tLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { user, hasRole } = useAuth();

  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [viewMode, setViewMode] = useState<ViewMode>("board");

  const canEditTasks = hasRole("admin", "project_manager");

  const counts = useMemo(() => {
    let base = [...tasks];
    if (assigneeFilter !== "All") {
      base = base.filter(
        (t) => t.assignedTo.toLowerCase() === assigneeFilter.toLowerCase()
      );
    }
    return {
      active: base.filter((t) => t.status !== "Completed" && t.status !== "Complete").length,
      archived: base.filter((t) => t.status === "Completed" || t.status === "Complete").length,
    };
  }, [tasks, assigneeFilter]);

  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];
    if (viewMode === "active") {
      filtered = filtered.filter((t) => t.status !== "Completed" && t.status !== "Complete");
    } else if (viewMode === "archived") {
      filtered = filtered.filter((t) => t.status === "Completed" || t.status === "Complete");
    }
    if (assigneeFilter !== "All") {
      filtered = filtered.filter(
        (t) => t.assignedTo.toLowerCase() === assigneeFilter.toLowerCase()
      );
    }
    return filtered;
  }, [tasks, viewMode, assigneeFilter]);

  const STATUSES = ["Pending", "Assigned", "In Progress", "Complete"];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/tasks/${id}/status`, {
        status,
        dateCompleted:
          status === "Complete" || status === "Completed"
            ? new Date().toISOString().split("T")[0]
            : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const boardColumns = useMemo(() => {
    if (viewMode !== "board") return {};
    const cols: Record<string, Task[]> = {
      Pending: [],
      Assigned: [],
      "In Progress": [],
      Complete: [],
    };
    filteredTasks.forEach((t) => {
      let status = t.status || "Pending";
      if (status === "Completed") status = "Complete";
      if (!cols[status]) cols[status] = [];
      cols[status].push(t);
    });
    return cols;
  }, [filteredTasks, viewMode]);

  const canToggleTask = (task: Task) => {
    if (canEditTasks) return true;
    return user?.name && task.assignedTo.toLowerCase() === user.name.toLowerCase();
  };

  if (tLoading) {
    return (
      <div className="space-y-4" data-testid="tasks-loading">
        <Skeleton className="h-8 w-48" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="tasks-list-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight uppercase" data-testid="text-tasks-title">
            Tasks
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {counts.active} active, {counts.archived} archived
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md text-xs bg-muted border-0 font-bold"
            data-testid="select-assignee-filter"
          >
            <option value="All">All Personnel</option>
            {users.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>

          <div className="flex rounded-md overflow-hidden border">
            {(
              [
                { mode: "board" as const, icon: LayoutGrid, label: "Board" },
                { mode: "active" as const, icon: ListTodo, label: "List" },
                { mode: "archived" as const, icon: Archive, label: "Archive" },
              ] as const
            ).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${
                  viewMode === mode
                    ? "bg-foreground text-background"
                    : "bg-background text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`button-view-${mode}`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {viewMode === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(boardColumns).map(([status, columnTasks]) => (
            <div key={status}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                {status}
                <span className="bg-muted px-1.5 py-0.5 rounded text-[9px]">
                  {columnTasks.length}
                </span>
              </h3>
              <div className="space-y-2">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    projects={projects}
                    canToggle={canToggleTask(task)}
                    statuses={STATUSES}
                    onStatusChange={(newStatus) =>
                      statusMutation.mutate({
                        id: task.id,
                        status: newStatus,
                      })
                    }
                  />
                ))}
                {columnTasks.length === 0 && (
                  <div className="py-8 text-center border-2 border-dashed rounded-lg">
                    <p className="text-[10px] text-muted-foreground font-bold">
                      No tasks
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projects={projects}
              canToggle={canToggleTask(task)}
              statuses={STATUSES}
              onStatusChange={(newStatus) =>
                statusMutation.mutate({
                  id: task.id,
                  status: newStatus,
                })
              }
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          {viewMode === "active" ? (
            <>
              <SearchX
                size={48}
                className="mx-auto mb-4 text-muted-foreground/30"
              />
              <h3 className="text-sm font-black uppercase tracking-tight">
                No Active Tasks
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                All assigned items are cleared
              </p>
            </>
          ) : (
            <>
              <Archive
                size={48}
                className="mx-auto mb-4 text-muted-foreground/30"
              />
              <h3 className="text-sm font-black uppercase tracking-tight">
                Archive Empty
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Completed tasks appear here
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Assigned: "bg-blue-100 text-blue-800 border-blue-200",
  "In Progress": "bg-violet-100 text-violet-800 border-violet-200",
  Complete: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function StatusDropdown({
  currentStatus,
  statuses,
  canToggle,
  onStatusChange,
}: {
  currentStatus: string;
  statuses: string[];
  canToggle: boolean;
  onStatusChange: (status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const displayStatus = currentStatus === "Completed" ? "Complete" : currentStatus;
  const colorClass = STATUS_COLORS[currentStatus] || STATUS_COLORS["Pending"];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => canToggle && setOpen(!open)}
        disabled={!canToggle}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${colorClass} ${
          canToggle ? "cursor-pointer hover:opacity-80" : "cursor-not-allowed opacity-60"
        }`}
        data-testid={`button-status-${displayStatus.toLowerCase().replace(/\s+/g, "-")}`}
        title={canToggle ? "Change status" : "Only the assigned person can change this task's status"}
      >
        {displayStatus}
        {canToggle && <ChevronDown size={10} />}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-card border rounded-md shadow-lg py-1 min-w-[120px]" data-testid="dropdown-status-options">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => {
                onStatusChange(s === "Complete" ? "Completed" : s);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[11px] font-medium hover:bg-muted transition-colors flex items-center gap-2 ${
                (displayStatus === s) ? "bg-muted/50 font-bold" : ""
              }`}
              data-testid={`option-status-${s.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]?.split(" ")[0] || "bg-gray-300"}`} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  projects,
  canToggle,
  statuses,
  onStatusChange,
}: {
  task: Task;
  projects: Project[];
  canToggle: boolean;
  statuses: string[];
  onStatusChange: (status: string) => void;
}) {
  const project = projects.find((p) => p.id === task.projectId);
  const isComplete = task.status === "Completed" || task.status === "Complete";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = parseDateSafe(task.dueDate);
  const isOverdue =
    !isComplete && dueDate && dueDate.getTime() < today.getTime();

  return (
    <Card
      className={`border-card-border ${isComplete ? "opacity-60" : ""}`}
      data-testid={`task-card-${task.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p
                className={`text-sm font-bold ${
                  isComplete ? "line-through text-muted-foreground" : ""
                }`}
              >
                {task.isImportant && !isComplete && (
                  <AlertTriangle
                    size={12}
                    className="inline mr-1 text-rose-500"
                  />
                )}
                {task.name}
              </p>
              <StatusDropdown
                currentStatus={task.status}
                statuses={statuses}
                canToggle={canToggle}
                onStatusChange={onStatusChange}
              />
            </div>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground flex-wrap">
              {project && (
                <Link href={`/projects/${project.id}`}>
                  <span className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors" data-testid={`link-task-project-${task.id}`}>
                    <Briefcase size={10} />
                    {project.name}
                  </span>
                </Link>
              )}
              <span>Assigned to: {task.assignedTo}</span>
              <span
                className={
                  isOverdue ? "text-rose-500 font-bold" : ""
                }
              >
                <Calendar size={10} className="inline mr-0.5" />
                {formatDate(task.dueDate)}
                {isOverdue && " (Overdue)"}
              </span>
              {(task.tags as string[] | null)?.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-bold"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
