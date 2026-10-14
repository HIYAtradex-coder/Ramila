/**
 * Shared AI proposal helpers — suggestion-only.
 * Never posts inventory, money, payroll, tax, or lottery filings.
 */

export type AiDepartment =
  | "pos"
  | "reports"
  | "lottery"
  | "sales-tax"
  | "employees"
  | "cameras"
  | "expenses"
  | "inventory"
  | "invoices";

export type AiProposal = {
  id: string;
  department: AiDepartment;
  title: string;
  summary: string;
  checklist: string[];
  possibleIssues: string[];
  honesty: string;
  requiresHumanApprove: boolean;
  demo: true;
};

const PROPOSALS: Record<AiDepartment, Omit<AiProposal, "id" | "demo">> = {
  pos:
    {
      department: "pos",
      title: "Shift open checklist",
      summary:
        "Propose a c-store / fuel open checklist. No register connector is claimed — treat as coaching only.",
      checklist: [
        "Confirm safe drop envelope labeled for shift",
        "Verify lottery packs present (count UNKNOWN until lottery feed)",
        "Age-restricted shelf facing check",
        "Pump island walkaround for spill / out-of-order signs",
      ],
      possibleIssues: [
        "Possible missed age-check training refresh on weekend crew",
        "Possible register tender mismatch if prior shift closed without Z-tape — UNKNOWN until POS feed",
      ],
      honesty: "DEMO proposals · POS vendor not connected",
      requiresHumanApprove: true,
    },
  reports: {
    department: "reports",
    title: "Daily close attention list",
    summary:
      "Summarize what an owner should review before leaving. Sales KPIs stay UNKNOWN without POS.",
    checklist: [
      "Review invoice proposals awaiting human post",
      "Spot-check on-hand eaches for top movers",
      "Confirm cash/ATM workpaper owner still needs to enter (not auto)",
      "Note lottery settle workpaper status",
    ],
    possibleIssues: [
      "Possible incomplete close if invoices remain unposted",
      "Possible inventory drift if counts were skipped — needs human count",
    ],
    honesty: "DEMO proposals · only inventory/invoice counts are live from pilot API",
    requiresHumanApprove: true,
  },
  lottery: {
    department: "lottery",
    title: "Lottery settle reminder",
    summary:
      "Suggest settle steps. Does not activate packs or file with the state.",
    checklist: [
      "Photograph activated pack bins (device camera)",
      "Reconcile settle sheet vs terminal (manual)",
      "Flag returns before courier pickup",
    ],
    possibleIssues: [
      "Possible pack activation gap vs settle — UNKNOWN without terminal feed",
    ],
    honesty: "DEMO proposals · no lottery terminal connected · not a filing",
    requiresHumanApprove: true,
  },
  "sales-tax": {
    department: "sales-tax",
    title: "Monthly tax workpaper outline",
    summary:
      "Outline categories for a monthly sales-tax workpaper. Not a prepared return.",
    checklist: [
      "Separate fuel vs inside taxable (when POS exists)",
      "Mark lottery as carve-out / non-taxable per jurisdiction rules (owner verifies)",
      "Hold until posted sales facts exist",
    ],
    possibleIssues: [
      "Possible under-collection if exempt mis-tagged — needs human review of rate book",
    ],
    honesty: "DEMO proposals · not a tax filing · amounts UNKNOWN",
    requiresHumanApprove: true,
  },
  employees: {
    department: "employees",
    title: "Onboarding & schedule assist",
    summary:
      "Propose onboarding steps and department coverage. Payroll figures stay MOCK until a payroll connector exists.",
    checklist: [
      "Create store-scoped membership (owner confirms role)",
      "Assign departments: POS, Inventory, Lottery, Cameras as needed",
      "Collect W-4 / I-9 offline — HIYA does not e-file",
      "Schedule first two weeks against store hours",
    ],
    possibleIssues: [
      "Possible over-scoped access if role set to owner by mistake — verify membership",
      "Possible missing coverage on overnight if schedule gaps exist",
    ],
    honesty: "DEMO proposals · no ADP/Gusto connected · bank/tax filings not live",
    requiresHumanApprove: true,
  },
  cameras: {
    department: "cameras",
    title: "Camera readiness checklist",
    summary:
      "Gateway-required checklist. No live streams or face recognition.",
    checklist: [
      "Confirm UniFi Protect (or approved VMS) gateway URL with owner",
      "Map cameras to zones: register, sales floor, fuel island, back room",
      "Enable view-session audit before any live wall use",
    ],
    possibleIssues: [
      "Possible blind spot at register if no camera mapped — UNKNOWN until VMS",
    ],
    honesty: "DEMO proposals · CONNECTION REQUIRED · no face recognition",
    requiresHumanApprove: true,
  },
  expenses: {
    department: "expenses",
    title: "Expense categorize suggestions",
    summary:
      "Suggest categories for manual expense notes. No bank/card feed.",
    checklist: [
      "Utilities / fuel load / store supplies / repairs",
      "Attach device photo of receipt (local capture)",
      "Owner confirms before any books export",
    ],
    possibleIssues: [
      "Possible duplicate entry if same receipt photographed twice — human dedupe",
    ],
    honesty: "DEMO proposals · no bank/card feed connected",
    requiresHumanApprove: true,
  },
  inventory: {
    department: "inventory",
    title: "Count priority suggestions",
    summary:
      "Propose which SKUs to count first. AI never posts stock — counts need human confirm.",
    checklist: [
      "Count top movers and age-restricted first",
      "Scan barcodes with device camera (decode PENDING)",
      "Submit count as proposal only until approved workflow exists",
    ],
    possibleIssues: [
      "Possible missed scan on multi-pack UPCs — human verify eaches",
      "Possible variance after invoice post — review movements",
    ],
    honesty: "DEMO proposals · on-hand read is live · AI never posts inventory",
    requiresHumanApprove: true,
  },
  invoices: {
    department: "invoices",
    title: "Invoice review assist",
    summary:
      "Help review proposals before PIN approve. AI never posts inventory.",
    checklist: [
      "Check vendor, invoice #, and line quantities",
      "Confirm unit costs look plausible",
      "Human enters approval PIN to post — AI cannot",
    ],
    possibleIssues: [
      "Possible duplicate invoice if content hash collides — API guards; still verify",
      "Possible wrong SKU match on OCR later — needs review confidence",
    ],
    honesty: "DEMO proposals · propose→approve path is live · AI never posts",
    requiresHumanApprove: true,
  },
};

export function proposeForDepartment(department: AiDepartment): AiProposal {
  const base = PROPOSALS[department];
  return {
    ...base,
    id: `ai-${department}-${Date.now()}`,
    demo: true,
  };
}
