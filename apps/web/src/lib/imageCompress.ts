/**
 * Shrinks a phone photo before upload. A 12 MP camera photo is 3-5 MB; documents stay perfectly legible at
 * 1600 px on the long edge, which brings each file down to a few hundred KB. Falls back to the original file
 * when the browser cannot decode it (for example HEIC) or when shrinking would not make it smaller.
 */
export async function compressImage(file: File, maxEdge = 1600, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.size < 350 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";            // PNGs with transparency would otherwise turn black as JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
