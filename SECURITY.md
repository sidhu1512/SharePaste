# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Architecture & Privacy Model

SharePaste is designed from the ground up as a **zero-trust, client-side application**:

- **No Remote Database**: Snippet data is never uploaded to, indexed by, or stored on any central server or third-party database.
- **URL Hash Privacy**: All compressed payloads reside exclusively within the URL fragment identifier (`#...`). According to RFC 3986, fragment identifiers are strictly client-side and are **never** transmitted to web servers in HTTP request headers.
- **Zero Telemetry**: No trackers, analytics engines, or external tracking pixels are embedded.
- **Client-Side WASM**: Compression and decompression run locally in the browser's sandbox using WebAssembly (`@bokuweb/zstd-wasm`).

## Reporting a Vulnerability

If you discover a potential security vulnerability within SharePaste:

1. **Do not disclose publicly**: Please refrain from opening a public issue with sensitive vulnerability reproduction details.
2. **Submit via GitHub Private Vulnerability Reporting**: Use the **Security** tab on the GitHub repository and click **Report a vulnerability** (or open an advisory draft).
3. **Alternative Contact**: You may reach out directly to the maintainer via GitHub profile contact.

Please include:

- A detailed description of the potential vulnerability.
- Step-by-step reproduction steps or a minimal proof of concept (PoC).
- Any potential impact on users or URL parsing.

We take security seriously and will investigate and respond promptly.
