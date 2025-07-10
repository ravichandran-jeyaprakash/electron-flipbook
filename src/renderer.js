window.electronAPI.onFlipbookOpened(async (event, flipbookFileName) => {
    // Store cache info in IndexedDB when the flipbook is opened
   //  console.log('Cache info stored for flipbook:', flipbookFileName);
    await storeCacheInfo(flipbookFileName);
     console.log('Cache info stored for flipbook:');
  });

  window.electronAPI.onVideoOpened(async (event, videoFileName) => {
    // Store cache info in IndexedDB when the flipbook is opened
    await storeVideoCacheInfo(videoFileName);
     console.log('Cache info stored for video:');
  });
  

// IndexedDB logic in renderer

/**
 * Opens (or creates) the IndexedDB database for flipbook/video cache info.
 * @returns {Promise<IDBDatabase>} The opened database instance.
 */
function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('FlipbookCacheDB', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('flipbookCache')) {
          db.createObjectStore('flipbookCache', { keyPath: 'id' });
        }
      };
    });
  }

/**
 * Clears all cache info from the IndexedDB database.
 * @returns {Promise<void>}
 */
async function clearCacheFromDB() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('flipbookCache', 'readwrite');
      const store = tx.objectStore('flipbookCache');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  
/**
 * Retrieves cache info for a given id from IndexedDB.
 * @param {string} id - The cache entry id ('current_flipbook' or 'current_video').
 * @returns {Promise<Object|null>} The cache info object or null if not found.
 */
async function getCacheInfo(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('flipbookCache', 'readonly');
      const store = tx.objectStore('flipbookCache');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  
/**
 * Clears all cache info from IndexedDB (alias for clearCacheFromDB).
 * @returns {Promise<void>}
 */
async function clearCache() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('flipbookCache', 'readwrite');
      const store = tx.objectStore('flipbookCache');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

/**
 * Stores video cache info in IndexedDB under 'current_video'.
 * @param {string} videoFileName - The video file name.
 * @param {string} [cacheTime] - The cache time (ISO string, defaults to now).
 * @returns {Promise<Object>} The stored cache info object.
 */
async function storeVideoCacheInfo(videoFileName, cacheTime = new Date().toISOString()) {
  console.log('cached');  
  const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('flipbookCache', 'readwrite');
      const store = tx.objectStore('flipbookCache');
      const cacheInfo = {
        id: 'current_video',
        videoFileName: videoFileName,
        cacheTime: cacheTime,
        lastAccessed: new Date().toISOString()
      };
      const req = store.put(cacheInfo);
      req.onsuccess = () => resolve(cacheInfo);
      req.onerror = () => reject(req.error);
    });
}

// Expose cache info functions to window for use in other scripts
window.storeVideoCacheInfo = storeVideoCacheInfo;
window.getCacheInfo = getCacheInfo;

/**
 * Stores flipbook cache info in IndexedDB under 'current_flipbook'.
 * @param {string} zipFileName - The flipbook zip file name.
 * @param {string} [cacheTime] - The cache time (ISO string, defaults to now).
 * @returns {Promise<Object>} The stored cache info object.
 */
async function storeCacheInfo(zipFileName, cacheTime = new Date().toISOString()) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('flipbookCache', 'readwrite');
    const store = tx.objectStore('flipbookCache');
    const cacheInfo = {
      id: 'current_flipbook',
      zipFileName: zipFileName,
      cacheTime: cacheTime,
      lastAccessed: new Date().toISOString()
    };
    const req = store.put(cacheInfo);
    req.onsuccess = () => resolve(cacheInfo);
    req.onerror = () => reject(req.error);
  });
}

// UI logic for cache info
window.addEventListener('DOMContentLoaded', async () => {
  // For demo: store cache info if not present
  let cacheInfo = await getCacheInfo('current_flipbook');
  if (!cacheInfo) {
    // await storeCacheInfo('Code Pixel Book_2_Flipbook.zip');
    // cacheInfo = await getCacheInfo('current_flipbook');
  }
  if (cacheInfo) {
   // document.getElementById('cache-info').style.display = 'block';
   // document.getElementById('zip-file').textContent = cacheInfo.zipFileName || 'Unknown';
   // document.getElementById('cache-time').textContent = new Date(cacheInfo.cacheTime).toLocaleString();
   // document.getElementById('last-accessed').textContent = new Date(cacheInfo.lastAccessed).toLocaleString();
  }
});

// Attach clear cache button event handler if present
/**
 * Handles the clear cache button click event.
 * Prompts the user for confirmation, clears the cache, and updates the UI.
 */
document.addEventListener('DOMContentLoaded', () => {
    // document.getElementById('clear-cache-btn').addEventListener('click', handleClearCache);
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', handleClearCache);
    }
  });
  
async function handleClearCache() {
    if (confirm('Are you sure you want to clear the cache? This will require re-extracting the flipbook next time.')) {
      try {
        await clearCacheFromDB();
        alert('Cache cleared successfully!');
        document.getElementById('cache-info').style.display = 'none';
      } catch (error) {
        console.error('Failed to clear cache:', error);
        alert('Failed to clear cache');
      }
    }
  }

  window.electronAPI.onDownloadProgress((event, { type, percent }) => {
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');
    const progressLabel = document.getElementById('progress-label');
  
    // Show the progress bar
    progressContainer.style.display = 'flex';
    progressBar.style.width = percent + '%';
    progressPercent.textContent = percent + '%';
  
    // Set label
    if (type === 'flipbook') {
      progressLabel.textContent = 'Downloading Flipbook...';
    } else if (type === 'video') {
      progressLabel.textContent = 'Downloading Video...';
    }
  
    // Hide when done
    if (percent >= 100) {
      setTimeout(() => {
        progressContainer.style.display = 'none';
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';
      }, 800); // short delay for user to see 100%
    }
  });



