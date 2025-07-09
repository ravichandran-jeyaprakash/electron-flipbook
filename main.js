const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const extract = require('extract-zip');
const crypto = require('crypto');
const { ipcMain } = require('electron');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const https = require('https');

const s3ZipUrl = 'https://internal-training-new.s3.us-west-2.amazonaws.com/Code+Pixel+Book_2_Flipbook.zip';

const zipFile = path.join(__dirname, 'data/Code Pixel Book_2_Flipbook.zip');
const extractZipTo = path.join(app.getPath('userData'), 'flipbook_cache/original/');

const destination = path.join(__dirname, 'data');
const extractTo = path.join(app.getPath('userData'), 'flipbook_cache');
const decryptedTemp = path.join(os.tmpdir(), 'flipbook_decrypted');
// Strong, randomly generated password and salt for AES-256 encryption
const password = 'v9J!2k@8zQ#4pL6wT$1eX7bC5nR0sF3h'; // 32 chars, mixed case, numbers, symbols
const salt = 'S8d$2mN!4vB7xQ1z'; // 16 chars, mixed case, numbers, symbols

const key = crypto.scryptSync(password, salt, 32);


async function downloadZip(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ZIP: ${res.statusText}`);
  // Use streamPipeline to pipe the response to the file
  await streamPipeline(res.body, fs.createWriteStream(extractZipTo));
  console.log('ZIP downloaded to:', extractZipTo);
}

// Encrypt a file and replace it with .enc version
function encryptFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);
    output.write(iv); // prepend IV
    input.pipe(cipher).pipe(output);
    output.on('finish', resolve);
    output.on('error', reject);
  });
}



// Decrypt a .enc file and write to destination
function decryptFile(encPath, outPath) {
  const data = fs.readFileSync(encPath);
  const iv = data.slice(0, 16);
  const encrypted = data.slice(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  // Ensure the output directory exists
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, decrypted);
}

// Recursively encrypt all .js files and replace with .enc
async function encryptJSFiles(rootDir) {
  const files = fs.readdirSync(rootDir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(rootDir, file.name);

    if (file.isDirectory()) {
      await encryptJSFiles(fullPath);
    } else if (file.name.endsWith('.js')) {
      const encPath = fullPath + '.enc';
      if (!fs.existsSync(encPath)) {
        await encryptFile(fullPath, encPath);
        fs.unlinkSync(fullPath); // remove original JS
      }
    }
  }
}

// Recursively decrypt all .js.enc files to a temp folder as .js
// Decrypts all .js.enc files in the given source directory (encRoot) and writes the decrypted .js files to the output directory (outputRoot). Non-encrypted files are copied as-is.
function decryptJSFiles(encRoot, outputRoot) {
  const files = fs.readdirSync(encRoot, { withFileTypes: true });

  for (const file of files) {
    const encFullPath = path.join(encRoot, file.name);
    const outputPath = path.join(outputRoot, file.name.replace(/\.enc$/, ''));

    if (file.isDirectory()) {
      fs.mkdirSync(outputPath, { recursive: true });
      decryptJSFiles(encFullPath, outputPath);
    } else if (file.name.endsWith('.js.enc')) {
      const target = outputPath;
      const targetDir = path.dirname(target);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      decryptFile(encFullPath, target);
    } else {
      // copy non-encrypted files
      const target = path.join(outputRoot, file.name);
      fs.copyFileSync(encFullPath, target);
    }
  }
}

// Unzip and encrypt JS files
// Extracts the flipbook zip file if not already extracted, then encrypts all .js files in the extracted directory.
async function unzipAndEncrypt() {
  const storyPath = path.join(extractTo, 'Code Pixel Book_2_Flipbook', 'index.html');
  console.log(storyPath);
  if (!fs.existsSync(storyPath)) {
    console.log('Extracting Flipbook...');
    await extract(extractZipTo, { dir: extractTo });

    // Delete the zip file after extraction
    if (fs.existsSync(extractZipTo)) {
      fs.rmSync(extractZipTo, { recursive: true, force: true });
      console.log('Deleted extracted folder after extraction:', extractZipTo);
    }
    console.log('Encrypting .js files...');
    await encryptJSFiles(path.join(extractTo, 'Code Pixel Book_2_Flipbook'));
  } else {
    console.log('Flipbook already extracted.');
  }
  

}

// Create temp decrypted flipbook
// Prepares a temporary folder containing decrypted .js files and copies of all other files for the flipbook to be loaded by Electron.
function prepareDecryptedCopy() {
  const srcRoot = path.join(extractTo, 'Code Pixel Book_2_Flipbook');
  const targetRoot = decryptedTemp;

  if (fs.existsSync(targetRoot)) fs.rmSync(targetRoot, { recursive: true });
  fs.mkdirSync(targetRoot, { recursive: true });

  // Decrypt JS files and copy other files
  decryptJSFiles(srcRoot, targetRoot);
}

let mainWindow = null;

// Create Electron window and load the launcher page
// Sets up the Electron BrowserWindow, loads index.html (launcher), and disables context menu and dev tools.
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
        contextIsolation: true,
        devTools: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js'), // for IPC if needed
     }
  });

  mainWindow.webContents.on('context-menu', (e) => e.preventDefault());
 
  
  // Load the launcher HTML page
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

// Electron lifecycle
// Handles Electron app events: creates the window on ready, deletes decrypted files on close/quit.
app.whenReady().then(createWindow).catch(console.error);
app.on('window-all-closed', () => {
  deleteDecryptedFiles();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  deleteDecryptedFiles();
});

// Listen for IPC event from renderer to open the flipbook in the same window

/*
ipcMain.on('open-flipbook', async () => {
  await unzipAndEncrypt();
  prepareDecryptedCopy();
  const storyPath = path.join(decryptedTemp, 'index.html');
  if (fs.existsSync(storyPath)) {
    mainWindow.loadFile(storyPath);
    // Wait for the flipbook to finish loading, then send the event
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('flipbook-opened event sent');
      mainWindow.webContents.send('flipbook-opened', 'Code Pixel Book_2_Flipbook.zip');
    });
  } else {
    mainWindow.loadURL('data:text/html,<h1>Decrypted story.html not found</h1>');
  }
});*/


ipcMain.on('open-flipbook', async () => {
  // Only download if the zip file does not exist
  //  console.log(extractTo);
  if (!fs.existsSync(path.join(extractTo, 'Code Pixel Book_2_Flipbook'))) {
    await downloadZip(s3ZipUrl);
  } else {
    console.log('ZIP file already exists, skipping download.');
  }
  await unzipAndEncrypt();
  prepareDecryptedCopy();

  // Send the event BEFORE navigation (while index.html is still loaded)
  mainWindow.webContents.send('flipbook-opened', 'Code Pixel Book_2_Flipbook.zip');

  const storyPath = path.join(decryptedTemp, 'index.html');
  if (fs.existsSync(storyPath)) {
    mainWindow.loadFile(path.join(__dirname, 'flip.html')).then(() => {
      mainWindow.webContents.send('set-flipbook-path', `file://${storyPath.replace(/\\/g, '/')}`);
    });
  } else {
    mainWindow.loadURL('data:text/html,<h1>Decrypted story.html not found</h1>');
  }
});


