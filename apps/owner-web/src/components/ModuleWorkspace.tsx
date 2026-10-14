import { useState, type ReactNode } from "react";
import { useModuleCapture } from "../hooks/useModuleCapture";
import { ModuleToolsBar } from "./ModuleToolsBar";

/**
 * Shared capture/edit workspace reused by every home-tile module.
 * Provides clipboard + device camera/file inputs with honest labeling.
 */
export function ModuleWorkspace({
  fieldLabel,
  fieldPlaceholder,
  defaultValue = "",
  scanLabel,
  showDocument,
  children,
}: {
  fieldLabel: string;
  fieldPlaceholder: string;
  defaultValue?: string;
  scanLabel?: string;
  showDocument?: boolean;
  children?: ReactNode;
}) {
  const [value, setValue] = useState(defaultValue);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  const capture = useModuleCapture({
    value,
    setValue,
    selectionStart,
    selectionEnd,
    setSelection: (start, end) => {
      setSelectionStart(start);
      setSelectionEnd(end);
    },
  });

  return (
    <div className="module-workspace">
      <ModuleToolsBar
        busy={capture.busy}
        lastResult={capture.lastResult}
        onCopy={() => void capture.copy()}
        onCut={() => void capture.cut()}
        onPaste={() => void capture.paste()}
        onScan={() => capture.openScan()}
        onCamera={() => capture.openCamera()}
        onDocument={
          showDocument ? () => capture.openDocument() : undefined
        }
        cameraInputRef={capture.cameraInputRef}
        scanInputRef={capture.scanInputRef}
        docInputRef={capture.docInputRef}
        onCameraFiles={(f) => void capture.onCameraFiles(f)}
        onScanFiles={(f) => void capture.onScanFiles(f)}
        onDocumentFiles={
          showDocument ? (f) => void capture.onDocumentFiles(f) : undefined
        }
        scanLabel={scanLabel}
      />

      <label className="workspace-field">
        <span className="section-label">{fieldLabel}</span>
        <textarea
          value={value}
          placeholder={fieldPlaceholder}
          rows={4}
          onChange={(e) => setValue(e.target.value)}
          onSelect={(e) => {
            const t = e.currentTarget;
            setSelectionStart(t.selectionStart);
            setSelectionEnd(t.selectionEnd);
          }}
        />
      </label>

      {children}
    </div>
  );
}
