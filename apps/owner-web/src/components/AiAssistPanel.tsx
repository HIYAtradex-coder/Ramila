import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  proposeForDepartment,
  type AiDepartment,
  type AiProposal,
} from "../lib/ai-assist";

export function AiAssistPanel({
  department,
  label,
}: {
  department: AiDepartment;
  label: string;
}) {
  const [proposal, setProposal] = useState<AiProposal | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  function run() {
    setAcknowledged(false);
    setProposal(proposeForDepartment(department));
  }

  return (
    <section className="ai-panel">
      <div className="ai-panel-head">
        <div>
          <p className="section-label">AI assist · {label}</p>
          <p className="muted">
            Proposal helper only — never posts inventory, money, payroll, or
            filings.
          </p>
        </div>
        <button type="button" className="tool-btn tool-btn--ai" onClick={run}>
          <Sparkles size={18} strokeWidth={2} />
          <span>Suggest</span>
        </button>
      </div>

      {proposal && (
        <div className="ai-proposal">
          <div className="ai-proposal-title">
            <h3>{proposal.title}</h3>
            <span className="demo-tag">DEMO · PROPOSAL</span>
          </div>
          <p>{proposal.summary}</p>
          <p className="ai-honesty">{proposal.honesty}</p>

          <h4>Checklist</h4>
          <ul className="truth-list">
            {proposal.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h4>Needs attention (neutral)</h4>
          <ul className="truth-list">
            {proposal.possibleIssues.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          {proposal.requiresHumanApprove && (
            <label className="ai-ack">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>
                I understand this is a suggestion only. Human approve is
                required before any inventory, payroll, or money post.
              </span>
            </label>
          )}
          <p className="muted">
            {acknowledged
              ? "Acknowledged — no automatic post occurred."
              : "No post action available from AI."}
          </p>
        </div>
      )}
    </section>
  );
}