// Listen for IPC event from renderer to go back to the main page
ipcMain.on('go-to-launcher', () => {
  if (mainWindow) {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }
});

// Listen for IPC event from renderer to download and cache the video
/*
ipcMain.on('download-video', async () => {
  const videoFileName = 'Code Pixel_Book 2_Chapter_1.mp4';
  const videoS3Url = 'https://internal-training-new.s3.us-west-2.amazonaws.com/Code+Pixel_Book+2_Chapter_1.mp4';
  const cacheVideoDir = extractTo; // Use the same cache directory as flipbook
  const cacheVideoPath = path.join(cacheVideoDir, videoFileName);

  if (!fs.existsSync(cacheVideoDir)) {
    fs.mkdirSync(cacheVideoDir, { recursive: true });
  }

  if (!fs.existsSync(cacheVideoPath)) {
    // Download the video from S3 and save to cache directory
    try {
      const res = await fetch(videoS3Url);
      if (!res.ok) throw new Error(`Failed to fetch video: ${res.statusText}`);
      await streamPipeline(res.body, fs.createWriteStream(cacheVideoPath));
      console.log('Video downloaded and cached to:', cacheVideoPath);
    } catch (err) {
      console.error('Failed to download video:', err);
    }
  } else {
    console.log('Video already cached:', cacheVideoPath);
  }
});

*/

