const fs = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const extract = require('extract-zip');
const { Readable } = require('stream');

/**
 * Extracts the file name from a given URL, decoding any encoded characters.
 * @param {string} url - The URL to extract the file name from.
 * @returns {string} The decoded file name.
 */
function getFileNameFromUrl(url) {
  const pathname = new URL(url).pathname;
  return decodeURIComponent(pathname.substring(pathname.lastIndexOf('/') + 1));
}

/**
 * Downloads a file from a given URL and saves it to the specified destination path.
 * Uses streaming to efficiently handle large files.
 * @param {string} url - The URL to download from.
 * @param {string} destPath - The local file path to save the downloaded file.
 * @returns {Promise<void>} Resolves when the download is complete.
 
*/
/*
async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.statusText}`);
  await streamPipeline(res.body, fs.createWriteStream(destPath));
}
*/

/*
 * Downloads a file from a given URL and saves it to the specified destination path.
 * Uses streaming to efficiently handle large files.
 * @param {string} url - The URL to download from.
 * @param {string} destPath - The local file path to save the downloaded file.
 * @returns {Promise<void>} Resolves when the download is complete.
 */

async function downloadFile(url, destPath, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.statusText}`);

  const total = Number(res.headers.get('content-length'));
  let downloaded = 0;

  // Convert web stream to Node.js stream if needed
  const nodeStream = res.body.on ? res.body : Readable.fromWeb(res.body);

  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destPath);
    nodeStream.on('data', (chunk) => {
      downloaded += chunk.length;
      if (onProgress && total) {
        onProgress(Math.round((downloaded / total) * 100));
      }
    });
    nodeStream.pipe(fileStream);
    nodeStream.on('error', reject);
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });

}

/**
 * Extracts a zip file to the specified directory.
 * @param {string} zipPath - Path to the zip file.
 * @param {string} extractTo - Directory to extract the contents to.
 * @returns {Promise<void>} Resolves when extraction is complete.
 */
async function unzipFile(zipPath, extractTo) {
  await extract(zipPath, { dir: extractTo });
}

module.exports = {
  getFileNameFromUrl, // Extract file name from URL
  downloadFile,       // Download file from URL to disk
  unzipFile,          // Unzip a file to a directory
}; 