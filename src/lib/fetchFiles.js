function resolveUrlMaybeRelative(url, origin) {
  if (!url) return null;
  try {
    // absolute already?
    return new URL(url).toString();
  } catch {
    // relative -> need origin (e.g., http://localhost:3000)
    if (!origin) return null;
    return new URL(url, origin).toString();
  }
}

export async function fetchAsBase64(url, fetchInit = {}) {
  const res = await fetch(url, fetchInit);
  if (!res.ok) throw new Error(`Fetch failed: ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    base64: buf.toString("base64"),
    contentType: res.headers.get("content-type") || undefined,
  };
}

/**
 * files: [{ url, name? }]
 * opts:
 *  - origin: absolute origin to resolve relative URLs (e.g. http://localhost:3000)
 *  - headers: e.g. { cookie: '...' } to pass auth to protected file endpoints
 *  - max: limit number of attachments (default 8)
 *  - maxBytes: drop any file larger than this (default 10MB)
 */
export async function filesToAttachments(files, opts = {}) {
  const { origin, headers = {}, max = 8, maxBytes = 10 * 1024 * 1024 } = opts;
  const safe = (files || []).filter((f) => f?.url).slice(0, max);
  const out = [];

  for (const f of safe) {
    try {
      const abs = resolveUrlMaybeRelative(f.url, origin);
      if (!abs) continue;

      // HEAD first to check size (if server supports it)
      try {
        const head = await fetch(abs, { method: "HEAD", headers });
        const len = head.headers.get("content-length");
        if (len && Number(len) > maxBytes) {
          // skip oversized file
          continue;
        }
      } catch {
        // ignore if HEAD not supported
      }

      const { base64, contentType } = await fetchAsBase64(abs, { headers });
      const filename = f.name || abs.split("/").pop() || "attachment";
      out.push({
        filename,
        content: base64,
        type: contentType, // SendGrid reads this if present
        disposition: "attachment",
      });
    } catch (e) {
      // log and continue with the rest
      console.warn("Attachment fetch failed:", f?.url, e?.message);
    }
  }

  return out;
}
