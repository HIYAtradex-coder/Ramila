type Status = "WORKING" | "PARTIAL" | "MOCK" | "MISSING" | "BLOCKED";

const LABELS: Record<Status, string> = {
  WORKING: "LIVE",
  PARTIAL: "PARTIAL",
  MOCK: "DEMO DATA",
  MISSING: "NOT WIRED",
  BLOCKED: "CONNECTION REQUIRED",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      {LABELS[status]}
    </span>
  );
}
