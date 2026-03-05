import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  Active: "bg-[#e8eaef] text-[#2e3a50] dark:bg-[#2e3a50]/30 dark:text-[#a8b4c8]",
  "Active Priority":
    "bg-[#f3e0d8] text-[#8b4a3a] dark:bg-[#8b4a3a]/20 dark:text-[#d4a090] animate-pulse",
  Closed: "bg-[#eae8e5] text-[#7a7570] dark:bg-[#7a7570]/15 dark:text-[#b0aaa5]",
  Construction:
    "bg-[#e6ece3] text-[#4a6340] dark:bg-[#4a6340]/20 dark:text-[#96b088]",
  "On Hold":
    "bg-[#f0e9dd] text-[#7a6540] dark:bg-[#7a6540]/20 dark:text-[#c4a878]",
  Proposal:
    "bg-[#ede6e0] text-[#6b5545] dark:bg-[#6b5545]/20 dark:text-[#bfa08a]",
  "CO Issued":
    "bg-[#e3e8ed] text-[#4a5a6a] dark:bg-[#4a5a6a]/20 dark:text-[#8fa5b8]",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-transparent",
        statusStyles[status] || "bg-[#eae8e5] text-[#7a7570] dark:bg-[#7a7570]/15 dark:text-[#b0aaa5]"
      )}
      data-testid={`badge-status-${status.toLowerCase().replace(/\s/g, "-")}`}
    >
      {status}
    </span>
  );
}

const appStatusStyles: Record<string, string> = {
  "Not Started": "bg-[#eae8e5] text-[#7a7570] dark:bg-[#7a7570]/15 dark:text-[#b0aaa5]",
  "In Preparation": "bg-[#e3e8ed] text-[#3d5068] dark:bg-[#3d5068]/20 dark:text-[#8fa5b8]",
  "Under Agency Review": "bg-[#f0e9dd] text-[#7a6540] dark:bg-[#7a6540]/20 dark:text-[#c4a878]",
  "Comments Received": "bg-[#f0e4d6] text-[#7a5835] dark:bg-[#7a5835]/20 dark:text-[#c4917a]",
  "Resubmittal Under Review": "bg-[#e3e8ed] text-[#4a5a6a] dark:bg-[#4a5a6a]/20 dark:text-[#8fa5b8]",
  "Fees Posted - Unpaid": "bg-[#f3e0d8] text-[#8b4a3a] dark:bg-[#8b4a3a]/20 dark:text-[#d4a090]",
  "Fees Posted - Paid": "bg-[#e6ece3] text-[#4a6340] dark:bg-[#4a6340]/20 dark:text-[#96b088]",
  Approved: "bg-[#e6ece3] text-[#4a6340] dark:bg-[#4a6340]/20 dark:text-[#96b088]",
  Denied: "bg-[#f3e0d8] text-[#8b3a3a] dark:bg-[#8b3a3a]/20 dark:text-[#d4a090]",
  Withdrawn: "bg-[#eae8e5] text-[#7a7570] dark:bg-[#7a7570]/15 dark:text-[#b0aaa5]",
  Expired: "bg-[#f0ddd8] text-[#8b4a3a] dark:bg-[#8b4a3a]/20 dark:text-[#d4a090]",
};

export function AppStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground text-xs">-</span>;
  return (
    <span
      className={cn(
        "inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
        appStatusStyles[status] || "bg-[#eae8e5] text-[#7a7570] dark:bg-[#7a7570]/15 dark:text-[#b0aaa5]"
      )}
    >
      {status}
    </span>
  );
}
