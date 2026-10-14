import {
  Camera,
  ClipboardPaste,
  Copy,
  Scissors,
  ScanLine,
} from "lucide-react";
import type { RefObject } from "react";
import type { CaptureResult } from "../lib/capture-tools";

type Props = {
  busy?: boolean;
  lastResult: CaptureResult | null;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onScan: () => void;
  onCamera: () => void;
  /** Optional document scan affordance for invoice/expense modules */
  onDocument?: () => void;
  cameraInputRef: RefObject<HTMLInputElement | null>;
  scanInputRef: RefObject<HTMLInputElement | null>;
  docInputRef?: RefObject<HTMLInputElement | null>;
  onCameraFiles: (files: FileList | null) => void;
  onScanFiles: (files: FileList | null) => void;
  onDocumentFiles?: (files: FileList | null) => void;
  scanLabel?: string;
};

export function ModuleToolsBar({
  busy,
  lastResult,
  onCopy,
  onCut,
  onPaste,
  onScan,
  onCamera,
  onDocument,
  cameraInputRef,
  scanInputRef,
  docInputRef,
  onCameraFiles,
  onScanFiles,
  onDocumentFiles,
  scanLabel = "Scan",
}: Props) {
  return (
    <div className="module-tools">
      <p className="section-label">Device tools</p>
      <div className="tools-bar" role="toolbar" aria-label="Capture and edit">
        <button
          type="button"
          className="tool-btn"
          disabled={busy}
          onClick={onCopy}
          title="Copy selection or field"
        >
          <Copy size={18} strokeWidth={2} />
          <span>Copy</span>
        </button>
        <button
          type="button"
          className="tool-btn"
          disabled={busy}
          onClick={onCut}
          title="Cut selection or field"
        >
          <Scissors size={18} strokeWidth={2} />
          <span>Cut</span>
        </button>
        <button
          type="button"
          className="tool-btn"
          disabled={busy}
          onClick={onPaste}
          title="Paste from clipboard"
        >
          <ClipboardPaste size={18} strokeWidth={2} />
          <span>Paste</span>
        </button>
        <button
          type="button"
          className="tool-btn"
          disabled={busy}
          onClick={onScan}
          title="Scan via device camera or file — not a hardware wedge scanner"
        >
          <ScanLine size={18} strokeWidth={2} />
          <span>{scanLabel}</span>
        </button>
        <button
          type="button"
          className="tool-btn"
          disabled={busy}
          onClick={onCamera}
          title="Capture via this device camera — not a VMS stream"
        >
          <Camera size={18} strokeWidth={2} />
          <span>Capture</span>
        </button>
        {onDocument && (
          <button
            type="button"
            className="tool-btn"
            disabled={busy}
            onClick={onDocument}
            title="Attach a local document photo/PDF"
          >
            <ScanLine size={18} strokeWidth={2} />
            <span>Doc</span>
          </button>
        )}
      </div>

      <p className="tools-honesty">
        Clipboard + this device only. Not a certified barcode wedge, POS
        scanner, or VMS camera feed.
      </p>

      {lastResult && (
        <div className="tools-result" role="status">
          <span className="demo-tag">
            {lastResult.source === "unavailable" ? "UNAVAILABLE" : "DEVICE LOCAL"}
          </span>
          <p>{lastResult.note}</p>
          {lastResult.text && lastResult.kind === "clipboard" && (
            <pre className="tools-preview">{lastResult.text.slice(0, 240)}</pre>
          )}
          {lastResult.dataUrl?.startsWith("data:image/") && (
            <img
              className="tools-thumb"
              src={lastResult.dataUrl}
              alt=""
            />
          )}
          {lastResult.fileName && (
            <p className="muted">
              {lastResult.fileName}
              {lastResult.sizeBytes != null
                ? ` · ${Math.round(lastResult.sizeBytes / 1024)} KB`
                : ""}
            </p>
          )}
        </div>
      )}

      {/* Hidden inputs — shared capture surface for every module */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          onCameraFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={scanInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          onScanFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {docInputRef && onDocumentFiles && (
        <input
          ref={docInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            onDocumentFiles(e.target.files);
            e.target.value = "";
          }}
        />
      )}
    </div>
  );
}
