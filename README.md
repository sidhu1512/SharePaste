# SharePaste

A minimalist, serverless code sharing tool that stores data entirely in the URL.

**[Live Demo](https://sidhu1512.github.io/SharePaste)**

## Features

* **Serverless & Secure:** No database required. Your text is compressed and encoded directly into the share link. No data is ever stored on a server.
* **Zstandard Compression:** Uses Facebook's Zstandard algorithm (via WebAssembly) to compress huge text blocks into shareable URLs.
* **Performance Optimized:** Built to handle large files and extensive lines of code without browser lag or freezing.
* **Smart QR Generation:** Automatically switches between instant local generation and URL shortening based on the content size to ensure scannable codes.
* **Auto-Highlighting:** Detects languages (Python, Java, JS, C++, etc.) and applies syntax highlighting using Prism.js.
* **Ghost UI:** A distraction-free, "transparent" typing experience with a minimalist aesthetic.

## Tech Stack

* **Frontend:** HTML5, Vanilla JavaScript
* **Styling:** Tailwind CSS (via CDN)
* **Compression:** `@bokuweb/zstd-wasm`
* **Utilities:** `qrcode.js`, `prism.js`

## How to Run Locally

1.  Clone the repository.
2.  Open the folder in VS Code.
3.  Install the "Live Server" extension.
4.  Right-click `index.html` and select "Open with Live Server".


---

**Author:** Siddharth Bhadu