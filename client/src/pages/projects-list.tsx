import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import type { Project, User, Permit } from "@shared/schema";
import { StatusBadge } from "@/components/status-badge";
import {
  ArrowUpRight,
  Plus,
  Search,
  SearchX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState, useEffect } from "react";

export default function ProjectsList() {
  const { data: projects = [], isLoading: pLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: permits = [] } = useQuery<Permit[]>({
    queryKey: ["/api/permits"],
  });

  const [statusFilter, setStatusFilter] = useState("All");
  const [pmFilter, setPmFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 25;

  useEffect(() => setCurrentPage(1), [searchQuery, statusFilter, pmFilter]);

  const filteredProjects = useMemo(() => {
    let filtered = [...projects];
    if (searchQuery.trim()) {
      const words = searchQuery.toLowerCase().trim().split(/\s+/);
      filtered = filtered.filter((p) => {
        const pm = users.find((u) => u.id === p.projectManagerId);
        const projectPermits = permits.filter((per) => per.projectId === p.id);
        const text = [
          p.name,
          p.number,
          p.address,
          p.clientName,
          p.agency,
          p.strapNumber || "",
          pm?.name || "",
          ...projectPermits.map((per) => per.number || ""),
        ]
          .join(" ")
          .toLowerCase();
        return words.every((w) => text.includes(w));
      });
    }
    if (statusFilter !== "All") {
      if (statusFilter === "Active") {
        filtered = filtered.filter(
          (p) => p.status === "Active" || p.status === "Active Priority"
        );
      } else {
        filtered = filtered.filter((p) => p.status === statusFilter);
      }
    }
    if (pmFilter !== "All") {
      filtered = filtered.filter((p) => p.projectManagerId === pmFilter);
    }
    return filtered;
  }, [projects, searchQuery, statusFilter, pmFilter, users, permits]);

  const statusCounts = useMemo(() => {
    return {
      All: projects.length,
      Active: projects.filter(
        (p) => p.status === "Active" || p.status === "Active Priority"
      ).length,
      Construction: projects.filter((p) => p.status === "Construction").length,
      "On Hold": projects.filter((p) => p.status === "On Hold").length,
      Proposal: projects.filter((p) => p.status === "Proposal").length,
      Closed: projects.filter((p) => p.status === "Closed").length,
    };
  }, [projects]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (pLoading) {
    return (
      <div className="space-y-4" data-testid="projects-loading">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="projects-list-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight uppercase" data-testid="text-projects-title">
            Projects
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filteredProjects.length} of {projects.length} records
          </p>
        </div>
        <Link href="/projects/new">
          <Button size="sm" data-testid="button-new-project">
            <Plus size={14} className="mr-1" /> New Project
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by project #, name, client, address, or strap #..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-sm"
          data-testid="input-project-search"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
              statusFilter === status
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`filter-${status.toLowerCase().replace(/\s/g, "-")}`}
          >
            {status} ({count})
          </button>
        ))}

        <select
          value={pmFilter}
          onChange={(e) => setPmFilter(e.target.value)}
          className="ml-auto px-3 py-1.5 rounded-md text-xs bg-muted border-0 font-bold"
          data-testid="select-pm-filter"
        >
          <option value="All">All PMs</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <Card className="border-card-border">
        <CardContent className="p-0">
          {paginatedProjects.length > 0 ? (
            <div className="divide-y">
              {paginatedProjects.map((project) => {
                const pm = users.find(
                  (u) => u.id === project.projectManagerId
                );
                const q = searchQuery.toLowerCase().trim();
                const showAddress = q && project.address?.toLowerCase().includes(q);
                const showStrap = q && project.strapNumber?.toLowerCase().includes(q);
                return (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div
                      className="px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      data-testid={`row-project-${project.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground">
                            {project.number}
                          </span>
                          <StatusBadge status={project.status} />
                        </div>
                        <p className="text-sm font-bold mt-0.5 truncate">
                          {project.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>{project.clientName}</span>
                          <span>&middot;</span>
                          <span>{project.agency}</span>
                          {pm && (
                            <>
                              <span>&middot;</span>
                              <span>PM: {pm.name}</span>
                            </>
                          )}
                        </div>
                        {showAddress && project.address && project.address !== "TBD" && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            <span className="font-semibold">Address:</span> {project.address}
                          </p>
                        )}
                        {showStrap && project.strapNumber && project.strapNumber !== "TBD" && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            <span className="font-semibold">Strap #:</span> {project.strapNumber}
                          </p>
                        )}
                      </div>
                      <ArrowUpRight
                        size={14}
                        className="text-muted-foreground flex-shrink-0"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center">
              <SearchX
                size={48}
                className="mx-auto mb-4 text-muted-foreground/30"
              />
              <h3 className="text-sm font-black uppercase tracking-tight">
                No Projects Found
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your filters
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
