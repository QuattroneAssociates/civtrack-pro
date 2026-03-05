import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import type { Project, User } from "@shared/schema";
import { PROJECT_STATUSES, AGENCIES, BIC_OPTIONS, TITLE_POLICY_STATUSES } from "@/lib/constants";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";

export default function ProjectForm() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const isEdit = !!params.id;

  useEffect(() => {
    if (!isAdmin) navigate("/projects");
  }, [isAdmin, navigate]);

  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: existingProject } = useQuery<Project>({
    queryKey: ["/api/projects", params.id],
    enabled: isEdit,
  });

  const [form, setForm] = useState({
    name: "",
    number: "",
    description: "",
    status: "Active",
    projectManagerId: "",
    address: "",
    agency: "",
    strapNumber: "",
    clientName: "",
    clientEmail: "",
    clientMobile: "",
    clientOffice: "",
    architect: "",
    biologist: "",
    landscaper: "",
    surveyor: "",
    trafficEngineer: "",
    titlePolicyStatus: "Pending",
    ballInCourt: "",
    oneDriveFolder: "",
    mapLink: "",
    oneDriveNotes: "",
    latitude: "",
    longitude: "",
  });

  useEffect(() => {
    if (existingProject) {
      setForm({
        name: existingProject.name,
        number: existingProject.number,
        description: existingProject.description || "",
        status: existingProject.status,
        projectManagerId: existingProject.projectManagerId,
        address: existingProject.address,
        agency: existingProject.agency,
        strapNumber: existingProject.strapNumber,
        clientName: existingProject.clientName,
        clientEmail: existingProject.clientEmail || "",
        clientMobile: existingProject.clientMobile || "",
        clientOffice: existingProject.clientOffice || "",
        architect: existingProject.architect || "",
        biologist: existingProject.biologist || "",
        landscaper: existingProject.landscaper || "",
        surveyor: existingProject.surveyor || "",
        trafficEngineer: existingProject.trafficEngineer || "",
        titlePolicyStatus: existingProject.titlePolicyStatus,
        ballInCourt: existingProject.ballInCourt || "",
        oneDriveFolder: existingProject.oneDriveFolder || "",
        mapLink: existingProject.mapLink || "",
        oneDriveNotes: existingProject.oneDriveNotes || "",
        latitude: existingProject.latitude?.toString() || "",
        longitude: existingProject.longitude?.toString() || "",
      });
    }
  }, [existingProject]);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      navigate("/projects");
      toast({ title: "Project created successfully" });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PATCH", `/api/projects/${params.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      navigate(`/projects/${params.id}`);
      toast({ title: "Project updated" });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      clientEmail: form.clientEmail || null,
      clientMobile: form.clientMobile || null,
      clientOffice: form.clientOffice || null,
      architect: form.architect || null,
      biologist: form.biologist || null,
      landscaper: form.landscaper || null,
      surveyor: form.surveyor || null,
      trafficEngineer: form.trafficEngineer || null,
      ballInCourt: form.ballInCourt || null,
      oneDriveFolder: form.oneDriveFolder || null,
      oneDriveNotes: form.oneDriveNotes || null,
      mapLink: form.mapLink || null,
      description: form.description || null,
      createdBy: null,
      lastUpdatedBy: null,
    };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const set = (key: string) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  return (
    <div className="max-w-4xl mx-auto space-y-5" data-testid="project-form-page">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} data-testid="button-back">
          <ArrowLeft size={16} />
        </Button>
        <h2 className="text-lg font-black tracking-tight uppercase" data-testid="text-form-title">
          {isEdit ? "Edit Project" : "New Project"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="border-card-border">
          <CardContent className="p-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
              Project Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Project Name" required value={form.name} onChange={set("name")} />
              <Field label="Project Number" required value={form.number} onChange={set("number")} />
              <Field label="Status" required select options={[...PROJECT_STATUSES]} value={form.status} onChange={set("status")} />
              <Field label="Project Manager" required select options={users.map(u => u.name)} optionValues={users.map(u => u.id)} value={form.projectManagerId} onChange={set("projectManagerId")} />
              <Field label="Agency" required select options={[...AGENCIES]} value={form.agency} onChange={set("agency")} />
              <Field label="Ball in Court" select options={BIC_OPTIONS} value={form.ballInCourt} onChange={set("ballInCourt")} />
              <Field label="Title Policy Status" required select options={[...TITLE_POLICY_STATUSES]} value={form.titlePolicyStatus} onChange={set("titlePolicyStatus")} />
            </div>
            <div className="mt-3">
              <Field label="Description" textarea value={form.description} onChange={set("description")} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardContent className="p-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
              Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Address" required value={form.address} onChange={set("address")} />
              <Field label="Strap Number" required value={form.strapNumber} onChange={set("strapNumber")} />
              <Field label="Map Link" value={form.mapLink} onChange={set("mapLink")} />
              <Field label="Latitude" value={form.latitude} onChange={set("latitude")} />
              <Field label="Longitude" value={form.longitude} onChange={set("longitude")} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardContent className="p-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
              Client Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Client Name" required value={form.clientName} onChange={set("clientName")} />
              <Field label="Client Email" type="email" value={form.clientEmail} onChange={set("clientEmail")} />
              <Field label="Client Mobile" value={form.clientMobile} onChange={set("clientMobile")} />
              <Field label="Client Office" value={form.clientOffice} onChange={set("clientOffice")} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardContent className="p-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
              Sub-Consultants
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Architect" value={form.architect} onChange={set("architect")} />
              <Field label="Surveyor" value={form.surveyor} onChange={set("surveyor")} />
              <Field label="Biologist" value={form.biologist} onChange={set("biologist")} />
              <Field label="Landscaper" value={form.landscaper} onChange={set("landscaper")} />
              <Field label="Traffic Engineer" value={form.trafficEngineer} onChange={set("trafficEngineer")} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardContent className="p-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
              OneDrive
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="OneDrive Folder Link" value={form.oneDriveFolder} onChange={set("oneDriveFolder")} />
              <Field label="OneDrive Notes" value={form.oneDriveNotes} onChange={set("oneDriveNotes")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => window.history.back()} data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="button-submit-project"
          >
            <Save size={14} className="mr-1" />
            {isEdit ? "Update Project" : "Create Project"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  select = false,
  options = [],
  optionValues,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  select?: boolean;
  options?: string[];
  optionValues?: string[];
  textarea?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s/g, "-");
  return (
    <div>
      <label htmlFor={id} className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {select ? (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full px-3 py-2 rounded-md border bg-background dark:bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
          data-testid={`select-${id}`}
        >
          <option value="">Select...</option>
          {options.map((o, i) => (
            <option key={o} value={optionValues ? optionValues[i] : o}>{o}</option>
          ))}
        </select>
      ) : textarea ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          rows={3}
          className="w-full px-3 py-2 rounded-md border bg-background dark:bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
          data-testid={`textarea-${id}`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full px-3 py-2 rounded-md border bg-background dark:bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
          data-testid={`input-${id}`}
        />
      )}
    </div>
  );
}
