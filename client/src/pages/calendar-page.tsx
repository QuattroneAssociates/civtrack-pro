import { useQuery } from "@tanstack/react-query";
import type { Task, Permit, Project, User } from "@shared/schema";
import { parseDateSafe, formatDate } from "@/lib/dateUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertTriangle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";

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

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState("All");

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
          <p className="text-xs text-muted-foreground mt-0.5">
            Task deadlines and permit expirations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-1.5 rounded-md text-xs bg-muted border-0 font-bold"
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
              return (
                <div
                  key={i}
                  className={`min-h-[100px] border-b border-r p-1.5 ${
                    day.day === 0
                      ? "bg-muted/20"
                      : isToday
                      ? "bg-primary/5"
                      : ""
                  }`}
                >
                  {day.day > 0 && (
                    <>
                      <span
                        className={`text-xs font-bold ${
                          isToday
                            ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center"
                            : "text-muted-foreground"
                        }`}
                      >
                        {day.day}
                      </span>
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
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Active Tasks
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Permit Expirations
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            High Priority
          </span>
        </div>
      </div>
    </div>
  );
}
