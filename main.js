const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const extract = require('extract-zip');

const zipFile = path.join(__dirname, 'Introcuction to Word_B2_C3.zip');
const extractTo = path.join(app.getPath('userData'), 'flipbook_cache');

async function unzipFlipbook() {
  if (!fs.existsSync(path.join(extractTo, 'story.html'))) {
    console.log('Extracting Flipbook...');
    await extract(zipFile, { dir: extractTo });
  } else {
    console.log('Flipbook already extracted.');
  }
}

async function createWindow() {
  await unzipFlipbook();

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
    }
  });

  const flipbookPath = path.join(extractTo, 'Introcuction%20to%20Word_B2_C3/story.html');
  win.loadFile(flipbookPath);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
