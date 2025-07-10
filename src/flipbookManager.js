const path = require('path');
const os = require('os');
const fs = require('fs');
const { encryptJSFiles, decryptJSFiles, deleteFolderRecursive } = require('./fileUtils');
const { unzipFile } = require('./downloadUtils');

function getFlipbookFolderName(zipFileName) {
  return zipFileName.replace(/\.zip$/, '');
}

async function unzipAndEncryptFlipbook(zipPath, extractTo, zipFileName) {
  const storyPath = path.join(extractTo, getFlipbookFolderName(zipFileName), 'index.html');
  if (!fs.existsSync(storyPath)) {
    await unzipFile(zipPath, extractTo);
    await encryptJSFiles(path.join(extractTo, getFlipbookFolderName(zipFileName)));
  }
}

function prepareDecryptedFlipbookCopy(extractTo, zipFileName, decryptedTemp) {
  const srcRoot = path.join(extractTo, getFlipbookFolderName(zipFileName));
  const targetRoot = decryptedTemp;
  deleteFolderRecursive(targetRoot);
  fs.mkdirSync(targetRoot, { recursive: true });
  decryptJSFiles(srcRoot, targetRoot);
}

module.exports = {
  getFlipbookFolderName,
  unzipAndEncryptFlipbook,
  prepareDecryptedFlipbookCopy,
}; 