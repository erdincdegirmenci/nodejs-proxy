# VeilProxy

**Your Proxy. Your Rules.**

VeilProxy is a modern, stylish, and easy-to-use web-based TCP/HTTP proxy manager. It allows you to forward any port on your machine to another port, making it ideal for local development, testing, or securely exposing services on your network.

---

##  Features
- **Modern UI:** Dark theme, responsive, and beautiful interface (HTML/CSS/JS, Orbitron font)
- **Easy Proxy Management:** Start/stop proxy with a single button
- **Supports Any App:** Works with IIS Express, .NET, Node.js, or any TCP/HTTP service
- **Host Header Rewrite:** Optional for IIS Express compatibility
- **Dynamic IP Detection:** Lists your local IP addresses automatically
- **Toast Notifications & Sound:** Instant feedback for actions

---

## 📸 Screenshot
![image](https://github.com/user-attachments/assets/cf0962a8-e8da-41bb-bb02-560b32c1d267)


---

##  Quick Start

### 1. Clone the Repository
```bash
https://github.com/yourusername/veilproxy.git
cd veilproxy
```

### 2. Install Backend Dependencies
```bash
npm install
```

### 3. Start the Backend Server
```bash
node server.js
```

### 4. Open the Frontend
- Open `index.html` in your browser **OR**
- Serve the project with a static server (recommended for full functionality):
  ```bash
  npx serve .
  # or
  npx http-server .
  ```
- Visit [http://localhost:3000](http://localhost:3000) (or your chosen port)

---

##  Project Structure
```
veilproxy/
├── assets/
│   └── veilproxy.css         # All CSS styles
├── index.html                # Main frontend UI
├── server.js                 # Node.js backend (proxy logic)
├── package.json              # Node.js dependencies
└── README.md                 # This file
```

---

##  Configuration & Usage
- **IP Address:** Select which local IP to listen on (auto-detected)
- **Internal/External Port:** Set the ports for proxying
- **Rewrite host headers:** Enable for IIS Express or apps that require a specific Host header
- **Start/Stop Proxy:** Use the main button to control the proxy

---

## 🌐 Deployment
- You can deploy VeilProxy on any server with Node.js
- For HTTPS and domain, use Nginx/Apache as a reverse proxy

---

## 📄 License
MIT 
