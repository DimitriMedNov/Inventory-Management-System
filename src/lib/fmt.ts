// Helpers de formato compartidos. Sin segundos en horas.
export const fmtDateTime = (v: string | Date | null | undefined) =>
  v
    ? new Date(v).toLocaleString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const fmtDate = (v: string | Date | null | undefined) =>
  v
    ? new Date(v).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
