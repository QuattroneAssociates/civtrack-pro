import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import type { Project, Permit, Task, Note, User } from "@shared/schema";
import { StatusBadge, AppStatusBadge } from "@/components/status-badge";
import { formatDate, parseDateSafe, toInputDate } from "@/lib/dateUtils";
import { PERMIT_TYPES, APPLICATION_STATUSES, NOTE_TYPES } from "@/lib/constants";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin, UserCheck, Landmark, ExternalLink, Folder, Pencil,
  Trash2, Plus, Calendar, FileText, ClipboardList, MessageSquare,
  CheckCircle2, AlertTriangle, Clock, ArrowLeft, Phone, Mail,
  Search, MoreHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";

export default function ProjectDetails() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAdmin, hasRole } = useAuth();

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", params.id],
  });
  const { data: permits = [] } = useQuery<Permit[]>({
    queryKey: ["/api/projects", params.id, "permits"],
  });
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/projects", params.id, "tasks"],
  });
  const { data: projectNotes = [] } = useQuery<Note[]>({
    queryKey: ["/api/projects", params.id, "notes"],
  });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/projects/${params.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      navigate("/projects");
      toast({ title: "Project deleted" });
    },
  });

  const pm = users.find((u) => u.id === project?.projectManagerId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-lg font-bold">Project not found</h2>
        <Link href="/projects">
          <Button variant="outline" className="mt-4">
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="project-details-page">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/projects">
          <Button variant="ghost" size="icon" data-testid="button-back-projects">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-muted-foreground">
              {project.number}
            </span>
            <StatusBadge status={project.status} />
            {project.ballInCourt && (
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                BIC: {project.ballInCourt}
              </span>
            )}
          </div>
          <h2 className="text-lg font-black tracking-tight mt-0.5" data-testid="text-project-name">
            {project.name}
          </h2>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link href={`/projects/${project.id}/edit`}>
              <Button variant="outline" size="sm" data-testid="button-edit-project">
                <Pencil size={12} className="mr-1" /> Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => {
                if (confirm("Delete this project? This cannot be undone.")) {
                  deleteMutation.mutate();
                }
              }}
              data-testid="button-delete-project"
            >
              <Trash2 size={12} className="mr-1" /> Delete
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="permits" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="permits" className="text-xs" data-testid="tab-permits">
            <FileText size={12} className="mr-1" /> Permits ({permits.length})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs" data-testid="tab-tasks">
            <ClipboardList size={12} className="mr-1" /> Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs" data-testid="tab-notes">
            <MessageSquare size={12} className="mr-1" /> Notes ({projectNotes.length})
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs" data-testid="tab-details">
            <Landmark size={12} className="mr-1" /> Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="permits" className="mt-4">
          <PermitSection
            projectId={project.id}
            permits={permits}
          />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <TaskSection
            projectId={project.id}
            tasks={tasks}
            users={users}
          />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <NoteSection
            projectId={project.id}
            notes={projectNotes}
            users={users}
          />
        </TabsContent>
        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="border-card-border">
              <CardContent className="p-5 space-y-4">
                <div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                    Key Details
                  </h4>
                  <div className="space-y-3">
                    <InfoRow
                      icon={<UserCheck size={14} />}
                      label="Project Manager"
                      value={pm?.name || "Unassigned"}
                    />
                    <InfoRow
                      icon={<Landmark size={14} />}
                      label="Jurisdiction"
                      value={project.agency}
                    />
                    <InfoRow
                      icon={<MapPin size={14} />}
                      label="Address"
                      value={project.address}
                    />
                    <div className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                      Strap: {project.strapNumber}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                    Client
                  </h4>
                  <p className="text-sm font-bold">{project.clientName}</p>
                  {project.clientEmail && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Mail size={10} /> {project.clientEmail}
                    </div>
                  )}
                  {project.clientMobile && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Phone size={10} /> {project.clientMobile}
                    </div>
                  )}
                </div>

                {project.description && (
                  <div className="border-t pt-3">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                      Description
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {project.description}
                    </p>
                  </div>
                )}

                {project.oneDriveFolder && (
                  <a
                    href={project.oneDriveFolder}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
                  >
                    <Folder size={14} />
                    <span className="flex-1">Open OneDrive Folder</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </CardContent>
            </Card>

            <SubConsultants project={project} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xs font-bold">{value}</p>
      </div>
    </div>
  );
}

