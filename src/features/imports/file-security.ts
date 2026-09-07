const receiptMimeByExtension: Record<string, string[]> = {
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  pdf: ["application/pdf"],
};

export function fileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
}

export function validateReceiptFile(file: File) {
  const extension = fileExtension(file);
  const allowedMimes = receiptMimeByExtension[extension];
  if (!allowedMimes || !allowedMimes.includes(file.type)) throw new Error("Use a JPG, JPEG, PNG, WEBP, or PDF receipt with a matching file type.");
  if (!file.size) throw new Error("This receipt file is empty.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Receipts must be 10 MB or smaller.");
  return { extension, contentType: file.type };
}

export async function sha256File(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
