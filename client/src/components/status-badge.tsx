import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  Active: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "Active Priority":
    "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse",
  Closed: "bg-muted text-muted-foreground dark:bg-card-foreground/10 dark:text-card-foreground/60",
  Construction:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "On Hold":
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Proposal:
    "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "CO Issued":
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
        statusStyles[status] || "bg-muted text-muted-foreground dark:bg-card-foreground/10 dark:text-card-foreground/60"
      )}
      data-testid={`badge-status-${status.toLowerCase().replace(/\s/g, "-")}`}
    >
      {status}
    </span>
  );
}

const appStatusStyles: Record<string, string> = {
  "Not Started": "bg-muted text-muted-foreground dark:bg-card-foreground/10 dark:text-card-foreground/60",
  "In Preparation": "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
  "Under Agency Review": "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "Comments Received": "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "Resubmittal Under Review": "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  "Fees Posted - Unpaid": "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "Fees Posted - Paid": "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
  Approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Denied: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  Withdrawn: "bg-muted text-muted-foreground dark:bg-card-foreground/10 dark:text-card-foreground/60",
  Expired: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function AppStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground text-xs">-</span>;
  return (
    <span
      className={cn(
        "inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
        appStatusStyles[status] || "bg-muted text-muted-foreground dark:bg-card-foreground/10 dark:text-card-foreground/60"
      )}
    >
      {status}
    </span>
  );
}
