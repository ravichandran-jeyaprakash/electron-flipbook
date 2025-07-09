window.electronAPI.onFlipbookOpened(async (event, flipbookFileName) => {
    console.log('Cache info stored for flipbook:', flipbookFileName);
    await storeCacheInfo(flipbookFileName);
    console.log('Cache info stored for flipbook:', flipbookFileName);
  });


// IndexedDB logic in renderer
console.log('Loading renderer.js...');
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

async function storeVideoCacheInfo(videoFileName, cacheTime = new Date().toISOString()) {
    const db = await openDB();
    console.log('store cache inside');
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

window.storeVideoCacheInfo = storeVideoCacheInfo;
window.getCacheInfo = getCacheInfo;

async function storeCacheInfo(zipFileName, cacheTime = new Date().toISOString()) {
  const db = await openDB();
  console.log('storeCacheInfo called with', zipFileName);

  console.log(zipFileName);
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
  console.log(cacheInfo);
  if (cacheInfo) {
   // document.getElementById('cache-info').style.display = 'block';
   // document.getElementById('zip-file').textContent = cacheInfo.zipFileName || 'Unknown';
   // document.getElementById('cache-time').textContent = new Date(cacheInfo.cacheTime).toLocaleString();
   // document.getElementById('last-accessed').textContent = new Date(cacheInfo.lastAccessed).toLocaleString();
  }
});

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




