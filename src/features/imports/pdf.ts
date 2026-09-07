type PdfTextItem = { str: string; transform: number[]; width?: number };

async function pdfDocument(file: File) {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
}

function textLines(items: PdfTextItem[]) {
  const lines = new Map<number, Array<{ x: number; width: number; text: string }>>();
  for (const item of items) {
    const text = item.str.trim();
    if (!text) continue;
    const y = Math.round((item.transform[5] ?? 0) / 2) * 2;
    const line = lines.get(y) ?? [];
    line.push({ x: item.transform[4] ?? 0, width: item.width ?? text.length * 5, text });
    lines.set(y, line);
  }
  return [...lines.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([, cells]) => cells.sort((left, right) => left.x - right.x).map((cell, index, ordered) => {
      if (!index) return cell.text;
      const previous = ordered[index - 1];
      return `${cell.x - (previous.x + previous.width) > 12 ? "\t" : " "}${cell.text}`;
    }).join(""));
}

export async function extractPdfText(file: File, onProgress?: (progress: number, message: string) => void) {
  const pdf = await pdfDocument(file);
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.(Math.round((pageNumber / pdf.numPages) * 55), `Reading PDF page ${pageNumber} of ${pdf.numPages}`);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(textLines(content.items as PdfTextItem[]).join("\n"));
    page.cleanup();
  }
  await pdf.cleanup();
  return pages.join("\n");
}

export async function renderPdfForOcr(file: File, onProgress?: (progress: number, message: string) => void) {
  const pdf = await pdfDocument(file);
  const totalPages = pdf.numPages;
  const pageCount = Math.min(totalPages, 12);
  const images: Blob[] = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    onProgress?.(5 + Math.round((pageNumber / pageCount) * 20), `Preparing scanned page ${pageNumber} of ${pageCount}`);
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.75 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("This browser could not prepare the scanned PDF for OCR.");
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("This browser could not render the scanned PDF.");
    images.push(blob);
    page.cleanup();
  }
  await pdf.cleanup();
  if (totalPages > pageCount) throw new Error("Scanned PDFs are limited to 12 pages per import. Split this file and try again.");
  return images;
}