/*
ipcMain.on('download-video', async () => {
  const videoFileName = 'Code Pixel_Book 2_Chapter_1.mp4';
  const videoS3Url = 'https://internal-training-new.s3.us-west-2.amazonaws.com/Code+Pixel_Book+2_Chapter_1.mp4';
  const cacheVideoDir = extractTo;
  const cacheVideoPath = path.join(cacheVideoDir, videoFileName);

  if (!fs.existsSync(cacheVideoDir)) {
    fs.mkdirSync(cacheVideoDir, { recursive: true });
  }

  if (!fs.existsSync(cacheVideoPath)) {
    try {
      const res = await fetch(videoS3Url);
      if (!res.ok) throw new Error(`Failed to fetch video: ${res.statusText}`);
      await streamPipeline(res.body, fs.createWriteStream(cacheVideoPath));
      console.log('Video downloaded and cached to:', cacheVideoPath);
    } catch (err) {
      console.error('Failed to download video:', err);
      return;
    }
  } else {
    console.log('Video already cached:', cacheVideoPath);
  }

  // Now load the video player page and send the video path
  mainWindow.loadFile(path.join(__dirname, 'video.html')).then(() => {
    // Use file:// protocol for local files
    mainWindow.webContents.send('set-video-path', `file://${cacheVideoPath.replace(/\\/g, '/')}`);
  });
});

*/

ipcMain.on('download-video', async () => {
  const videoFileName = 'Code Pixel_Book 2_Chapter_1.mp4';
  const videoS3Url = 'https://internal-training-new.s3.us-west-2.amazonaws.com/Code+Pixel_Book+2_Chapter_1.mp4';
  const cacheVideoDir = extractTo;
  const cacheVideoPath = path.join(cacheVideoDir, videoFileName + '.enc');
  const tempVideoPath = path.join(os.tmpdir(), videoFileName);

  if (!fs.existsSync(cacheVideoDir)) {
    fs.mkdirSync(cacheVideoDir, { recursive: true });
  }

  if (!fs.existsSync(cacheVideoPath)) {
    try {
      // Download to temp file
      const res = await fetch(videoS3Url);
      if (!res.ok) throw new Error(`Failed to fetch video: ${res.statusText}`);
      await streamPipeline(res.body, fs.createWriteStream(tempVideoPath));
      // Encrypt to cache dir
      await encryptFile(tempVideoPath, cacheVideoPath);
      fs.unlinkSync(tempVideoPath); // Clean up temp file
      console.log('Video downloaded and encrypted to:', cacheVideoPath);
    } catch (err) {
      console.error('Failed to download/encrypt video:', err);
      return;
    }
  } else {
    console.log('Encrypted video already cached:', cacheVideoPath);
  }

  // Now load the video player page and send the encrypted video path
  mainWindow.loadFile(path.join(__dirname, 'video.html')).then(() => {
    mainWindow.webContents.send('set-video-path', cacheVideoPath);
  });
});

// Delete decrypted temp files
// Removes the temporary folder containing decrypted files, if it exists.
function deleteDecryptedFiles() {
  try {
    if (fs.existsSync(decryptedTemp)) {
      fs.rmSync(decryptedTemp, { recursive: true, force: true });
      console.log('Decrypted temp folder deleted.');
    }
  } catch (err) {
    console.error('Error deleting decrypted files:', err);
  }
}

ipcMain.handle('decrypt-video', async (event, encPath) => {
  const tempDecryptedPath = path.join(os.tmpdir(), 'decrypted_' + path.basename(encPath, '.enc'));
  // Decrypt only if not already present
  if (!fs.existsSync(tempDecryptedPath)) {
    const data = fs.readFileSync(encPath);
    const iv = data.slice(0, 16);
    const encrypted = data.slice(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    fs.writeFileSync(tempDecryptedPath, decrypted);
  }
  return tempDecryptedPath;
});
