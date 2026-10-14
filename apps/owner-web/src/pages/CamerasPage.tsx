import { Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";

export function CamerasPage() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <ModuleShell
      title="Cameras"
      eyebrow="VMS · UniFi-first"
      status="BLOCKED"
      note="Camera management requires an approved VMS gateway (UniFi Protect preferred). Device camera capture below is phone/browser-local only — not a store VMS stream. No face recognition."
    >
      <ModuleWorkspace
        fieldLabel="Zone / incident notes"
        fieldPlaceholder="Paste zone labels; device camera is not Live Wall…"
        scanLabel="Scan label"
      >
        <AiAssistPanel department="cameras" label="Cameras" />
      </ModuleWorkspace>

      <div className="empty-panel">
        <h2>Connection required</h2>
        <p>
          Live Wall and playback stay empty on purpose. Face recognition,
          emotion/demographic inference, and employee productivity scoring are
          forbidden and will not be added.
        </p>
        <ul className="truth-list">
          <li>
            <strong>Gateway:</strong> not configured
          </li>
          <li>
            <strong>Cameras online:</strong> UNKNOWN (not 0)
          </li>
          <li>
            <strong>Face recognition:</strong> never
          </li>
        </ul>
        <p className="demo-tag">CONNECTION REQUIRED · no fake feeds</p>
      </div>
    </ModuleShell>
  );
}
