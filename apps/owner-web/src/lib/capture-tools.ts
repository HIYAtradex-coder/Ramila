/** Shared device-local capture/edit helpers — not hardware scanners or VMS. */

export type CaptureKind = "clipboard" | "barcode" | "document" | "photo";

export type CaptureResult = {
  kind: CaptureKind;
  text?: string;
  fileName?: string;
  mimeType?: string;
  dataUrl?: string;
  sizeBytes?: number;
  source: "clipboard" | "camera" | "file" | "unavailable";
  note: string;
};

export type ClipboardWritePayload = {
  text: string;
};

export async function readClipboardText(): Promise<CaptureResult> {
  if (!navigator.clipboard?.readText) {
    return {
      kind: "clipboard",
      source: "unavailable",
      note: "Clipboard read not available in this browser/context.",
    };
  }
  try {
    const text = await navigator.clipboard.readText();
    return {
      kind: "clipboard",
      text,
      source: "clipboard",
      note: text
        ? "Pasted from device clipboard (local only)."
        : "Clipboard was empty.",
    };
  } catch {
    return {
      kind: "clipboard",
      source: "unavailable",
      note: "Clipboard permission denied or blocked.",
    };
  }
}

export async function writeClipboardText(
  payload: ClipboardWritePayload,
): Promise<CaptureResult> {
  if (!navigator.clipboard?.writeText) {
    return {
      kind: "clipboard",
      source: "unavailable",
      note: "Clipboard write not available in this browser/context.",
    };
  }
  try {
    await navigator.clipboard.writeText(payload.text);
    return {
      kind: "clipboard",
      text: payload.text,
      source: "clipboard",
      note: "Copied to device clipboard (local only).",
    };
  } catch {
    return {
      kind: "clipboard",
      text: payload.text,
      source: "unavailable",
      note: "Clipboard write permission denied or blocked.",
    };
  }
}

export function fileToCaptureResult(
  file: File,
  kind: CaptureKind,
  source: "camera" | "file",
): Promise<CaptureResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        kind,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataUrl: typeof reader.result === "string" ? reader.result : undefined,
        sizeBytes: file.size,
        source,
        note:
          source === "camera"
            ? "Device camera capture (local file). Not a VMS or POS scanner feed."
            : "Local file pick. Not a certified hardware scanner.",
      });
    };
    reader.onerror = () => {
      resolve({
        kind,
        fileName: file.name,
        source: "unavailable",
        note: "Could not read the selected file.",
      });
    };
    if (file.type.startsWith("image/") || file.type === "application/pdf") {
      reader.readAsDataURL(file);
    } else {
      resolve({
        kind,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        source,
        note:
          source === "camera"
            ? "Device camera capture (local file). Not a VMS or POS scanner feed."
            : "Local file pick. Not a certified hardware scanner.",
      });
    }
  });
}

export async function probeCameraPermission(): Promise<
  "granted" | "denied" | "prompt" | "unsupported"
> {
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      if (status.state === "granted") return "granted";
      if (status.state === "denied") return "denied";
      return "prompt";
    }
  } catch {
    /* Permissions API may reject camera name */
  }
  return "prompt";
}
