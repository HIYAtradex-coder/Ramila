/** Read a File as raw base64 (no data: prefix). Device-local only. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export function mimeAllowedForInvoice(mime: string): boolean {
  return [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "application/pdf",
  ].includes(mime);
}

export function mimeAllowedForBank(mime: string): boolean {
  return mimeAllowedForInvoice(mime);
}
