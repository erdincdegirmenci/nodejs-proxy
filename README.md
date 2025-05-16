# VeilProxy - Node.js Proxy & Installer

![VeilProxy Logo](assets/veilproxy-icon.png)

## Overview
VeilProxy is a modern, user-friendly Electron-based proxy management tool and Node.js installer for Windows. It is built with Electron, Express, and Node.js, providing a smooth desktop experience for managing proxies and installing Node.js with ease.

It allows you to easily check, install, and manage Node.js on your system, and provides a simple interface to set up HTTP/WS proxies for local development

## Features
- **Node.js Installation Check:** Detects if Node.js is installed and shows the current version.
- **One-Click Node.js Installer:** Installs Node.js with a single click if not present.
- **Proxy Management:** Easily start/stop HTTP/WS proxies between internal and external ports.
- **System Tray Integration:** Minimize to tray, quick show/hide, and exit options.
- **Modern UI:** Responsive, dark-themed interface with custom branding.

## Screenshots
![image](https://github.com/user-attachments/assets/78468c6f-1fb4-41a3-a458-dc2c06367f6b)
![image](https://github.com/user-attachments/assets/58b5cd53-d722-4ee0-a21c-bb6dafbe2799)


## Getting Started

### Technologies Used
- Electron — Desktop shell for building cross-platform apps with JavaScript, HTML, and CSS

- Express — Web server framework for Node.js

- Node.js — JavaScript runtime for building server-side tools

- Git — Version control system

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/nodejs-veilproxy.git
   cd nodejs-veilproxy
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run the app in development mode:**
   ```bash
   npm start
   ```

### Build for Windows
```bash
npm run build
```
The output will be in the `dist/` folder.

## Usage
- **Proxy Setup:**
  - Select your IP address, internal port, and external port.
  - Optionally enable "Rewrite host headers" for IIS Express.
  - Click **Start Proxy** to begin forwarding traffic.
- **Node.js Installer:**
  - If Node.js is not detected, use the installer page to download and install it.
- **Tray Menu:**
  - Right-click the tray icon for quick show/hide and exit options.

## File Structure
```
assets/                # Icons, styles, and images
main.js                # Electron main process
index.html             # Main UI
nodejs-installer.html  # Node.js installer UI
assets/styles.css      # Custom styles
```

## Customization
- **Branding:** Replace `assets/veilproxy-icon.png` with your own logo for custom branding.
- **Installer Version:** Update the Node.js version in `nodejs-installer.html` if needed.

## License
MIT
