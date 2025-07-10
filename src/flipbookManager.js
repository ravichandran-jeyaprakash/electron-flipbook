// flipbookManager.js
// Handles flipbook folder naming, extraction, encryption, and preparation for viewing.

const path = require('path');
const os = require('os');
const fs = require('fs');
const { encryptJSFiles, decryptJSFiles, deleteFolderRecursive } = require('./fileUtils');
const { unzipFile } = require('./downloadUtils');

/**
 * Returns the folder name for the flipbook, derived from the zip file name.
 * E.g., 'Book.zip' -> 'Book'
 * @param {string} zipFileName - The name of the zip file.
 * @returns {string} - The folder name for the flipbook.
 */
function getFlipbookFolderName(zipFileName) {
  return zipFileName.replace(/\.zip$/, '');
}

/**
 * Unzips the flipbook zip file and encrypts all JS files inside it.
 * Only runs if the flipbook hasn't already been extracted and encrypted.
 * @param {string} zipPath - Path to the zip file.
 * @param {string} extractTo - Directory to extract to.
 * @param {string} zipFileName - Name of the zip file.
 */
async function unzipAndEncryptFlipbook(zipPath, extractTo, zipFileName) {
  const storyPath = path.join(extractTo, getFlipbookFolderName(zipFileName), 'index.html');
  // Only extract and encrypt if not already done
  if (!fs.existsSync(storyPath)) {
    await unzipFile(zipPath, extractTo); // Extract zip contents
    await encryptJSFiles(path.join(extractTo, getFlipbookFolderName(zipFileName))); // Encrypt JS files
  }
}

/**
 * Prepares a temporary decrypted copy of the flipbook for viewing.
 * Deletes any previous temp, creates a new temp folder, and decrypts JS files into it.
 * @param {string} extractTo - Directory where encrypted flipbook is stored.
 * @param {string} zipFileName - Name of the zip file.
 * @param {string} decryptedTemp - Path to the temp folder for decrypted files.
 */
function prepareDecryptedFlipbookCopy(extractTo, zipFileName, decryptedTemp) {
  const srcRoot = path.join(extractTo, getFlipbookFolderName(zipFileName)); // Encrypted flipbook folder
  const targetRoot = decryptedTemp; // Temp folder for decrypted copy
  deleteFolderRecursive(targetRoot); // Clean up any previous temp
  fs.mkdirSync(targetRoot, { recursive: true }); // Ensure temp folder exists
  decryptJSFiles(srcRoot, targetRoot); // Decrypt JS files for viewing
}

module.exports = {
  getFlipbookFolderName,      // Get folder name from zip file name
  unzipAndEncryptFlipbook,   // Extract and encrypt flipbook
  prepareDecryptedFlipbookCopy, // Prepare decrypted copy for viewing
}; 