const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { getFileNameFromUrl, downloadFile } = require('./downloadUtils');
const { deleteFolderRecursive } = require('./fileUtils');
const { unzipAndEncryptFlipbook, prepareDecryptedFlipbookCopy, getFlipbookFolderName } = require('./flipbookManager');
const { downloadAndEncryptVideo, decryptVideo } = require('./videoManager');

// S3 URLs for the flipbook zip and video
const s3ZipUrl = 'https://internal-training-new.s3.us-west-2.amazonaws.com/Code Pixel Book_2_Flipbook.zip';
const videoS3Url = 'https://internal-training-new.s3.us-west-2.amazonaws.com/Code+Pixel_Book+2_Chapter_1.mp4';

// Extract file names from URLs
const zipFileName = getFileNameFromUrl(s3ZipUrl);
const videoFileName = getFileNameFromUrl(videoS3Url);

// Define cache and temp directories

const extractZipTo = path.join(app.getPath('userData'), 'flipbook_cache/original/');
const extractTo = path.join(app.getPath('userData'), 'flipbook_cache');
const decryptedTemp = path.join(os.tmpdir(), 'flipbook_decrypted');

app.setPath('userData', path.join(app.getPath('appData'), 'flipbook-app'));
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');


let mainWindow = null;

/**
 * Create the main Electron window and load the launcher page.
 * Sets up context isolation, disables context menu, and loads index.html.
 */
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      devTools: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.webContents.on('context-menu', (e) => e.preventDefault());
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

// Electron lifecycle events
// -------------------------
// Create the window when the app is ready
app.whenReady().then(createWindow).catch(console.error);

// Clean up decrypted temp files and quit app when all windows are closed
app.on('window-all-closed', () => {
  // deleteDecryptedFiles();
  if (process.platform !== 'darwin') app.quit();
});

// Clean up decrypted temp files before quitting
app.on('before-quit', () => {
  deleteDecryptedFiles();
});

/**
 * Delete the temporary decrypted flipbook folder, if it exists.
 */
function deleteDecryptedFiles() {
  try {
    deleteFolderRecursive(decryptedTemp);
    console.log('Decrypted temp folder deleted.');
  } catch (err) {
    console.error('Error deleting decrypted files:', err);
  }
}

// IPC HANDLERS
// ------------

/**
 * Handle request to open the offline flipbook.
 * Downloads, extracts, encrypts, and prepares the flipbook if not already cached.
 * Sends the flipbook-opened event and loads the flipbook page.
 */

ipcMain.on('open-flipbook', async () => {
  try {
    const flipbookFolder = path.join(extractTo, getFlipbookFolderName(zipFileName));
    if (!fs.existsSync(flipbookFolder)) {
      console.log("downloading the zip");
      const zipPath = path.join(extractZipTo, zipFileName);
      if (!fs.existsSync(zipPath)) {
        if (!fs.existsSync(extractZipTo)) {
          fs.mkdirSync(extractZipTo, { recursive: true });
        }
        await downloadFile(s3ZipUrl, zipPath, (percent) => {
          mainWindow.webContents.send('download-progress', { type: 'flipbook', percent });
        });
      }
      console.log("Extracting the zip");
      await unzipAndEncryptFlipbook(zipPath, extractTo, zipFileName);
      fs.unlinkSync(zipPath);
    } else {
      console.log("flip book already extracted offline");
    }
    prepareDecryptedFlipbookCopy(extractTo, zipFileName, decryptedTemp);
    const storyPath = path.join(decryptedTemp, 'index.html');
    mainWindow.loadFile(path.join(__dirname, 'flip.html')).then(() => {
      mainWindow.webContents.send('set-flipbook-path', `file://${storyPath.replace(/\\/g, '/')}`);
      mainWindow.webContents.send('flipbook-opened', zipFileName);
    });
  } catch (err) {
    console.error("Error in open-flipbook handler:", err.message);
    mainWindow.loadURL('data:text/html,<h1>Error loading flipbook: ' + err.message + '</h1>');
  }
});


