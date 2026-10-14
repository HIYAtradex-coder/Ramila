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
  | "invoices"
  | "multi-store"
  | "vendors"
  | "orders"
  | "pricing"
  | "approvals"
  | "cash-atm"
  | "attention"
  | "expiry"
  | "price-check";

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
  "multi-store": {
      department: "multi-store",
      title: "Cross-store attention list",
      summary:
        "Propose a portfolio walkthrough. Base seat = 1 store included; extras are +$100/mo MOCK billing — not a Stripe charge or vendor sync claim.",
      checklist: [
        "Confirm Store 1 shows as Included on Home store management",
        "Review MOCK monthly total before adding another seat",
        "Open each store’s full system and spot-check inventory / invoice queues",
        "Hold portfolio sales compare until POS feeds exist",
      ],
      possibleIssues: [
        "Possible uneven invoice backlog across stores — review each site queue",
        "Possible unexpected MOCK seat charge if an extra store was added by mistake — verify plan ledger",
      ],
      honesty:
        "DEMO proposals · plan MOCK · cross-store KPIs UNKNOWN · not vendor-synced · no Stripe",
      requiresHumanApprove: true,
    },
  vendors: {
      department: "vendors",
      title: "Vendor hygiene checklist",
      summary:
        "Suggest directory cleanup before purchasing/invoice work. No EDI or supplier portal is claimed connected.",
      checklist: [
        "Confirm fuel / grocery / lottery / services categories for active store",
        "Match invoice proposal vendor names to directory rows",
        "Capture contact via device tools (local only)",
        "Do not treat UNKNOWN phone/email as empty — fill with human verify",
      ],
      possibleIssues: [
        "Possible duplicate vendor names across stores — merge only after owner review",
        "Possible mismatched category on a grocery vs beverage supplier — human confirm",
      ],
      honesty:
        "DEMO proposals · directory MOCK · invoice names may be live · no vendor portal",
      requiresHumanApprove: true,
    },
  orders: {
      department: "orders",
      title: "Order close checklist",
      summary:
        "Propose steps for vendor POs and pickup holds. Not a marketplace; human approve before inventory/money posts.",
      checklist: [
        "Confirm vendor on PO matches Vendors directory",
        "Age-check notes on customer pickup holds",
        "Receive against invoice proposal — do not auto-post stock",
        "Owner PIN approve on Invoices before eaches move",
      ],
      possibleIssues: [
        "Possible PO without matching invoice — human reconcile before post",
        "Possible pickup hold past pickup window — staff verify, no guilt language",
      ],
      honesty:
        "DEMO proposals · orders MOCK · no DoorDash/Wawa · AI never posts",
      requiresHumanApprove: true,
    },
  pricing: {
      department: "pricing",
      title: "Price publish review",
      summary:
        "Suggest review steps before any price publish. Writes default OFF — no POS/fuel vendor publish from AI.",
      checklist: [
        "Compare proposed item prices to cost from recent invoices (human)",
        "Confirm fuel grade proposals only for fuel-enabled stores",
        "Require owner step-up before publish when connector exists",
        "Keep publish button blocked until certified adapter",
      ],
      possibleIssues: [
        "Possible shelf-tag mismatch if publish skipped — human verify tags",
        "Possible fuel grade mix-up (regular vs midgrade) — owner confirm before any FPC",
      ],
      honesty:
        "DEMO proposals · price book MOCK · writes OFF · no Verifone/Gilbarco FPC",
      requiresHumanApprove: true,
    },
  approvals: {
    department: "approvals",
    title: "Approval queue walkthrough",
    summary:
      "Propose an order to clear human gates. AI never posts inventory or money.",
    checklist: [
      "Review vendor, invoice #, and line eaches before PIN",
      "Clear older proposals first when backlog spans stores",
      "Switch active store before opening Invoices approve",
      "Leave sales/cash approvals UNKNOWN without those feeds",
    ],
    possibleIssues: [
      "Possible duplicate proposal if same invoice scanned twice — API hash guards; still verify",
      "Possible wrong store focus if portfolio queue mixed — confirm store code",
    ],
    honesty: "DEMO proposals · invoice queue may be live · AI never posts",
    requiresHumanApprove: true,
  },
  "cash-atm": {
    department: "cash-atm",
    title: "Cash / ATM custody checklist",
    summary:
      "Suggest dual-control and deposit steps. No bank or ATM vendor totals are invented.",
    checklist: [
      "Photograph deposit bag seal (device camera)",
      "Record bag # and courier name in notes",
      "Require dual control before ATM cassette load in production",
      "Hold bank-confirmed as UNKNOWN until feed exists",
    ],
    possibleIssues: [
      "Possible unmatched deposit if bag photo missing — human follow up",
      "Possible ATM load without second person — policy risk, not guilt claim",
    ],
    honesty: "DEMO proposals · MOCK workpaper · no bank/ATM connector",
    requiresHumanApprove: true,
  },
  attention: {
    department: "attention",
    title: "Attention triage",
    summary:
      "Rank review items with neutral language. Never claim employee fraud from DEMO signals.",
    checklist: [
      "Clear live invoice approvals first",
      "Open Expiry / Cash shells only as workpapers",
      "Defer camera correlation until VMS is connected",
      "Acknowledge DEMO rows separately from live API rows",
    ],
    possibleIssues: [
      "Possible missed scan — needs human review when POS+camera exist",
      "Possible incomplete close if invoices remain unposted",
    ],
    honesty:
      "DEMO proposals · anomaly ≠ guilt · cameras BLOCKED without VMS",
    requiresHumanApprove: true,
  },
  expiry: {
    department: "expiry",
    title: "Expiry / lot review",
    summary:
      "Propose date-code walk order. AI never posts quarantine, disposal, or vendor credits.",
    checklist: [
      "Scan GS1 / date codes with device tools (decode PENDING)",
      "Prioritize dairy, meat, and open packs when ledger exists",
      "Draft vendor credit only after human count confirm",
      "Keep expiring counts UNKNOWN until lot ledger lands",
    ],
    possibleIssues: [
      "Possible missed date code on multi-pack — human verify",
      "Possible credit claim without photo evidence — attach device capture",
    ],
    honesty: "DEMO proposals · lot ledger MISSING · AI never posts stock",
    requiresHumanApprove: true,
  },
  "price-check": {
    department: "price-check",
    title: "Price check coaching",
    summary:
      "Remind that Price Check is read-only. No basket, void, or inventory movement.",
    checklist: [
      "Scan or paste UPC only — do not open a sale",
      "Treat UNKNOWN price as missing connector, not $0.00",
      "Escalate shelf mismatches to Pricing proposals (human approve)",
      "Never publish from Price Check",
    ],
    possibleIssues: [
      "Possible shelf-tag mismatch — human verify; no auto price write",
    ],
    honesty:
      "DEMO proposals · read-only · no POS itemRead claimed · writes OFF",
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
