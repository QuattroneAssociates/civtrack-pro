import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Task, Project, User } from "@shared/schema";
import { formatDate, parseDateSafe } from "@/lib/dateUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Calendar,
  SearchX,
  Archive,
  Briefcase,
  ListTodo,
  LayoutGrid,
  ChevronDown,
  Flag,
  ArrowUpDown,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";

type ViewMode = "board" | "active" | "archived";

const STATUSES = ["Assigned", "In Progress", "Complete"];
const PRIORITIES = ["High", "Medium", "Low"];

const STATUS_COLORS: Record<string, string> = {
  Assigned: "bg-blue-100 text-blue-800 border-blue-200",
  "In Progress": "bg-violet-100 text-violet-800 border-violet-200",
  Complete: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  High: "text-rose-600",
  Medium: "text-amber-500",
  Low: "text-slate-400",
};

const PRIORITY_WEIGHT: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function sortByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const da = parseDateSafe(a.dueDate);
    const db = parseDateSafe(b.dueDate);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  });
}

export default function TasksList() {
  const { data: tasks = [], isLoading: tLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { user, hasRole } = useAuth();

  const [assigneeFilter, setAssigneeFilter] = useState("__init__");
  const [viewMode, setViewMode] = useState<ViewMode>("board");

  if (assigneeFilter === "__init__" && user?.name) {
    setAssigneeFilter(user.name);
  }

  const canEditTasks = hasRole("admin", "project_manager");

  const statusMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string; dateCompleted?: string | null; priority?: string }) =>
      apiRequest("PATCH", `/api/tasks/${id}/status`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const effectiveFilter = assigneeFilter === "__init__" ? "All" : assigneeFilter;

  const counts = useMemo(() => {
    let base = [...tasks];
    if (effectiveFilter !== "All") {
      base = base.filter(
        (t) => t.assignedTo.toLowerCase() === effectiveFilter.toLowerCase()
      );
    }
    return {
      active: base.filter((t) => t.status !== "Completed" && t.status !== "Complete").length,
      archived: base.filter((t) => t.status === "Completed" || t.status === "Complete").length,
    };
  }, [tasks, effectiveFilter]);

  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];
    if (viewMode === "active") {
      filtered = filtered.filter((t) => t.status !== "Completed" && t.status !== "Complete");
    } else if (viewMode === "archived") {
      filtered = filtered.filter((t) => t.status === "Completed" || t.status === "Complete");
    }
    if (effectiveFilter !== "All") {
      filtered = filtered.filter(
        (t) => t.assignedTo.toLowerCase() === effectiveFilter.toLowerCase()
      );
    }
    return sortByDueDate(filtered);
  }, [tasks, viewMode, effectiveFilter]);

  const boardColumns = useMemo(() => {
    if (viewMode !== "board") return {};
    const cols: Record<string, Task[]> = {
      Assigned: [],
      "In Progress": [],
      Complete: [],
    };
    filteredTasks.forEach((t) => {
      let status = t.status || "Assigned";
      if (status === "Completed") status = "Complete";
      if (status === "Pending") status = "Assigned";
      if (!cols[status]) cols[status] = [];
      cols[status].push(t);
    });
    Object.keys(cols).forEach((k) => {
      cols[k] = sortByDueDate(cols[k]);
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
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tasks-list-page">
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
            value={effectiveFilter}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Object.entries(boardColumns).map(([status, columnTasks]) => (
            <div key={status}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                {status}
                <span className="bg-muted px-1.5 py-0.5 rounded text-[9px]">
                  {columnTasks.length}
                </span>
              </h3>
              <div className="space-y-1">
                {columnTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    projects={projects}
                    canToggle={canToggleTask(task)}
                    compact
                    onStatusChange={(newStatus) =>
                      statusMutation.mutate({
                        id: task.id,
                        status: newStatus,
                        dateCompleted:
                          newStatus === "Complete" || newStatus === "Completed"
                            ? new Date().toISOString().split("T")[0]
                            : null,
                      })
                    }
                    onPriorityChange={(priority) =>
                      statusMutation.mutate({ id: task.id, priority })
                    }
                  />
                ))}
                {columnTasks.length === 0 && (
                  <div className="py-6 text-center border border-dashed rounded-lg">
                    <p className="text-[10px] text-muted-foreground">
                      No tasks
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : filteredTasks.length > 0 ? (
        <div>
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 gap-y-0 items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2 border-b">
            <span>Priority</span>
            <span>Task</span>
            <span>Due</span>
            <span>Status</span>
            <span className="w-16"></span>
          </div>
          <div className="divide-y">
            {filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                projects={projects}
                canToggle={canToggleTask(task)}
                onStatusChange={(newStatus) =>
                  statusMutation.mutate({
                    id: task.id,
                    status: newStatus,
                    dateCompleted:
                      newStatus === "Complete" || newStatus === "Completed"
                        ? new Date().toISOString().split("T")[0]
                        : null,
                  })
                }
                onPriorityChange={(priority) =>
                  statusMutation.mutate({ id: task.id, priority })
                }
              />
            ))}
          </div>
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

function InlineDropdown({
  value,
  options,
  colorMap,
  canToggle,
  onChange,
  testIdPrefix,
}: {
  value: string;
  options: string[];
  colorMap: Record<string, string>;
  canToggle: boolean;
  onChange: (v: string) => void;
  testIdPrefix: string;
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

  const display = value === "Completed" ? "Complete" : value;
  const colorClass = colorMap[value] || colorMap[options[0]] || "";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => canToggle && setOpen(!open)}
        disabled={!canToggle}
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${colorClass} ${
          canToggle ? "cursor-pointer hover:opacity-80" : "cursor-not-allowed opacity-60"
        }`}
        data-testid={`button-${testIdPrefix}-${display.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {display}
        {canToggle && <ChevronDown size={9} />}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 right-0 bg-card border rounded-md shadow-lg py-1 min-w-[110px]" data-testid={`dropdown-${testIdPrefix}-options`}>
          {options.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s === "Complete" ? "Completed" : s);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1 text-[11px] font-medium hover:bg-muted transition-colors ${
                display === s ? "bg-muted/50 font-bold" : ""
              }`}
              data-testid={`option-${testIdPrefix}-${s.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  projects,
  canToggle,
  compact,
  onStatusChange,
  onPriorityChange,
}: {
  task: Task;
  projects: Project[];
  canToggle: boolean;
  compact?: boolean;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
}) {
  const project = projects.find((p) => p.id === task.projectId);
  const isComplete = task.status === "Completed" || task.status === "Complete";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = parseDateSafe(task.dueDate);
  const isOverdue = !isComplete && dueDate && dueDate.getTime() < today.getTime();
  const priority = (task as any).priority || "Medium";
  const priorityColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-md border bg-card transition-colors hover:shadow-sm ${
          isComplete ? "opacity-50" : ""
        }`}
        data-testid={`task-card-${task.id}`}
      >
        <Flag size={11} className={`flex-shrink-0 ${priorityColor}`} data-testid={`flag-priority-${task.id}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`text-xs font-semibold truncate ${isComplete ? "line-through text-muted-foreground" : ""}`}>
              {task.name}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
            {project && (
              <Link href={`/projects/${project.id}`}>
                <span className="truncate max-w-[140px] hover:text-primary transition-colors cursor-pointer" data-testid={`link-task-project-${task.id}`}>
                  {project.name}
                </span>
              </Link>
            )}
            <span className={`flex-shrink-0 ${isOverdue ? "text-rose-500 font-bold" : ""}`}>
              {formatDate(task.dueDate)}
              {isOverdue && " !"}
            </span>
          </div>
        </div>
        <PriorityDropdown priority={priority} canToggle={canToggle} onChange={onPriorityChange} />
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 items-center px-3 py-2.5 transition-colors hover:bg-muted/30 ${
        isComplete ? "opacity-50" : ""
      }`}
      data-testid={`task-card-${task.id}`}
    >
      <Flag size={12} className={`flex-shrink-0 ${priorityColor}`} data-testid={`flag-priority-${task.id}`} />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold truncate ${isComplete ? "line-through text-muted-foreground" : ""}`}>
            {task.name}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
          {project && (
            <Link href={`/projects/${project.id}`}>
              <span className="hover:text-primary transition-colors cursor-pointer truncate max-w-[200px]" data-testid={`link-task-project-${task.id}`}>
                <Briefcase size={9} className="inline mr-0.5" />
                {project.name}
              </span>
            </Link>
          )}
          <span>· {task.assignedTo}</span>
          {task.description && (
            <span className="truncate max-w-[200px] hidden lg:inline">· {task.description}</span>
          )}
        </div>
      </div>

      <span className={`text-xs flex-shrink-0 ${isOverdue ? "text-rose-500 font-bold" : "text-muted-foreground"}`}>
        <Calendar size={10} className="inline mr-0.5" />
        {formatDate(task.dueDate)}
        {isOverdue && " (Overdue)"}
      </span>

      <InlineDropdown
        value={task.status}
        options={STATUSES}
        colorMap={STATUS_COLORS}
        canToggle={canToggle}
        onChange={onStatusChange}
        testIdPrefix="status"
      />

      <PriorityDropdown priority={priority} canToggle={canToggle} onChange={onPriorityChange} />
    </div>
  );
}

function PriorityDropdown({
  priority,
  canToggle,
  onChange,
}: {
  priority: string;
  canToggle: boolean;
  onChange: (p: string) => void;
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

  const color = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => canToggle && setOpen(!open)}
        disabled={!canToggle}
        className={`inline-flex items-center gap-0.5 text-[10px] font-bold transition-colors ${color} ${
          canToggle ? "cursor-pointer hover:opacity-70" : "cursor-not-allowed opacity-60"
        }`}
        data-testid={`button-priority-${priority.toLowerCase()}`}
        title={`Priority: ${priority}`}
      >
        <Flag size={11} />
        {canToggle && <ChevronDown size={8} />}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 right-0 bg-card border rounded-md shadow-lg py-1 min-w-[90px]" data-testid="dropdown-priority-options">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1 text-[11px] font-medium hover:bg-muted transition-colors flex items-center gap-2 ${
                priority === p ? "bg-muted/50 font-bold" : ""
              }`}
              data-testid={`option-priority-${p.toLowerCase()}`}
            >
              <Flag size={10} className={PRIORITY_COLORS[p]} />
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