function SubConsultants({ project }: { project: Project }) {
  const subs = [
    { label: "Architect", value: project.architect },
    { label: "Surveyor", value: project.surveyor },
    { label: "Biologist", value: project.biologist },
    { label: "Landscaper", value: project.landscaper },
    { label: "Traffic Engineer", value: project.trafficEngineer },
  ].filter((s) => s.value);

  if (subs.length === 0) return null;

  return (
    <Card className="border-card-border">
      <CardContent className="p-5">
        <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3">
          Sub-Consultants
        </h4>
        <div className="space-y-2">
          {subs.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {s.label}
              </span>
              <span className="text-xs font-bold">{s.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PermitSection({
  projectId,
  permits,
}: {
  projectId: string;
  permits: Permit[];
}) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const canEdit = isAdmin;
  const [showForm, setShowForm] = useState(false);
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null);
  const [permitSearch, setPermitSearch] = useState("");
  const [formData, setFormData] = useState({
    type: "",
    number: "",
    description: "",
    targetDate: "",
    submittalDate: "",
    comments1Date: "",
    resubmittal1Date: "",
    comments2Date: "",
    resubmittal2Date: "",
    approvalDate: "",
    expirationDate: "",
    agency: "",
    applicationStatus: "",
    feeStatus: "",
    feeAmount: "",
    submittalNotes: "",
  });

  const filteredPermits = useMemo(() => {
    if (!permitSearch.trim()) return permits;
    const q = permitSearch.toLowerCase().trim();
    return permits.filter(
      (p) =>
        p.type.toLowerCase().includes(q) ||
        (p.number && p.number.toLowerCase().includes(q))
    );
  }, [permits, permitSearch]);

  const openForm = (permit?: Permit) => {
    if (permit) {
      setEditingPermit(permit);
      setFormData({
        type: permit.type,
        number: permit.number || "",
        description: permit.description || "",
        targetDate: toInputDate(permit.targetDate),
        submittalDate: toInputDate(permit.submittalDate),
        comments1Date: toInputDate(permit.comments1Date),
        resubmittal1Date: toInputDate(permit.resubmittal1Date),
        comments2Date: toInputDate(permit.comments2Date),
        resubmittal2Date: toInputDate(permit.resubmittal2Date),
        approvalDate: toInputDate(permit.approvalDate),
        expirationDate: toInputDate(permit.expirationDate),
        agency: permit.agency || "",
        applicationStatus: permit.applicationStatus || "",
        feeStatus: permit.feeStatus || "",
        feeAmount: permit.feeAmount || "",
        submittalNotes: permit.submittalNotes || "",
      });
    } else {
      setEditingPermit(null);
      setFormData({
        type: "",
        number: "",
        description: "",
        targetDate: "",
        submittalDate: "",
        comments1Date: "",
        resubmittal1Date: "",
        comments2Date: "",
        resubmittal2Date: "",
        approvalDate: "",
        expirationDate: "",
        agency: "",
        applicationStatus: "",
        feeStatus: "",
        feeAmount: "",
        submittalNotes: "",
      });
    }
    setShowForm(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/permits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "permits"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      setShowForm(false);
      toast({ title: "Permit created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PATCH", `/api/permits/${editingPermit!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "permits"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      setShowForm(false);
      toast({ title: "Permit updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/permits/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "permits"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      toast({ title: "Permit deleted" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      projectId,
      targetDate: formData.targetDate || null,
      submittalDate: formData.submittalDate || null,
      comments1Date: formData.comments1Date || null,
      resubmittal1Date: formData.resubmittal1Date || null,
      comments2Date: formData.comments2Date || null,
      resubmittal2Date: formData.resubmittal2Date || null,
      approvalDate: formData.approvalDate || null,
      expirationDate: formData.expirationDate || null,
      lastActionDate: null,
      externalDependency: null,
      submittalType: null,
    };
    if (editingPermit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const shortDate = (val: string | null | undefined) => {
    if (!val) return "";
    const d = parseDateSafe(val);
    if (!d) return "";
    return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-black tracking-tight">
          Permit Requirements
        </h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={permitSearch}
              onChange={(e) => setPermitSearch(e.target.value)}
              className="pl-9 w-48 text-sm"
              data-testid="input-permit-search"
            />
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => openForm()} data-testid="button-add-permit">
              <Plus size={12} className="mr-1" /> Add
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="border-card-border">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <FormField
                  label="Permit Type"
                  required
                  select
                  options={PERMIT_TYPES}
                  value={formData.type}
                  onChange={(v) => setFormData({ ...formData, type: v })}
                />
                <FormField
                  label="Number"
                  value={formData.number}
                  onChange={(v) => setFormData({ ...formData, number: v })}
                />
                <FormField
                  label="Agency"
                  value={formData.agency}
                  onChange={(v) => setFormData({ ...formData, agency: v })}
                />
                <FormField
                  label="Status"
                  select
                  options={APPLICATION_STATUSES}
                  value={formData.applicationStatus}
                  onChange={(v) =>
                    setFormData({ ...formData, applicationStatus: v })
                  }
                />
                <FormField
                  label="Target Date"
                  type="date"
                  value={formData.targetDate}
                  onChange={(v) => setFormData({ ...formData, targetDate: v })}
                />
                <FormField
                  label="Submittal Date"
                  type="date"
                  value={formData.submittalDate}
                  onChange={(v) =>
                    setFormData({ ...formData, submittalDate: v })
                  }
                />
                <FormField
                  label="Comments 1 Date"
                  type="date"
                  value={formData.comments1Date}
                  onChange={(v) =>
                    setFormData({ ...formData, comments1Date: v })
                  }
                />
                <FormField
                  label="Resubmittal 1 Date"
                  type="date"
                  value={formData.resubmittal1Date}
                  onChange={(v) =>
                    setFormData({ ...formData, resubmittal1Date: v })
                  }
                />
                <FormField
                  label="Comments 2 Date"
                  type="date"
                  value={formData.comments2Date}
                  onChange={(v) =>
                    setFormData({ ...formData, comments2Date: v })
                  }
                />
                <FormField
                  label="Resubmittal 2 Date"
                  type="date"
                  value={formData.resubmittal2Date}
                  onChange={(v) =>
                    setFormData({ ...formData, resubmittal2Date: v })
                  }
                />
                <FormField
                  label="Approval Date"
                  type="date"
                  value={formData.approvalDate}
                  onChange={(v) =>
                    setFormData({ ...formData, approvalDate: v })
                  }
                />
                <FormField
                  label="Expiration Date"
                  type="date"
                  value={formData.expirationDate}
                  onChange={(v) =>
                    setFormData({ ...formData, expirationDate: v })
                  }
                />
                <FormField
                  label="Fee Amount"
                  value={formData.feeAmount}
                  onChange={(v) => setFormData({ ...formData, feeAmount: v })}
                />
              </div>
              <FormField
                label="Description"
                value={formData.description}
                onChange={(v) => setFormData({ ...formData, description: v })}
                textarea
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" data-testid="button-save-permit">
                  {editingPermit ? "Update" : "Create"} Permit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {filteredPermits.length > 0 ? (
        <div className="rounded-lg border border-card-border max-h-[70vh] overflow-y-auto">
          <table className="w-full text-[11px] table-fixed" data-testid="permit-table">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              {canEdit && <col className="w-[6%]" />}
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
                <th className="text-left px-2 py-2 font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="text-left px-2 py-2 font-bold text-[9px] uppercase tracking-wider text-muted-foreground">#</th>
                <th className="text-left px-2 py-2 font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Target</th>
                <th className="text-left px-2 py-2 font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Submit</th>
                <th className="text-left px-2 py-2 font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Cmt 1</th>
                <th className="text-left px-2 py-2 font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Resub 1</th>
                <th className="text-left px-2 py-2 font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Cmt 2</th>
                <th className="text-left px-2 py-2 font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Resub 2</th>
                <th className="text-left px-2 py-2 font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Apprvl</th>
                <th className="text-left px-2 py-2 font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Expir</th>
                {canEdit && <th className="px-1 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPermits.map((permit) => (
                <tr key={permit.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-permit-${permit.id}`}>
                  <td className="px-2 py-2 font-semibold truncate" title={permit.type}>{permit.type}</td>
                  <td className="px-2 py-2 font-mono text-muted-foreground truncate" title={permit.number || ""}>{permit.number || ""}</td>
                  <td className="px-2 py-2 tabular-nums">{shortDate(permit.targetDate)}</td>
                  <td className="px-2 py-2 tabular-nums">{shortDate(permit.submittalDate)}</td>
                  <td className="px-2 py-2 tabular-nums">{shortDate(permit.comments1Date)}</td>
                  <td className="px-2 py-2 tabular-nums">{shortDate(permit.resubmittal1Date)}</td>
                  <td className="px-2 py-2 tabular-nums">{shortDate(permit.comments2Date)}</td>
                  <td className="px-2 py-2 tabular-nums">{shortDate(permit.resubmittal2Date)}</td>
                  <td className="px-2 py-2 tabular-nums">{shortDate(permit.approvalDate)}</td>
                  <td className="px-2 py-2 tabular-nums">{shortDate(permit.expirationDate)}</td>
                  {canEdit && (
                    <td className="px-1 py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-permit-menu-${permit.id}`}>
                            <MoreHorizontal size={14} className="text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openForm(permit)} data-testid={`button-edit-permit-${permit.id}`}>
                            <Pencil size={12} /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (confirm("Delete this permit?"))
                                deleteMutation.mutate(permit.id);
                            }}
                            data-testid={`button-delete-permit-${permit.id}`}
                          >
                            <Trash2 size={12} /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-16 text-center border-2 border-dashed rounded-lg">
          <FileText size={32} className="mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-xs font-bold text-muted-foreground">
            {permitSearch.trim() ? "No permits match your search" : "No permits on file"}
          </p>
        </div>
      )}
    </div>
  );
}

function TaskSection({
  projectId,
  tasks,
  users,
}: {
  projectId: string;
  tasks: Task[];
  users: User[];
}) {
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const canManageTasks = hasRole("admin", "project_manager");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    assignedTo: "",
    assignedBy: "",
    dueDate: "",
    isImportant: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "tasks"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowForm(false);
      setFormData({
        name: "",
        description: "",
        assignedTo: "",
        assignedBy: "",
        dueDate: "",
        isImportant: false,
      });
      toast({ title: "Task created" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/tasks/${id}`, {
        status,
        dateCompleted:
          status === "Completed"
            ? new Date().toISOString().split("T")[0]
            : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "tasks"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      projectId,
      status: "Pending",
      notes: null,
      tags: null,
      comments: null,
      dateCompleted: null,
    });
  };

  const activeTasks = tasks.filter((t) => t.status !== "Completed");
  const completedTasks = tasks.filter((t) => t.status === "Completed");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest">
          Task Ledger
        </h3>
        {canManageTasks && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            data-testid="button-add-task"
          >
            <Plus size={12} className="mr-1" /> New Task
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-card-border">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <FormField
                label="Task Name"
                required
                value={formData.name}
                onChange={(v) => setFormData({ ...formData, name: v })}
              />
              <FormField
                label="Description"
                textarea
                value={formData.description}
                onChange={(v) => setFormData({ ...formData, description: v })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  label="Assigned To"
                  required
                  select
                  options={users.map((u) => u.name)}
                  value={formData.assignedTo}
                  onChange={(v) => setFormData({ ...formData, assignedTo: v })}
                />
                <FormField
                  label="Assigned By"
                  required
                  select
                  options={users.map((u) => u.name)}
                  value={formData.assignedBy}
                  onChange={(v) => setFormData({ ...formData, assignedBy: v })}
                />
                <FormField
                  label="Due Date"
                  required
                  type="date"
                  value={formData.dueDate}
                  onChange={(v) => setFormData({ ...formData, dueDate: v })}
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isImportant}
                  onChange={(e) =>
                    setFormData({ ...formData, isImportant: e.target.checked })
                  }
                  className="rounded"
                />
                High Priority
              </label>
              <div className="flex gap-2">
                <Button type="submit" size="sm" data-testid="button-save-task">
                  Create Task
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTasks.length > 0 && (
        <div className="space-y-2">
          {activeTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() =>
                toggleMutation.mutate({
                  id: task.id,
                  status: "Completed",
                })
              }
            />
          ))}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="mt-6">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Completed ({completedTasks.length})
          </h4>
          <div className="space-y-2 opacity-60">
            {completedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() =>
                  toggleMutation.mutate({
                    id: task.id,
                    status: "Pending",
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="py-16 text-center border-2 border-dashed rounded-lg">
          <ClipboardList
            size={32}
            className="mx-auto mb-2 text-muted-foreground/30"
          />
          <p className="text-xs font-bold text-muted-foreground">
            No tasks assigned
          </p>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: () => void;
}) {
  const isComplete = task.status === "Completed";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = parseDateSafe(task.dueDate);
  const isOverdue =
    !isComplete && dueDate && dueDate.getTime() < today.getTime();

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
        isComplete ? "bg-muted/30" : "bg-card"
      }`}
      data-testid={`task-row-${task.id}`}
    >
      <button
        onClick={onToggle}
        className={`mt-0.5 flex-shrink-0 ${
          isComplete ? "text-emerald-500" : "text-muted-foreground/40"
        }`}
        data-testid={`button-toggle-task-${task.id}`}
      >
        <CheckCircle2 size={16} />
      </button>
      <div className="min-w-0 flex-1">
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
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
          <span>Assigned to: {task.assignedTo}</span>
          <span
            className={isOverdue ? "text-rose-500 font-bold" : ""}
          >
            <Calendar size={10} className="inline mr-0.5" />
            {formatDate(task.dueDate)}
            {isOverdue && " (Overdue)"}
          </span>
        </div>
      </div>
    </div>
  );
}

function NoteSection({
  projectId,
  notes,
  users,
}: {
  projectId: string;
  notes: Note[];
  users: User[];
}) {
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const canAddNotes = hasRole("admin", "project_manager");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "General",
    body: "",
    author: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/notes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "notes"],
      });
      setShowForm(false);
      setFormData({ type: "General", body: "", author: "" });
      toast({ title: "Note added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "notes"],
      });
      toast({ title: "Note deleted" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...formData, projectId });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest">
          Project Notes
        </h3>
        {canAddNotes && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            data-testid="button-add-note"
          >
            <Plus size={12} className="mr-1" /> New Entry
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-card-border">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  label="Type"
                  required
                  select
                  options={NOTE_TYPES}
                  value={formData.type}
                  onChange={(v) => setFormData({ ...formData, type: v })}
                />
                <FormField
                  label="Author"
                  required
                  select
                  options={users.map((u) => u.name)}
                  value={formData.author}
                  onChange={(v) => setFormData({ ...formData, author: v })}
                />
              </div>
              <FormField
                label="Note"
                required
                textarea
                value={formData.body}
                onChange={(v) => setFormData({ ...formData, body: v })}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" data-testid="button-save-note">
                  Save Entry
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className="border-card-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted">
                      {note.type}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {note.author}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(note.date)}
                    </span>
                  </div>
                  {canAddNotes && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm("Delete this note?"))
                          deleteMutation.mutate(note.id);
                      }}
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
                <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap">
                  {note.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center border-2 border-dashed rounded-lg">
          <MessageSquare
            size={32}
            className="mx-auto mb-2 text-muted-foreground/30"
          />
          <p className="text-xs font-bold text-muted-foreground">
            No entries on file
          </p>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  select = false,
  options = [],
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  select?: boolean;
  options?: string[];
  textarea?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s/g, "-");
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1"
      >
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {select ? (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
          data-testid={`select-${id}`}
        >
          <option value="">Select...</option>
          {value && !options.includes(value) && (
            <option key={value} value={value}>
              {value}
            </option>
          )}
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : textarea ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          rows={3}
          className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
          data-testid={`textarea-${id}`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
          data-testid={`input-${id}`}
        />
      )}
    </div>
  );
}
