export const parseDateSafe = (dateStr: string | undefined | null): Date | null => {
  const cleanStr = String(dateStr || "").trim();
  if (!cleanStr || cleanStr === "-" || cleanStr === "TBD" || cleanStr === "null")
    return null;
  const d = new Date(cleanStr + "T00:00:00");
  if (!isNaN(d.getTime())) return d;
  const usParts = cleanStr.split("/");
  if (usParts.length === 3) {
    let year = parseInt(usParts[2]);
    if (usParts[2].length === 2) year += year < 50 ? 2000 : 1900;
    const manualDate = new Date(
      year,
      parseInt(usParts[0]) - 1,
      parseInt(usParts[1])
    );
    return isNaN(manualDate.getTime()) ? null : manualDate;
  }
  return null;
};

export const formatDate = (
  dateStr: string | undefined | null
): string => {
  const d = parseDateSafe(dateStr);
  if (!d) return dateStr || "-";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatDateShort = (
  dateStr: string | undefined | null
): string => {
  const d = parseDateSafe(dateStr);
  if (!d) return dateStr || "-";
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

export const daysUntil = (dateStr: string | undefined | null): number | null => {
  const d = parseDateSafe(dateStr);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const isOverdue = (dateStr: string | undefined | null): boolean => {
  const days = daysUntil(dateStr);
  return days !== null && days < 0;
};

export const toInputDate = (dateStr: string | undefined | null): string => {
  const d = parseDateSafe(dateStr);
  if (!d) return "";
  return d.toISOString().split("T")[0];
};
