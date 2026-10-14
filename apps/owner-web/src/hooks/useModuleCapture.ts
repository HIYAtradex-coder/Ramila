import { useCallback, useRef, useState } from "react";
import {
  fileToCaptureResult,
  readClipboardText,
  writeClipboardText,
  type CaptureResult,
} from "../lib/capture-tools";

export type ModuleCaptureField = {
  /** Current editable field text for copy/cut/paste targets */
  value: string;
  setValue: (next: string) => void;
  /** Optional selection range; when absent, operate on full value */
  selectionStart?: number;
  selectionEnd?: number;
  setSelection?: (start: number, end: number) => void;
};

export function useModuleCapture(field: ModuleCaptureField) {
  const [lastResult, setLastResult] = useState<CaptureResult | null>(null);
  const [busy, setBusy] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  const applyResult = useCallback((result: CaptureResult) => {
    setLastResult(result);
    return result;
  }, []);

  const copy = useCallback(async () => {
    setBusy(true);
    const { value, selectionStart, selectionEnd } = field;
    const start = selectionStart ?? 0;
    const end = selectionEnd ?? value.length;
    const text =
      start !== end ? value.slice(start, end) : value;
    const result = await writeClipboardText({ text });
    setBusy(false);
    return applyResult(result);
  }, [field, applyResult]);

  const cut = useCallback(async () => {
    setBusy(true);
    const { value, setValue, selectionStart, selectionEnd, setSelection } =
      field;
    const start = selectionStart ?? 0;
    const end = selectionEnd ?? value.length;
    const text = start !== end ? value.slice(start, end) : value;
    const result = await writeClipboardText({ text });
    if (result.source === "clipboard") {
      const next =
        start !== end
          ? value.slice(0, start) + value.slice(end)
          : "";
      setValue(next);
      setSelection?.(start, start);
      applyResult({
        ...result,
        note: "Cut to device clipboard (local only).",
      });
    } else {
      applyResult(result);
    }
    setBusy(false);
    return result;
  }, [field, applyResult]);

  const paste = useCallback(async () => {
    setBusy(true);
    const result = await readClipboardText();
    if (result.source === "clipboard" && result.text != null) {
      const { value, setValue, selectionStart, selectionEnd, setSelection } =
        field;
      const start = selectionStart ?? value.length;
      const end = selectionEnd ?? value.length;
      const next = value.slice(0, start) + result.text + value.slice(end);
      setValue(next);
      const caret = start + result.text.length;
      setSelection?.(caret, caret);
    }
    setBusy(false);
    return applyResult(result);
  }, [field, applyResult]);

  const openCamera = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const openScan = useCallback(() => {
    // Prefer camera for barcode-ish capture; fall back to file picker.
    scanInputRef.current?.click();
  }, []);

  const openDocument = useCallback(() => {
    docInputRef.current?.click();
  }, []);

  const onCameraFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return null;
      setBusy(true);
      const result = await fileToCaptureResult(file, "photo", "camera");
      if (result.dataUrl || result.fileName) {
        const stamp = `[photo:${result.fileName ?? "capture"}]`;
        field.setValue(
          field.value ? `${field.value.trim()}\n${stamp}` : stamp,
        );
      }
      setBusy(false);
      return applyResult(result);
    },
    [field, applyResult],
  );

  const onScanFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return null;
      setBusy(true);
      const result = await fileToCaptureResult(file, "barcode", "file");
      // Device-local only — no claim of decoded barcode hardware.
      const stamp = `[scan:${result.fileName ?? "image"} · decode PENDING]`;
      field.setValue(field.value ? `${field.value.trim()}\n${stamp}` : stamp);
      setBusy(false);
      return applyResult(result);
    },
    [field, applyResult],
  );

  const onDocumentFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return null;
      setBusy(true);
      const result = await fileToCaptureResult(file, "document", "file");
      const stamp = `[doc:${result.fileName ?? "document"}]`;
      field.setValue(field.value ? `${field.value.trim()}\n${stamp}` : stamp);
      setBusy(false);
      return applyResult(result);
    },
    [field, applyResult],
  );

  return {
    busy,
    lastResult,
    clearResult: () => setLastResult(null),
    copy,
    cut,
    paste,
    openCamera,
    openScan,
    openDocument,
    cameraInputRef,
    scanInputRef,
    docInputRef,
    onCameraFiles,
    onScanFiles,
    onDocumentFiles,
  };
}
