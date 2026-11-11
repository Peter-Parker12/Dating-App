/** Uploads a file with progress reporting (fetch cannot report upload progress). Resolves with the HTTP status and error code. */
export function uploadFile(url: string, blob: Blob, filename: string, onProgress: (pct: number) => void): Promise<{ ok: boolean; status: number; code?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100))); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve({ ok: true, status: xhr.status });
      let code = "error";
      try { code = (JSON.parse(xhr.responseText) as { error?: string }).error ?? code; } catch {}
      resolve({ ok: false, status: xhr.status, code });
    };
    xhr.onerror = () => resolve({ ok: false, status: 0, code: "network" });
    const fd = new FormData();
    fd.append("file", blob, filename);
    xhr.send(fd);
  });
}
