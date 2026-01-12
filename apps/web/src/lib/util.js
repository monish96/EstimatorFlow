export function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function shortId(id) {
  return id.slice(0, 4) + "…" + id.slice(-3);
}


