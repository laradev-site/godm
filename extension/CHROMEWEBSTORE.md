# Chrome Web Store Publishing Guide & Metadata: godm

This document contains all store listing copy, permission justifications, privacy disclosures, and upload instructions required to publish **godm Download Accelerator Integration** to the [Google Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## 1. Store Listing Details

### Extension Name
`godm Download Accelerator Integration`

### Summary (Short Description — max 132 characters)
`Seamlessly captures download links, private videos, and accelerates downloads using the godm desktop engine.`

### Category
`Productivity` / `Developer Tools`

### Detailed Description (Formatted for Web Store)
```markdown
Accelerate your web downloads and seamlessly capture online videos with the official godm browser integration.

godm is a next-generation high-speed download manager designed for maximum throughput, multi-segment connections, and reliable downloads. This extension connects your Chrome browser directly to the godm desktop application running on your computer.

⚡ KEY FEATURES

• 🚀 Automatic Download Interception:
  Replaces slow, single-threaded browser downloads with godm's accelerated 16-connection multi-thread engine. Supports archives (.zip, .rar, .7z, .iso), media (.mp4, .mkv, .mp3), executables, documents, and large files.

• 🎥 Universal Video Sniffer:
  Displays an unobtrusive floating download bar over web videos on YouTube, Facebook Reels, TikTok, Instagram, X/Twitter, Vimeo, and HTML5 video players.

• 🔒 Authenticated & Private Video Downloads:
  Enables downloading videos that require login credentials (such as private Facebook groups/reels or members-only videos) by passing session authentication strictly to your local godm desktop app.

• 🖱️ Right-Click Context Menu:
  Quickly download any link, video, audio track, or entire page media with a single right-click.

• ⚡ Lightweight & Fast:
  Built on modern Chrome Manifest V3 standards. Runs silently in the background with zero lag and minimal memory footprint.

------------------------------------------------------------
REQUIREMENTS:
This extension requires the free godm desktop application installed on your PC (Windows, macOS, or Linux).
Website & Download: https://godm.app (or your local godm installation)
------------------------------------------------------------
```

---

## 2. Permissions Justifications (Required by Google Reviewers)

Google reviewers scrutinize all requested permissions. Use these exact plain-English explanations when prompted in the Developer Dashboard:

| Permission | Reviewer Justification |
| :--- | :--- |
| `downloads` | Used to detect and intercept standard browser file downloads, cancel the browser's slow single-thread download, and route the file URL to the local godm accelerator. |
| `contextMenus` | Adds convenient "Download with godm" options to the right-click menu for links, images, audio, and video elements. |
| `storage` | Saves user preferences locally in the browser (such as toggling automatic download interception or floating video download buttons). |
| `activeTab` | Retrieves the active tab title and URL when the user explicitly clicks the extension popup or floating button to initiate a download. |
| `cookies` | Used exclusively when a user clicks "Download" on an authenticated or private video (e.g., Facebook, private group posts) to send session cookies to the local godm app so the desktop engine can access the requested media. |
| `webRequest` | Passively inspects response headers (`Content-Type` matching `video/*`) to detect direct streaming media URLs (e.g. video fragments) for download capture. No network traffic is blocked or modified. |
| Host: `<all_urls>` | Required because users download files and stream videos across any website on the internet. Without broad host access, the extension cannot offer video capture or download acceleration across arbitrary sites. |
| Host: `http://127.0.0.1:9246/*` | Required to communicate with the local godm desktop application bridge running on the user's computer via localhost RPC. |

---

## 3. Privacy & Data Use Disclosures

When completing the **Privacy Practices** tab in the developer console:

1. **Single Purpose Certification**:
   - Check the box confirming the extension has a single purpose (download interception and media capture for the local godm application).
2. **Data Usage**:
   - **User Activity / Web History**: Select **YES**, but only for:
     - Purpose: *App functionality* (detecting media URLs and download items).
     - Check: *Data is NOT sold to third parties.*
     - Check: *Data is NOT used for purposes unrelated to the core functionality.*
     - Check: *Data is NOT used for creditworthiness or lending.*
3. **Authentication Info (Cookies)**:
   - Purpose: *App functionality* (passed strictly to the user's local `127.0.0.1:9246` app when downloading private media). No cookies are stored on remote cloud servers.
4. **Data Transmission Notice**:
   - All network calls from this extension are strictly local (`http://127.0.0.1:9246`). No analytics, telemetry, or third-party tracking scripts are bundled.

---

## 4. Privacy Policy (Host this URL online)

Google requires a publicly accessible Privacy Policy URL. You can host this at `https://your-website.com/privacy` or on GitHub Pages:

```markdown
# Privacy Policy for godm Chrome Extension

Last updated: October 28, 2026

The "godm Download Accelerator Integration" extension values your privacy. This policy explains what information is handled and how it is processed.

1. Information Handled:
• Download URLs: When a download link is clicked or intercepted, the URL and suggested filename are sent strictly to your locally running godm application (http://127.0.0.1:9246).
• Session Cookies: When you explicitly download a private or authenticated video from a site where you are logged in, the extension extracts the necessary session cookies for that page and passes them directly to your local godm app.
• Settings: Extension preferences (such as enabling/disabling download interception) are saved locally on your device via Chrome's storage API.

2. Data Storage & Sharing:
• ZERO Remote Servers: We do not operate remote servers for collecting user data.
• NO Analytics or Tracking: The extension does not collect analytics, track your browsing history, or share information with third parties.
• Localhost Communication Only: All captured URLs, headers, and cookies are sent exclusively to your local machine at 127.0.0.1.

3. Changes to this Policy:
Any future updates to this policy will be posted on this page.

Contact:
For questions or support, contact support@godm.app or visit https://github.com/your-repo/godm
```

---

## 5. How to Package the Extension for Submission

To create a clean `.zip` archive ready for upload:

1. Open PowerShell and navigate to the project root.
2. Run:
```powershell
Compress-Archive -Path "extension\manifest.json", "extension\background.js", "extension\content.js", "extension\content.css", "extension\icons", "extension\popup" -DestinationPath "godm-chrome-extension.zip" -Force
```
3. Upload `godm-chrome-extension.zip` in the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
