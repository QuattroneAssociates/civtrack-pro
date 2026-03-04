import { useQuery, useMutation } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { USER_ROLES } from "@/lib/constants";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Mail,
  Shield,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { useState } from "react";

export default function UserDirectory() {
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "Engineer",
    isActive: true,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowModal(false);
      toast({ title: "User created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PATCH", `/api/users/${editingUser!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowModal(false);
      toast({ title: "User updated" });
    },
  });

  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setFormData({ name: "", email: "", role: "Engineer", isActive: true });
    }
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="users-loading">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const activeUsers = users.filter((u) => u.isActive);
  const inactiveUsers = users.filter((u) => !u.isActive);

  return (
    <div className="space-y-5" data-testid="user-directory-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight uppercase" data-testid="text-users-title">
            Team Directory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeUsers.length} active members
          </p>
        </div>
        <Button size="sm" onClick={() => openModal()} data-testid="button-add-user">
          <Plus size={14} className="mr-1" /> Add Member
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeUsers.map((user) => (
          <UserCard key={user.id} user={user} onEdit={() => openModal(user)} />
        ))}
      </div>

      {inactiveUsers.length > 0 && (
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
            Inactive Members ({inactiveUsers.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60">
            {inactiveUsers.map((user) => (
              <UserCard key={user.id} user={user} onEdit={() => openModal(user)} />
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md border-card-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-black uppercase tracking-tight">
                  {editingUser ? "Edit Member" : "New Member"}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowModal(false)}
                  data-testid="button-close-modal"
                >
                  <X size={16} />
                </Button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    data-testid="input-user-name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    data-testid="input-user-email"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Role <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    data-testid="select-user-role"
                  >
                    {USER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <div className="flex rounded-md overflow-hidden border">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, isActive: true })
                      }
                      className={`flex-1 py-2 text-xs font-bold transition-colors ${
                        formData.isActive
                          ? "bg-emerald-500 text-white"
                          : "bg-background text-muted-foreground"
                      }`}
                      data-testid="button-status-active"
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, isActive: false })
                      }
                      className={`flex-1 py-2 text-xs font-bold transition-colors ${
                        !formData.isActive
                          ? "bg-rose-500 text-white"
                          : "bg-background text-muted-foreground"
                      }`}
                      data-testid="button-status-inactive"
                    >
                      Inactive
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-[2]"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    data-testid="button-save-user"
                  >
                    {editingUser ? "Update" : "Create"} Member
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function UserCard({
  user,
  onEdit,
}: {
  user: User;
  onEdit: () => void;
}) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const roleColors: Record<string, string> = {
    "Application Owner": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    "Project Manager": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    Engineer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    "Associate Engineer": "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
    Designer: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    Planner: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    "Office Manager": "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  };

  return (
    <Card className="border-card-border" data-testid={`user-card-${user.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">{user.name}</p>
            <span
              className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 ${
                roleColors[user.role] || "bg-muted text-muted-foreground"
              }`}
            >
              {user.role}
            </span>
            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
              <Mail size={10} />
              <span className="truncate">{user.email}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            data-testid={`button-edit-user-${user.id}`}
          >
            <Pencil size={12} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
