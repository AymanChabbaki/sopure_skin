/**
 * After a deploy, the hashed JS files of the previous version are gone. A tab opened before the deploy still asks
 * for them when it lazy-loads a page, which fails with "Failed to fetch dynamically imported module". Reloading
 * fetches the new version. Guarded so a real outage cannot cause a reload loop.
 */
const KEY = 'chunk-reload-at';

export const isChunkError = (error) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically imported|Loading chunk|MIME type/i.test(
    String(error?.message || error || ''),
  );

/** Reloads the page once (not again within 10 s). Returns false when it already tried. */
export function reloadForNewVersion() {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(KEY)) || 0;
  } catch {
    /* storage blocked */
  }
  if (Date.now() - last < 10_000) return false;
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage blocked */
  }
  window.location.reload();
  return true;
}
