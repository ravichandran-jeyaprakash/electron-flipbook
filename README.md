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

### Running the App

```sh
npm start
```

This will:

- Download, extract, and encrypt the flipbook and video from S3 (if not already cached)
- Open a window and display the home page with options for offline/online viewing

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
