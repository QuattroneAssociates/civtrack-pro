import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Task, Project, User } from "@shared/schema";
import { formatDate, parseDateSafe } from "@/lib/dateUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  SearchX,
  Archive,
  Briefcase,
  ListTodo,
  LayoutGrid,
  ChevronDown,
  Flag,
  MoreVertical,
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

function isTaskComplete(t: Task) {
  return t.status === "Completed" || t.status === "Complete";
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
      active: base.filter((t) => !isTaskComplete(t)).length,
      archived: base.filter((t) => isTaskComplete(t)).length,
    };
  }, [tasks, effectiveFilter]);

  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];
    if (viewMode === "board" || viewMode === "active") {
      filtered = filtered.filter((t) => !isTaskComplete(t));
    } else if (viewMode === "archived") {
      filtered = filtered.filter((t) => isTaskComplete(t));
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
    };
    filteredTasks.forEach((t) => {
      let status = t.status || "Assigned";
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

  const handleStatusChange = (taskId: string, newStatus: string) => {
    statusMutation.mutate({
      id: taskId,
      status: newStatus === "Complete" ? "Completed" : newStatus,
      dateCompleted:
        newStatus === "Complete" || newStatus === "Completed"
          ? new Date().toISOString().split("T")[0]
          : null,
    });
  };

  const handlePriorityChange = (taskId: string, priority: string) => {
    statusMutation.mutate({ id: taskId, priority });
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
          <p className="text-xs text-muted-foreground dark:text-foreground/50 mt-0.5">
            {counts.active} active, {counts.archived} archived
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={effectiveFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md text-xs bg-muted dark:bg-white/10 dark:text-foreground border-0 font-bold"
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
                    : "bg-background text-muted-foreground dark:text-foreground/50 hover:text-foreground"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(boardColumns).map(([status, columnTasks]) => (
            <div key={status}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground dark:text-foreground/60 mb-2 flex items-center gap-2">
                {status}
                <span className="bg-muted dark:bg-white/10 px-1.5 py-0.5 rounded text-[9px]">
                  {columnTasks.length}
                </span>
              </h3>
              <div className="space-y-1">
                {columnTasks.map((task) => (
                  <BoardCard
                    key={task.id}
                    task={task}
                    projects={projects}
                    canToggle={canToggleTask(task)}
                    onStatusChange={(s) => handleStatusChange(task.id, s)}
                    onPriorityChange={(p) => handlePriorityChange(task.id, p)}
                  />
                ))}
                {columnTasks.length === 0 && (
                  <div className="py-6 text-center border border-dashed rounded-lg">
                    <p className="text-[10px] text-muted-foreground dark:text-foreground/40">
                      No tasks
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="divide-y border rounded-lg overflow-hidden">
          {filteredTasks.map((task) => (
            <ListRow
              key={task.id}
              task={task}
              projects={projects}
              canToggle={canToggleTask(task)}
              onStatusChange={(s) => handleStatusChange(task.id, s)}
              onPriorityChange={(p) => handlePriorityChange(task.id, p)}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          {viewMode === "active" ? (
            <>
              <SearchX size={48} className="mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-sm font-black uppercase tracking-tight">No Active Tasks</h3>
              <p className="text-xs text-muted-foreground mt-1">All assigned items are cleared</p>
            </>
          ) : (
            <>
              <Archive size={48} className="mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-sm font-black uppercase tracking-tight">Archive Empty</h3>
              <p className="text-xs text-muted-foreground mt-1">Completed tasks appear here</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BoardCard({
  task,
  projects,
  canToggle,
  onStatusChange,
  onPriorityChange,
}: {
  task: Task;
  projects: Project[];
  canToggle: boolean;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
}) {
  const project = projects.find((p) => p.id === task.projectId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = parseDateSafe(task.dueDate);
  const isOverdue = dueDate && dueDate.getTime() < today.getTime();
  const priority = (task as any).priority || "Medium";
  const priorityColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium;

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-md border bg-card text-card-foreground hover:shadow-sm transition-all group"
      data-testid={`task-card-${task.id}`}
    >
      <Flag size={11} className={`flex-shrink-0 ${priorityColor}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate">{task.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
          {project && (
            <Link href={`/projects/${project.id}`}>
              <span className="truncate max-w-[120px] hover:text-primary transition-colors cursor-pointer" data-testid={`link-task-project-${task.id}`}>
                {project.name}
              </span>
            </Link>
          )}
          <span className={`flex-shrink-0 ${isOverdue ? "text-rose-500 font-bold" : ""}`}>
            {formatDate(task.dueDate)}{isOverdue && " !"}
          </span>
        </div>
      </div>
      <TaskActionMenu
        task={task}
        canToggle={canToggle}
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
      />
    </div>
  );
}

function ListRow({
  task,
  projects,
  canToggle,
  onStatusChange,
  onPriorityChange,
}: {
  task: Task;
  projects: Project[];
  canToggle: boolean;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
}) {
  const project = projects.find((p) => p.id === task.projectId);
  const isComplete = isTaskComplete(task);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = parseDateSafe(task.dueDate);
  const isOverdue = !isComplete && dueDate && dueDate.getTime() < today.getTime();
  const priority = (task as any).priority || "Medium";
  const priorityColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium;
  const statusDisplay = task.status === "Completed" ? "Complete" : task.status;
  const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS["Assigned"];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 bg-card text-card-foreground hover:bg-muted/30 transition-colors ${isComplete ? "opacity-50" : ""}`}
      data-testid={`task-card-${task.id}`}
    >
      <Flag size={11} className={`flex-shrink-0 ${priorityColor}`} />

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold truncate ${isComplete ? "line-through text-muted-foreground" : ""}`}>
          {task.name}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
          {project && (
            <Link href={`/projects/${project.id}`}>
              <span className="hover:text-primary transition-colors cursor-pointer truncate max-w-[180px]" data-testid={`link-task-project-${task.id}`}>
                <Briefcase size={9} className="inline mr-0.5" />
                {project.name}
              </span>
            </Link>
          )}
          <span>· {task.assignedTo}</span>
        </div>
      </div>

      <span className={`text-[11px] flex-shrink-0 ${isOverdue ? "text-rose-500 font-bold" : "text-muted-foreground"}`}>
        {formatDate(task.dueDate)}
        {isOverdue && " (Overdue)"}
      </span>

      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${statusColor}`}>
        {statusDisplay}
      </span>

      <TaskActionMenu
        task={task}
        canToggle={canToggle}
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
      />
    </div>
  );
}

function TaskActionMenu({
  task,
  canToggle,
  onStatusChange,
  onPriorityChange,
}: {
  task: Task;
  canToggle: boolean;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const priority = (task as any).priority || "Medium";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const currentStatus = task.status === "Completed" ? "Complete" : task.status;

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        onClick={() => canToggle && setOpen(!open)}
        disabled={!canToggle}
        className={`p-1 rounded transition-colors ${
          canToggle
            ? "hover:bg-muted text-muted-foreground hover:text-foreground"
            : "text-muted-foreground/30 cursor-not-allowed"
        }`}
        data-testid={`button-task-menu-${task.id}`}
        title={canToggle ? "Change status or priority" : "Only the assigned person can update this task"}
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 right-0 bg-card text-card-foreground border rounded-lg shadow-lg py-1 min-w-[160px]" data-testid="dropdown-task-actions">
          <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Status
          </div>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                onStatusChange(s === "Complete" ? "Completed" : s);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[11px] font-medium hover:bg-muted transition-colors flex items-center gap-2 ${
                currentStatus === s ? "bg-muted/60 font-bold" : ""
              }`}
              data-testid={`option-status-${s.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <span className={`w-2 h-2 rounded-full border ${STATUS_COLORS[s]}`} />
              {s}
              {currentStatus === s && <span className="ml-auto text-[9px] text-muted-foreground">✓</span>}
            </button>
          ))}
          <div className="border-t my-1" />
          <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Priority
          </div>
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => {
                onPriorityChange(p);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[11px] font-medium hover:bg-muted transition-colors flex items-center gap-2 ${
                priority === p ? "bg-muted/60 font-bold" : ""
              }`}
              data-testid={`option-priority-${p.toLowerCase()}`}
            >
              <Flag size={10} className={PRIORITY_COLORS[p]} />
              {p}
              {priority === p && <span className="ml-auto text-[9px] text-muted-foreground">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
