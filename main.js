const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const url = require('url');
const express = require('express');
const cors = require('cors');
const httpProxy = require('http-proxy');
const net = require('net');
const os = require('os');
const { exec } = require('child_process');


let mainWindow;
let server;
let expressApp;
let httpProxyServer = {};
let tcpProxyServer = {};
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    height: 350,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    resizable: false,
    title: 'Node.js Installer',
    icon: path.join(__dirname, 'assets', 'veilproxy-icon.png')
  });

  startExpressServer();

  mainWindow.loadFile('nodejs-installer.html');


  mainWindow.on('close', function(event) {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', function() {
    stopAllProxies();
    mainWindow = null;
  });

  createTray();
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'veilproxy-icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show', 
      click: () => {
        mainWindow.show();
      }
    },
    { 
      label: 'Exit', 
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Node.js Installer');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

function startExpressServer() {
  expressApp = express();
  expressApp.use(express.json());
  expressApp.use(cors());
  
  expressApp.use(express.static(__dirname));
  
  expressApp.get('/api/nodejs/status', (req, res) => {
    exec('node --version', (error, stdout, stderr) => {
      
      if (error) {
        console.error('Node.js status check error:', error);
        return res.json({ installed: false });
      }
      
      if (stdout) {
        const version = stdout.trim();
        console.log('Node.js version:', version);
        
        return res.json({ 
          installed: true, 
          version: version 
        });
      }
      
      return res.json({ installed: false });
    });
  });

  expressApp.post('/api/nodejs/stop', (req, res) => {
    try {
      res.json({ success: true });
      
      if (server) {
        server.close(() => {
          console.log('Express server stopped');
          stopAllProxies();
        });
      }
    } catch (error) {
      console.error('Error stopping Node.js:', error);
      res.json({ success: false, error: error.message });
    }
  });

  expressApp.post('/api/nodejs/start', (req, res) => {
    try {
      if (!server) {
        server = expressApp.listen(3000, () => {
          console.log('Express server restarted on port 3000');
          res.json({ success: true });
        });
      } else {
        res.json({ success: false, error: 'Server is already running' });
      }
    } catch (error) {
      console.error('Error starting Node.js:', error);
      res.json({ success: false, error: error.message });
    }
  });
  
  expressApp.get('/api/ips', (req, res) => {
    const ifaces = os.networkInterfaces();
    const ips = [];
    
    Object.keys(ifaces).forEach(ifname => {
      ifaces[ifname].forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          ips.push(iface.address);
        }
      });
    });
    
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
  
  server = expressApp.listen(3000, () => {
    console.log('Express server running on port 3000');
  });
}

function stopAllProxies() {
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
  
  if (server) {
    server.close();
  }
}

app.on('ready', createWindow);

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

app.on('before-quit', () => {
  stopAllProxies();
}); 