# Privacy Policy for godm & godm Browser Integration

**Last updated:** October 28, 2026

The **godm Download Accelerator Integration** extension and **godm Desktop Application** ("godm", "we", "our") are built with user privacy and local-first principles. We do not operate remote tracking servers, do not collect personal analytics, and do not sell or monetize your data.

---

### 1. Information Handled & How It Is Used

All processing performed by the godm browser extension happens locally on your computer:

* **Download URLs & Headers:** When you click a download link or when a file download is intercepted, the file's URL, referer, and suggested file name are transmitted strictly across your local loopback interface (`http://127.0.0.1:9246`) to your running godm desktop client to accelerate and assemble the download.
* **Streaming Media Detection:** When media plays in your browser, the extension passively inspects local network response headers (`video/*`, `audio/*`) to detect direct stream fragments so you can choose to download them. No browsing history or media logs are collected or sent to remote servers.
* **Authenticated Media & Cookies:** When you explicitly click "Download" on an authenticated or private video (such as a members-only video or private social media post), the extension reads the session cookies for that specific tab and transmits them directly to your local desktop client (`127.0.0.1:9246`). This allows the local desktop engine (`yt-dlp`) to authenticate and stream the media. These cookies never leave your device.
* **Extension Settings:** Extension preferences (such as toggling automatic download interception or the floating video download bar) are saved locally on your device using Chrome's local storage API (`chrome.storage.local`).

---

### 2. Zero Remote Telemetry & No Third-Party Tracking

* **No Remote Servers:** We do not own, operate, or transmit your data to remote cloud servers.
* **No Analytics:** No Google Analytics, telemetry packages, tracking pixels, or third-party SDKs are embedded in the extension.
* **No Selling or Sharing:** We never sell, rent, trade, or transfer any user data, web history, or authentication information to third parties or advertising networks.

---

### 3. Open Source & Transparency

godm is open-source software. You can inspect the complete source code, extension manifest, and local communication mechanisms at:
[https://github.com/laradev-site/godm](https://github.com/laradev-site/godm)

---

### 4. Contact

If you have questions about this Privacy Policy or the security of godm, please open an issue on our GitHub repository:
[https://github.com/laradev-site/godm/issues](https://github.com/laradev-site/godm/issues)
