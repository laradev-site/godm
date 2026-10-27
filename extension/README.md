# godm Browser Integration Extension ⚡

> **Official browser integration extension for `godm` (Go Download Manager).**  
> Intercepts browser downloads, adds context-menu options, and sniffs streaming video (YouTube, TikTok, Instagram, etc.).

---

## 🌟 Capabilities

- **Automatic Download Interception**: Automatically catches browser file downloads (ZIP, ISO, EXE, PDF, MP4, etc.) and transfers them to `godm` for multi-connection acceleration.
- **Floating "Download with godm" Widget**: Appears over video players on YouTube, TikTok, Vimeo, and web streams.
- **Context Menus**: Right-click on any link or video -> **Download with godm**.
- **Zero-Setup Communication**: Uses local loopback RPC (`127.0.0.1:9246`) to instantly communicate with the desktop app without needing admin privileges or registry hacks.

---

## 🛠️ Installation Guide

### Google Chrome / Brave / Opera

1. Open your browser and navigate to the Extensions management page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Opera**: `opera://extensions`
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left toolbar.
4. Select the `extension/` folder located at:
   ```
   D:\nginx\www\laradev\godm\extension
   ```
5. The **godm Download Accelerator Integration** extension will now appear in your toolbar!

---

### Microsoft Edge

1. Navigate to: `edge://extensions`
2. Turn on **Developer mode** toggle in the left navigation sidebar.
3. Click **Load unpacked**.
4. Select the `D:\nginx\www\laradev\godm\extension` folder.

---

## 🎮 How to Use

1. Ensure the `godm` desktop application is running (`bin/godm.exe` or `wails3 dev`).
2. Click the `godm` icon in your browser toolbar: the status indicator will show **Connected** in green.
3. **Download any file**: The browser's single-threaded download will automatically be redirected to `godm` with multi-segment acceleration!
4. **Download Videos**: On YouTube or any video player, click the floating **Download with godm** badge or right-click the video -> **Download video with godm**.
