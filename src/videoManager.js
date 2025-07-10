const path = require('path');
const os = require('os');
const fs = require('fs');
const { encryptFile, decryptFile } = require('./fileUtils');
const { downloadFile } = require('./downloadUtils');

/**
 * Downloads a video from the given URL, encrypts it, and stores it in the cache directory.
 * If the encrypted video already exists, the function does nothing.
 * @param {string} videoUrl - The S3 URL of the video to download.
 * @param {string} cacheVideoPath - The path where the encrypted video should be stored.
 * @param {string} tempVideoPath - Temporary path for the unencrypted video during processing.
 * @returns {Promise<void>} Resolves when the video is downloaded and encrypted.
 */
async function downloadAndEncryptVideo(videoUrl, cacheVideoPath, tempVideoPath) {
  if (!fs.existsSync(cacheVideoPath)) {
    await downloadFile(videoUrl, tempVideoPath);
    await encryptFile(tempVideoPath, cacheVideoPath);
    fs.unlinkSync(tempVideoPath);
  }
}

/**
 * Decrypts an encrypted video file to a temporary location for playback.
 * If the decrypted file already exists, it is reused.
 * @param {string} encPath - Path to the encrypted video file (.enc).
 * @returns {Promise<string>} Path to the temporary decrypted video file.
 */
async function decryptVideo(encPath) {
  const tempDecryptedPath = path.join(os.tmpdir(), 'decrypted_' + path.basename(encPath, '.enc'));
  if (!fs.existsSync(tempDecryptedPath)) {
    decryptFile(encPath, tempDecryptedPath);
  }
  return tempDecryptedPath;
}

module.exports = {
  downloadAndEncryptVideo, // Download and encrypt video from S3
  decryptVideo,            // Decrypt video for playback
}; 