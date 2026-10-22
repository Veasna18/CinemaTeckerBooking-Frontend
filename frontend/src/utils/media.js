const API = import.meta.env.VITE_API_URL || "";

// Older records stored /CinemaTaket/uploads/ or /CinemaTaket/public/uploads/.
// Uploads now live in the backend folder, so rewrite those to the new location.
export function normalizeUploadPath(value) {
  return String(value || "").replace(
    /\/CinemaTaket\/(?:public\/)?uploads\//,
    "/CinemaTaket/backend/public/uploads/"
  );
}

export function mediaUrl(value, fallback = "") {
  const raw = normalizeUploadPath(String(value || "").trim());
  if (!raw) return fallback;
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  const normalized = raw.replace(/\\/g, "/");

  if (normalized.startsWith("/")) {
    try {
      return new URL(normalized, API || window.location.origin).toString();
    } catch {
      return normalized;
    }
  }

  return normalized;
}
