# Electron Flipbook

This Electron app securely displays a flipbook and video content, with offline caching, AES-256 encryption, and a modern UI. It is designed for robust, user-friendly, and secure offline/online viewing of interactive content.

## Features

- **Automatic download and extraction** of flipbook ZIP and video from S3 URLs (set in `main.js`)
- **AES-256-CBC encryption** of all JS files and video before caching; decryption is performed on-the-fly
- **Offline and online viewing**: View flipbook and video from cache or directly from S3
- **IndexedDB cache info**: Stores and displays cache info for both flipbook and video in the renderer
- **Modern UI**: Card-based layout, loader overlays, cache info display, and dedicated pages for flipbook and video
- **IPC & Preload**: All main-to-renderer communication uses IPC with a secure preload script
- **No repeated downloads**: Files are only downloaded and cached if not already present
- **Cross-platform**: Works on Windows, macOS, and Linux

## Project Structure

```
electron-flipbook/
├── main.js              # Main Electron process: window, IPC, orchestration
├── fileUtils.js         # File encryption, decryption, and utility functions
├── downloadUtils.js     # Downloading and unzipping files from S3
├── flipbookManager.js   # Flipbook-specific extraction, encryption, decryption
├── videoManager.js      # Video-specific download, encryption, decryption
├── renderer.js          # Renderer process: IndexedDB cache, UI logic
├── preload.js           # Secure preload script for IPC
├── index.html           # Home page (modern card-based UI)
├── flip.html            # Flipbook viewing page
├── video.html           # Video viewing page
├── package.json         # Project metadata and dependencies
├── README.md            # Project documentation
└── ...
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or above recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. **Install dependencies**

   ```sh
   npm install
   ```

2. **Configure S3 URLs**
   - Edit the S3 URLs for the flipbook zip and video in `main.js`:
     ```js
     const s3ZipUrl = "https://.../your-flipbook.zip";
     const videoS3Url = "https://.../your-video.mp4";
     ```
   - File names are extracted automatically from the URLs.

## Running the App Locally

1. **Start the Electron app**

   ```sh
   npm start
   ```

   This will:

   - Download, extract, and encrypt the flipbook and video from S3 (if not already cached)
   - Open a window and display the home page with options for offline/online viewing

## Building and Deploying for Windows

1. **Install Electron Packager (if not already installed)**

   ```sh
   npm install --save-dev electron-packager
   ```

2. **Build the Windows package**

   ```sh
   npx electron-packager . electron-flipbook --platform=win32 --arch=x64 --out=dist --overwrite
   ```

   - This will create a `dist/electron-flipbook-win32-x64/` directory with the packaged app.

3. **Run the packaged app**

   - Navigate to the `dist/electron-flipbook-win32-x64/` directory.
   - Double-click `electron-flipbook.exe` to launch the app.

4. **Distribute/Deploy**
   - You can zip the contents of `dist/electron-flipbook-win32-x64/` and share it with users.
   - No installation is required; users just need to extract and run `electron-flipbook.exe`.

## Security & Caching

- **Encryption:** All JS files and video are encrypted with AES-256-CBC before being cached. Decryption is performed on-the-fly for serving to the renderer or for video playback.
- **Cache Directory:** Cached files are stored in the user's data directory under `flipbook_cache/`.
- **IndexedDB:** Cache info (file name, cache time, last accessed) is stored in IndexedDB in the renderer process for both flipbook and video.
- **No repeated downloads:** Files are only downloaded if not already cached.

## Customization

- **Change S3 URLs:** Edit the URLs in `main.js` as described above.
- **UI/UX:** Modify `index.html`, `flip.html`, `video.html`, and `renderer.js` for custom UI or additional features.
- **Encryption:** The encryption password and salt are set in `fileUtils.js`.

## Troubleshooting

- **ERR_FILE_NOT_FOUND:**
  - Ensure the S3 URLs are correct and the files exist at those locations.
- **Extraction or decryption errors:**
  - Ensure the ZIP and video files are valid and not corrupted.
- **Cache not updating:**
  - Use the clear cache button in the UI or clear IndexedDB manually.

## Dependencies

- [electron](https://www.electronjs.org/)
- [extract-zip](https://www.npmjs.com/package/extract-zip)
- [node-fetch](https://www.npmjs.com/package/node-fetch)

## License

MIT

---

# Technical Deep Dive: Flipbook & Video Player Functionality

## 1. **Flipbook Functionality**

### **A. Download and Caching Flow**

- **Trigger:**  
  The user clicks “Open Offline Flipbook” on the home page (`index.html`).  
  This triggers `window.electronAPI.openFlipbook()` in the renderer, which sends an IPC event (`open-flipbook`) to the main process.

- **Main Process Handling (`main.js`):**
  1. **Check Cache:**
     - The main process checks if the flipbook folder (extracted and encrypted) exists in the cache directory (`flipbook_cache` under Electron’s user data path).
  2. **Download ZIP (if needed):**
     - If not cached, it constructs the download path and uses the S3 URL (set in `main.js`) to download the ZIP file using `downloadFile()` from `downloadUtils.js`.
  3. **Unzip and Encrypt:**
     - The ZIP is extracted using `unzipFile()` (from `downloadUtils.js`).
     - All `.js` files in the extracted flipbook directory are encrypted using AES-256-CBC via `encryptJSFiles()` from `fileUtils.js`. The originals are deleted, and only `.js.enc` files remain.
  4. **Cleanup:**
     - The original ZIP is deleted after extraction and encryption to save space and for security.

### **B. Decryption and Preparation for Viewing**

- **Temporary Decryption:**
  - When the user requests to view the flipbook, the main process calls `prepareDecryptedFlipbookCopy()` from `flipbookManager.js`.
  - This function:
    - Recursively decrypts all `.js.enc` files back to `.js` in a temporary directory (`os.tmpdir()/flipbook_decrypted`).
    - Copies all non-encrypted assets (HTML, CSS, images) as-is.
    - Ensures the decrypted temp directory is cleaned up on app close.

### **C. Loading in Renderer**

- **Navigation:**
  - The main process loads `flip.html` in the main window and sends the path to the decrypted `index.html` via IPC (`set-flipbook-path`).
- **Renderer Logic:**
  - The renderer receives the path and loads the flipbook in an iframe or directly in the page.
  - Cache info (file name, cache time, last accessed) is stored in IndexedDB for display and management.

### **D. Security**

- **Encryption:**
  - All JS files are encrypted at rest in the cache.
  - Only decrypted to a temp directory for viewing, which is deleted on app close.
- **IPC Isolation:**
  - The renderer cannot access Node.js APIs directly; all file access and decryption are handled in the main process.

---

## 2. **Video Player Functionality**

### **A. Download and Caching Flow**

- **Trigger:**  
  The user clicks “Play Offline Video” on the home page.  
  This triggers `window.electronAPI.downloadVideo()` in the renderer, sending an IPC event (`download-video`) to the main process.

- **Main Process Handling (`main.js`):**
  1. **Check Cache:**
     - Checks if the encrypted video file (`.mp4.enc`) exists in the cache directory.
  2. **Download Video (if needed):**
     - If not cached, downloads the video from the S3 URL using `downloadFile()` from `downloadUtils.js`.
     - The video is saved temporarily, then encrypted using `encryptFile()` from `fileUtils.js` and stored as `.mp4.enc`.
     - The unencrypted temp file is deleted after encryption.

### **B. Decryption for Playback**

- **On-the-Fly Decryption:**
  - When the video is to be played, the renderer requests decryption via `window.electronAPI.decryptVideo(encPath)`, which invokes the `decrypt-video` IPC handler in the main process.
  - The main process decrypts the `.mp4.enc` file to a temp file in the OS temp directory (if not already present) using `decryptFile()` from `fileUtils.js`.
  - The path to the decrypted video is sent back to the renderer.

### **C. Loading in Renderer**

- **Navigation:**
  - The main process loads `video.html` and sends the path to the decrypted video file via IPC (`set-video-path`).
- **Renderer Logic:**
  - The renderer receives the path and sets it as the source for the HTML5 `<video>` player.
  - Cache info (file name, cache time, last accessed) is stored in IndexedDB for display and management.

### **D. Security**

- **Encryption:**
  - The video is always stored encrypted at rest.
  - Decryption only occurs to a temp file for playback, which can be cleaned up on app close.
- **IPC Isolation:**
  - The renderer cannot access the encrypted file or perform decryption directly.

---

## 3. **Shared Features and Architecture**

### **A. Modularization**

- **Separation of Concerns:**
  - `main.js`: Orchestrates app flow, window management, and IPC.
  - `fileUtils.js`: Handles all encryption/decryption and file operations.
  - `downloadUtils.js`: Handles all downloading and unzipping.
  - `flipbookManager.js`/`videoManager.js`: High-level logic for each content type.
  - `renderer.js`: Handles UI, IndexedDB cache, and user interactions.
  - `preload.js`: Exposes only safe, whitelisted APIs to the renderer.

### **B. Caching and Metadata**

- **IndexedDB:**
  - Used in the renderer to store and retrieve cache metadata for both flipbook and video.
  - Allows the UI to display cache status, last access time, and provide a “clear cache” button.

### **C. UI/UX**

- **Modern Home Page:**
  - Card-based layout with clear options for offline/online viewing.
  - Loader overlays for long operations.
  - Dedicated pages for flipbook and video, each with cache info and navigation.

### **D. Error Handling**

- **Graceful Fallbacks:**
  - All file and network operations are checked for errors.
  - User is notified of failures (e.g., download, decryption, or cache issues).
  - Cache and temp files are cleaned up to avoid stale or insecure data.

---

## 4. **Flow Diagrams (Textual)**

### **Flipbook Load (Offline)**

```
User clicks "Open Offline Flipbook"
  → Renderer sends IPC "open-flipbook"
    → Main checks cache
      → If not cached: download ZIP → unzip → encrypt JS files
    → Prepare decrypted temp copy
    → Main loads flip.html, sends decrypted path
      → Renderer loads flipbook, updates cache info in IndexedDB
```

### **Video Load (Offline)**

```
User clicks "Play Offline Video"
  → Renderer sends IPC "download-video"
    → Main checks cache
      → If not cached: download video → encrypt
    → Main loads video.html, sends encrypted path
      → Renderer requests decryption via IPC
        → Main decrypts to temp file, returns path
          → Renderer loads video, updates cache info in IndexedDB
```

---

## 5. **Security Considerations**

- **All sensitive content is encrypted at rest.**
- **Decryption only occurs in temp directories, which are cleaned up on app close.**
- **Renderer process is sandboxed and cannot access Node.js or Electron APIs directly.**
- **All file and cache operations are performed in the main process.**

---

If you want a diagram, code snippets, or a breakdown of a specific module or flow, let me know!
