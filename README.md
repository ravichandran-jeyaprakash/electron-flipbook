# Electron Flipbook

This Electron app extracts a flipbook from a ZIP file and displays it in a desktop window. It is designed to provide an offline, interactive flipbook experience using Electron.

## Features

- Automatically extracts a flipbook ZIP archive to a user data cache directory
- Loads and displays the flipbook HTML file in an Electron window
- Remembers extracted content to avoid repeated unzipping
- Cross-platform (Windows, macOS, Linux)

## Project Structure

```
electron-flipbook/
├── Introcuction to Word_B2_C3.zip   # The flipbook ZIP archive
├── main.js                          # Main Electron process script
├── package.json                     # Project metadata and dependencies
└── README.md                        # Project documentation
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

2. **Place your flipbook ZIP**
    - Ensure `Introcuction to Word_B2_C3.zip` is in the project root.

### Running the App

```sh
npm start
```

This will:
- Extract the ZIP to the Electron user data cache directory (if not already extracted)
- Open a window and display the flipbook

## Customization

- To use a different flipbook, replace `Introcuction to Word_B2_C3.zip` with your own ZIP file and update the filename in `main.js` if needed.
- The main HTML file loaded is `story.html` inside the extracted folder. Adjust the path in `main.js` if your flipbook uses a different entry point.

## Troubleshooting

- **ERR_FILE_NOT_FOUND:**  
  Make sure the ZIP file exists and contains the expected HTML files (e.g., `story.html`).
- **Extraction errors:**  
  Ensure the ZIP is not corrupted and has the correct structure.

## Dependencies

- [electron](https://www.electronjs.org/)
- [extract-zip](https://www.npmjs.com/package/extract-zip)
- [fs](https://nodejs.org/api/fs.html)
- [path](https://nodejs.org/api/path.html)

## License

MIT

---
```# Electron Flipbook

This Electron app extracts a flipbook from a ZIP file and displays it in a desktop window. It is designed to provide an offline, interactive flipbook experience using Electron.

## Features

- Automatically extracts a flipbook ZIP archive to a user data cache directory
- Loads and displays the flipbook HTML file in an Electron window
- Remembers extracted content to avoid repeated unzipping
- Cross-platform (Windows, macOS, Linux)

## Project Structure

```
electron-flipbook/
├── Introcuction to Word_B2_C3.zip   # The flipbook ZIP archive
├── main.js                          # Main Electron process script
├── package.json                     # Project metadata and dependencies
└── README.md                        # Project documentation
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

2. **Place your flipbook ZIP**
    - Ensure `Introcuction to Word_B2_C3.zip` is in the project root.

### Running the App

```sh
npm start
```

This will:
- Extract the ZIP to the Electron user data cache directory (if not already extracted)
- Open a window and display the flipbook

## Customization

- To use a different flipbook, replace `Introcuction to Word_B2_C3.zip` with your own ZIP file and update the filename in `main.js` if needed.
- The main HTML file loaded is `story.html` inside the extracted folder. Adjust the path in `main.js` if your flipbook uses a different entry point.

## Troubleshooting

- **ERR_FILE_NOT_FOUND:**  
  Make sure the ZIP file exists and contains the expected HTML files (e.g., `story.html`).
- **Extraction errors:**  
  Ensure the ZIP is not corrupted and has the correct structure.

## Dependencies

- [electron](https://www.electronjs.org/)
- [extract-zip](https://www.npmjs.com/package/extract-zip)
- [fs](https://nodejs.org/api/fs.html)
- [path](https://nodejs.org/api/path.html)

## License

MIT

---