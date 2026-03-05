import { useQuery, useMutation } from "@tanstack/react-query";
import type { Task, Permit, Project, User } from "@shared/schema";
import { parseDateSafe, formatDate } from "@/lib/dateUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertTriangle,
  Plus,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalEvent {
  id: string;
  title: string;
  date: string;
  type: "task" | "permit-expiration";
  isImportant?: boolean;
  isCompleted?: boolean;
  projectId?: string;
  projectName?: string;
}

export default function CalendarPage() {
  const { data: tasks = [], isLoading: tLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  const { data: permits = [] } = useQuery<Permit[]>({
    queryKey: ["/api/permits"],
  });
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  const canCreateTasks = hasRole("admin", "project_manager");

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState("All");
  const [userInitialized, setUserInitialized] = useState(false);

  if (user?.name && !userInitialized) {
    setSelectedUser(user.name);
    setUserInitialized(true);
  }

  const [addingTaskDate, setAddingTaskDate] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const events = useMemo(() => {
    const result: CalEvent[] = [];

    let filteredTasks = tasks;
    if (selectedUser !== "All") {
      filteredTasks = tasks.filter(
        (t) => t.assignedTo.toLowerCase() === selectedUser.toLowerCase()
      );
    }

    filteredTasks.forEach((t) => {
      if (t.dueDate) {
        const project = projects.find((p) => p.id === t.projectId);
        result.push({
          id: `task-${t.id}`,
          title: t.name,
          date: t.dueDate,
          type: "task",
          isImportant: t.isImportant,
          isCompleted: t.status === "Completed",
          projectId: project?.id,
          projectName: project?.name,
        });
      }
    });

    permits.forEach((p) => {
      if (p.expirationDate) {
        const project = projects.find((pr) => pr.id === p.projectId);
        result.push({
          id: `permit-${p.id}`,
          title: `${p.type} expires`,
          date: p.expirationDate,
          type: "permit-expiration",
          projectId: project?.id,
          projectName: project?.name,
        });
      }
    });

    return result;
  }, [tasks, permits, projects, selectedUser]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Array<{ day: number; date: string; events: CalEvent[] }> = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, date: "", events: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayEvents = events.filter((e) => {
        const eventDate = parseDateSafe(e.date);
        if (!eventDate) return false;
        return (
          eventDate.getFullYear() === year &&
          eventDate.getMonth() === month &&
          eventDate.getDate() === d
        );
      });
      days.push({ day: d, date: dateStr, events: dayEvents });
    }

    return days;
  }, [year, month, events]);

  const todayStr = new Date().toISOString().split("T")[0];

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "Active" || p.status === "Active Priority" || p.status === "Construction"),
    [projects]
  );

  const createTaskMutation = useMutation({
    mutationFn: (data: { name: string; projectId: string; assignedTo: string; dueDate: string }) =>
      apiRequest("POST", "/api/tasks", {
        ...data,
        description: "",
        assignedBy: user?.name || "",
        dateAssigned: new Date().toISOString().split("T")[0],
        status: "Assigned",
        isImportant: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task created", description: "New task added to calendar." });
      setAddingTaskDate(null);
      setNewTaskName("");
      setNewTaskProject("");
      setNewTaskAssignee("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task.", variant: "destructive" });
    },
  });

  const handleAddTask = () => {
    if (!newTaskName.trim() || !newTaskProject || !addingTaskDate || !newTaskAssignee) return;
    createTaskMutation.mutate({
      name: newTaskName.trim(),
      projectId: newTaskProject,
      assignedTo: newTaskAssignee,
      dueDate: addingTaskDate,
    });
  };

  const handleDayClick = (dateStr: string) => {
    if (!canCreateTasks || !dateStr) return;
    setAddingTaskDate(dateStr);
    setNewTaskName("");
    setNewTaskProject(activeProjects[0]?.id || "");
    setNewTaskAssignee(user?.name || "");
  };

  if (tLoading) {
    return (
      <div className="space-y-4" data-testid="calendar-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="calendar-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight uppercase" data-testid="text-calendar-title">
            Calendar
          </h2>
          <p className="text-xs text-muted-foreground dark:text-foreground/50 mt-0.5">
            Task deadlines and permit expirations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-1.5 rounded-md text-xs bg-muted dark:bg-white/10 dark:text-foreground border-0 font-bold"
            data-testid="select-calendar-user"
          >
            <option value="All">All Personnel</option>
            {users.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentDate(new Date(year, month - 1, 1))
              }
              data-testid="button-prev-month"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              data-testid="button-today"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentDate(new Date(year, month + 1, 1))
              }
              data-testid="button-next-month"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      {addingTaskDate && (
        <Card className="border-card-border" data-testid="add-task-form">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-widest">
                Add Task for {new Date(addingTaskDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </h3>
              <button
                onClick={() => setAddingTaskDate(null)}
                className="p-1 rounded hover:bg-muted transition-colors"
                data-testid="button-cancel-add-task"
              >
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Task Name</label>
                <Input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="e.g., Submit ERP Application"
                  className="h-9 text-sm"
                  autoFocus
                  data-testid="input-new-task-name"
                />
              </div>
              <div className="min-w-[180px]">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Project</label>
                <select
                  value={newTaskProject}
                  onChange={(e) => setNewTaskProject(e.target.value)}
                  className="w-full h-9 px-3 rounded-md text-sm bg-background border"
                  data-testid="select-new-task-project"
                >
                  <option value="">Select project...</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[150px]">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Assign To</label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="w-full h-9 px-3 rounded-md text-sm bg-background border"
                  data-testid="select-new-task-assignee"
                >
                  <option value="">Select person...</option>
                  {users.filter(u => u.isActive).map((u) => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                onClick={handleAddTask}
                disabled={!newTaskName.trim() || !newTaskProject || !newTaskAssignee || createTaskMutation.isPending}
                data-testid="button-save-new-task"
              >
                <Plus size={14} className="mr-1" />
                Add Task
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-card-border">
        <div className="px-5 py-3 border-b">
          <h3 className="text-sm font-black">
            {MONTH_NAMES[month]} {year}
          </h3>
        </div>
        <CardContent className="p-0">
          <div className="grid grid-cols-7">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b"
              >
                {day}
              </div>
            ))}

            {calendarDays.map((day, i) => {
              const isToday = day.date === todayStr;
              const isAddingThis = addingTaskDate === day.date;
              return (
                <div
                  key={i}
                  className={`min-h-[100px] border-b border-r p-1.5 ${
                    day.day === 0
                      ? "bg-muted/20"
                      : isToday
                      ? "bg-primary/5"
                      : isAddingThis
                      ? "bg-primary/10 ring-1 ring-primary/30"
                      : canCreateTasks
                      ? "cursor-pointer hover:bg-muted/20 transition-colors"
                      : ""
                  }`}
                  onClick={() => day.day > 0 && handleDayClick(day.date)}
                  data-testid={day.day > 0 ? `calendar-day-${day.date}` : undefined}
                >
                  {day.day > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isToday
                              ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center"
                              : "text-muted-foreground"
                          }`}
                        >
                          {day.day}
                        </span>
                        {canCreateTasks && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDayClick(day.date); }}
                            className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded hover:bg-muted transition-all text-muted-foreground/40 hover:text-primary"
                            data-testid={`button-add-task-${day.date}`}
                            title="Add task"
                          >
                            <Plus size={10} />
                          </button>
                        )}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {day.events.slice(0, 3).map((evt) => (
                          <div
                            key={evt.id}
                            className={`text-[9px] font-bold px-1 py-0.5 rounded truncate ${
                              evt.type === "permit-expiration"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : evt.isCompleted
                                ? "bg-muted text-muted-foreground line-through"
                                : evt.isImportant
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                            title={evt.title}
                            data-testid={`calendar-event-${evt.id}`}
                          >
                            {evt.title}
                          </div>
                        ))}
                        {day.events.length > 3 && (
                          <span className="text-[8px] text-muted-foreground font-bold pl-1">
                            +{day.events.length - 3} more
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-5 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800" />
          <span className="text-[10px] font-bold text-muted-foreground dark:text-foreground/60 uppercase tracking-wider">
            Active Tasks
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800" />
          <span className="text-[10px] font-bold text-muted-foreground dark:text-foreground/60 uppercase tracking-wider">
            Permit Expirations
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800" />
          <span className="text-[10px] font-bold text-muted-foreground dark:text-foreground/60 uppercase tracking-wider">
            High Priority
          </span>
        </div>
        {canCreateTasks && (
          <div className="flex items-center gap-1.5">
            <Plus size={12} className="text-muted-foreground dark:text-foreground/60" />
            <span className="text-[10px] font-bold text-muted-foreground dark:text-foreground/60 uppercase tracking-wider">
              Click a day to add a task
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
