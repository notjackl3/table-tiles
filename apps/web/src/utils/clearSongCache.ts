/**
 * Utility to clear cached imported songs from localStorage
 * Useful when you've updated a song's JSON file and want the changes to reflect
 */

/**
 * Clear a specific song from localStorage
 */
export function clearSongFromCache(songId: string): boolean {
  const key = `imported-song-${songId}`;
  const existed = localStorage.getItem(key) !== null;

  if (existed) {
    localStorage.removeItem(key);
    console.log(`✓ Cleared cached song: ${songId}`);
    return true;
  } else {
    console.log(`Song ${songId} not found in cache`);
    return false;
  }
}

/**
 * Clear all imported songs from localStorage
 */
export function clearAllImportedSongs(): number {
  let count = 0;
  const keysToRemove: string[] = [];

  // Find all imported song keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('imported-song-')) {
      keysToRemove.push(key);
    }
  }

  // Remove them
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    count++;
  });

  console.log(`✓ Cleared ${count} imported song(s) from cache`);
  return count;
}

/**
 * List all imported songs in localStorage
 */
export function listCachedSongs(): string[] {
  const songIds: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('imported-song-')) {
      const songId = key.replace('imported-song-', '');
      songIds.push(songId);
    }
  }

  return songIds;
}

// Make functions available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).clearSongCache = clearSongFromCache;
  (window as any).clearAllImportedSongs = clearAllImportedSongs;
  (window as any).listCachedSongs = listCachedSongs;
}
