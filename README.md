# SharePaste

A minimalist, serverless code sharing tool that stores data entirely in the URL.

**[Live Demo](https://sidhu1512.github.io/SharePaste)**

##  Features

* **Serverless:** No database required. Your text is compressed and encoded directly into the share link.
* **Zstandard Compression:** Uses Facebook's Zstandard algorithm (via WebAssembly) to compress huge text blocks into short URLs.
* **Secure:** Since no data is stored on a server, your shared snippets cannot be leaked or data-mined.
* **Syntax Highlighting:** Auto-detects languages (Python, Java, JS, C++, etc.) and highlights syntax using Prism.js.
* **Mobile Friendly:** Includes a built-in QR Code generator with automatic URL shortening (via TinyURL) for easy mobile scanning.
* **Ghost UI:** A distraction-free, "transparent" typing experience with a minimalist aesthetic.

##  Tech Stack

* **Frontend:** HTML5, Vanilla JavaScript
* **Styling:** Tailwind CSS (via CDN)
* **Compression:** `@bokuweb/zstd-wasm`
* **Utilities:** `qrcode.js`, `prism.js`

##  How to Run Locally

1.  Clone the repository.
2.  Open the folder in VS Code.
3.  Install the "Live Server" extension.
4.  Right-click `index.html` and select "Open with Live Server".

> **Note:** You cannot simply double-click `index.html` because browsers block WASM files from loading via `file://` protocol for security. You must use a local server.

---

**Author:** Siddharth Bhadu