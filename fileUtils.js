const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// Strong, randomly generated password and salt for AES-256 encryption
const password = 'v9J!2k@8zQ#4pL6wT$1eX7bC5nR0sF3h'; // 32 chars, mixed case, numbers, symbols
const salt = 'S8d$2mN!4vB7xQ1z'; // 16 chars, mixed case, numbers, symbols
const key = crypto.scryptSync(password, salt, 32);

/**
 * Encrypt a file using AES-256-CBC and save as .enc file.
 * @param {string} inputPath - Path to the input file.
 * @param {string} outputPath - Path to the output encrypted file.
 * @returns {Promise<void>}
 */
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

/**
 * Decrypt a .enc file using AES-256-CBC and write to destination.
 * @param {string} encPath - Path to the encrypted file.
 * @param {string} outPath - Path to the output decrypted file.
 */
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

/**
 * Recursively encrypt all .js files in a directory and replace them with .enc files.
 * @param {string} rootDir - Root directory to start encryption.
 * @returns {Promise<void>}
 */
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

/**
 * Recursively decrypt all .js.enc files in a directory to a temp folder as .js files.
 * Non-encrypted files are copied as-is.
 * @param {string} encRoot - Source directory containing encrypted files.
 * @param {string} outputRoot - Output directory for decrypted files.
 */
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

/**
 * Delete a folder and all its contents recursively.
 * @param {string} folderPath - Path to the folder to delete.
 */
function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
  }
}

module.exports = {
  encryptFile,
  decryptFile,
  encryptJSFiles,
  decryptJSFiles,
  deleteFolderRecursive,
  key,
}; 