const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const express = require('express');
const cors = require('cors');
const httpProxy = require('http-proxy');
const net = require('net');
const os = require('os');
const { exec } = require('child_process');

// Referans saklayalım, yoksa GC pencereyi kapatabilir
let mainWindow;
let server;
let expressApp;
let httpProxyServer = {};
let tcpProxyServer = {};

function createWindow() {
  // Tarayıcı penceresini oluştur
  mainWindow = new BrowserWindow({
    width: 600,
    height: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    resizable: false,
    title: 'Node.js Kurulum Yöneticisi'
  });

  // Express sunucusunu başlat
  startExpressServer();

  // HTML yükle
  mainWindow.loadFile('nodejs-installer.html');

  // Pencere kapandığında deinit
  mainWindow.on('closed', function() {
    stopAllProxies();
    mainWindow = null;
  });
}

function startExpressServer() {
  expressApp = express();
  expressApp.use(express.json());
  expressApp.use(cors());
  
  // Statik dosyaları servis et
  expressApp.use(express.static(__dirname));
  
  // Node.js durum kontrolü endpoint'i
  expressApp.get('/api/nodejs/status', (req, res) => {
    exec('node --version', (error, stdout, stderr) => {
      
      if (error) {
        console.error('Node.js status check error:', error);
        return res.json({ installed: false });
      }
      
      if (stdout) {
        const version = stdout.trim();
        console.log('Node.js version:', version); // Debug için
        
        // Node.js kurulu ve çalışıyor
        return res.json({ 
          installed: true, 
          version: version 
        });
      }
      
      // Node.js kurulu değil
      return res.json({ installed: false });
    });
  });
  
  // API endpoint'leri
  expressApp.get('/api/ips', (req, res) => {
    const ifaces = os.networkInterfaces();
    const ips = [];
    
    Object.keys(ifaces).forEach(ifname => {
      ifaces[ifname].forEach(iface => {
        // IPv4 ve harici IP'leri filtrele
        if (iface.family === 'IPv4' && !iface.internal) {
          ips.push(iface.address);
        }
      });
    });
    
    // Loopback'i ekle
    ips.push('127.0.0.1');
    ips.push('localhost');
    
    res.json(ips);
  });
  
  expressApp.post('/api/start-proxy', (req, res) => {
    const { internalPort, externalPort, rewriteHostHeaders } = req.body;
    
    if (httpProxyServer[externalPort] || tcpProxyServer[externalPort]) {
      return res.json({ success: false, error: 'Port already in use' });
    }
    
    try {
      // HTTP proxy başlat
      httpProxyServer[externalPort] = httpProxy.createServer({
        target: {
          host: 'localhost',
          port: internalPort
        },
        xfwd: true,
        ws: true
      });
      
      httpProxyServer[externalPort].on('error', (err) => {
        console.error('Proxy error:', err);
      });
      
      httpProxyServer[externalPort].on('proxyReq', (proxyReq, req, res, options) => {
        if (rewriteHostHeaders) {
          proxyReq.setHeader('Host', 'localhost:' + internalPort);
        }
      });
      
      httpProxyServer[externalPort].listen(externalPort);
      
      // TCP proxy başlat (WebSocket/Blazor vs desteklenmesi için)
      tcpProxyServer[externalPort] = {
        server: net.createServer(),
        connections: []
      };
      
      tcpProxyServer[externalPort].server.on('connection', (clientSocket) => {
        const serverSocket = net.connect(internalPort, 'localhost', () => {
          clientSocket.pipe(serverSocket);
          serverSocket.pipe(clientSocket);
        });
        
        tcpProxyServer[externalPort].connections.push({ client: clientSocket, server: serverSocket });
        
        clientSocket.on('error', (err) => {
          console.error('Client socket error:', err);
          serverSocket.end();
        });
        
        serverSocket.on('error', (err) => {
          console.error('Server socket error:', err);
          clientSocket.end();
        });
        
        clientSocket.on('close', () => {
          const idx = tcpProxyServer[externalPort].connections.findIndex(c => c.client === clientSocket);
          if (idx !== -1) {
            tcpProxyServer[externalPort].connections.splice(idx, 1);
          }
          serverSocket.end();
        });
        
        serverSocket.on('close', () => {
          const idx = tcpProxyServer[externalPort].connections.findIndex(c => c.server === serverSocket);
          if (idx !== -1) {
            tcpProxyServer[externalPort].connections.splice(idx, 1);
          }
          clientSocket.end();
        });
      });
      
      tcpProxyServer[externalPort].server.listen(externalPort + 1);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error starting proxy:', error);
      res.json({ success: false, error: error.message });
    }
  });
  
  expressApp.post('/api/stop-proxy', (req, res) => {
    const { externalPort } = req.body;
    
    try {
      if (httpProxyServer[externalPort]) {
        httpProxyServer[externalPort].close();
        delete httpProxyServer[externalPort];
      }
      
      if (tcpProxyServer[externalPort]) {
        // Tüm bağlantıları kapat
        tcpProxyServer[externalPort].connections.forEach(conn => {
          if (conn.client) conn.client.end();
          if (conn.server) conn.server.end();
        });
        
        tcpProxyServer[externalPort].server.close();
        delete tcpProxyServer[externalPort];
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error stopping proxy:', error);
      res.json({ success: false, error: error.message });
    }
  });
  
  // Port 3000'de dinle
  server = expressApp.listen(3000, () => {
    console.log('Express server running on port 3000');
  });
}

function stopAllProxies() {
  // Tüm proxy'leri durdur
  Object.keys(httpProxyServer).forEach(port => {
    if (httpProxyServer[port]) {
      httpProxyServer[port].close();
    }
  });
  
  Object.keys(tcpProxyServer).forEach(port => {
    if (tcpProxyServer[port]) {
      tcpProxyServer[port].connections.forEach(conn => {
        if (conn.client) conn.client.end();
        if (conn.server) conn.server.end();
      });
      
      tcpProxyServer[port].server.close();
    }
  });
  
  // Express sunucusunu durdur
  if (server) {
    server.close();
  }
}

// Electron hazır olduğunda
app.on('ready', createWindow);

// Tüm pencereler kapandığında çık
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    stopAllProxies();
    app.quit();
  }
});

app.on('activate', function() {
  if (mainWindow === null) {
    createWindow();
  }
});

// Uygulama kapatılırken
app.on('before-quit', () => {
  stopAllProxies();
}); 