/*
ipcMain.on('open-flipbook', async () => {
  const flipbookFolder = path.join(extractTo, getFlipbookFolderName(zipFileName));
  if (!fs.existsSync(flipbookFolder)) {
    console.log("downloading the zip");
    const zipPath = path.join(extractZipTo, zipFileName);
    if (!fs.existsSync(zipPath)) {
      if (!fs.existsSync(extractZipTo)) {
        fs.mkdirSync(extractZipTo, { recursive: true });
      }
      await downloadFile(s3ZipUrl, zipPath, (percent) => {
      // await downloadFile(s3ZipUrl, zipPath);
      mainWindow.webContents.send('download-progress', { type: 'flipbook', percent });
     });

    }
    console.log("Extracting the zip");
    await unzipAndEncryptFlipbook(zipPath, extractTo, zipFileName);
    // Clean up zip file after extraction
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
      console.log('Deleted zip file after extraction:');
    }
  }else{
    console.log("flip book already extracted offline");
  }
  prepareDecryptedFlipbookCopy(extractTo, zipFileName, decryptedTemp);
  mainWindow.webContents.send('flipbook-opened', zipFileName);
  const storyPath = path.join(decryptedTemp, 'index.html');
  if (fs.existsSync(storyPath)) {
    mainWindow.loadFile(path.join(__dirname, 'flip.html')).then(() => {
      mainWindow.webContents.send('set-flipbook-path', `file://${storyPath.replace(/\\/g, '/')}`);
    });
  } else {
    mainWindow.loadURL('data:text/html,<h1>Decrypted story.html not found</h1>');
  }
});

*/

/**
 * Handle request to go back to the launcher (home) page.
 */
ipcMain.on('go-to-launcher', () => {
  if (mainWindow) {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }
});

/**
 * Handle request to download and cache the video.
 * Downloads and encrypts the video if not already cached, then loads the video page.
 */


ipcMain.on('download-video', async () => {
  const cacheVideoDir = extractTo;
  const cacheVideoPath = path.join(cacheVideoDir, videoFileName + '.enc');
  const tempVideoPath = path.join(os.tmpdir(), videoFileName);

  if (!fs.existsSync(cacheVideoDir)) {
    fs.mkdirSync(cacheVideoDir, { recursive: true });
  }

  try {
    await downloadAndEncryptVideo(videoS3Url, cacheVideoPath, tempVideoPath, (percent) => {
      mainWindow.webContents.send('download-progress', { type: 'video', percent });
    });

    mainWindow.loadFile(path.join(__dirname, 'video.html')).then(() => {
      mainWindow.webContents.send('set-video-path', cacheVideoPath);
      mainWindow.webContents.send('video-opened', videoFileName);
    });
  } catch (error) {
    console.error("Error downloading video:", error.message);
    mainWindow.webContents.send('download-failed', error.message);
  }
});

/*
ipcMain.on('download-video', async () => {
  const cacheVideoDir = extractTo;
  const cacheVideoPath = path.join(cacheVideoDir, videoFileName + '.enc');
  const tempVideoPath = path.join(os.tmpdir(), videoFileName);
  if (!fs.existsSync(cacheVideoDir)) {
    fs.mkdirSync(cacheVideoDir, { recursive: true });
  }

  await downloadAndEncryptVideo(videoS3Url, cacheVideoPath, tempVideoPath, (percent) => {
    mainWindow.webContents.send('download-progress', { type: 'video', percent });
  });

  mainWindow.loadFile(path.join(__dirname, 'video.html')).then(() => {
    mainWindow.webContents.send('set-video-path', cacheVideoPath);
    mainWindow.webContents.send('video-opened', videoFileName);
  });
  
});
*/

/**
 * Handle request from renderer to decrypt the video for playback.
 * Returns the path to the temporary decrypted video file.
 */
ipcMain.handle('decrypt-video', async (event, encPath) => {
  return await decryptVideo(encPath);
});

ipcMain.on('clear-cache', (event, type) => {
  let targetDir = null;
  if (type === 'flipbook') {
    targetDir = extractTo; // flipbook_cache directory
  } else if (type === 'video') {
    // Assuming video is cached in flipbook_cache as well, or adjust path as needed
    targetDir = path.join(app.getPath('userData'), 'flipbook_cache');
    // If video is in a different directory, set it here
  }
  if (targetDir && fs.existsSync(targetDir)) {
    deleteFolderRecursive(targetDir);
    fs.mkdirSync(targetDir, { recursive: true }); // Recreate empty cache folder
    if (mainWindow) {
      // mainWindow.webContents.send('download-progress', { type, percent: 0 });
    }
  }
  mainWindow.webContents.send('cache-cleared', type);

  
});