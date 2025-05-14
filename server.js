const express = require('express');
const os = require('os');
const cors = require('cors');
const httpProxy = require('http-proxy');
const http = require('http');
const net = require('net');
const app = express();

app.use(cors()); // Frontend'den erişim için gerekli
app.use(express.json()); // JSON body parse

const activeProxies = {}; // externalPort -> { server, proxy }
const activeTcpProxies = {}; // externalPort -> { server, connections }

app.get('/api/ips', (req, res) => {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (let name in interfaces) {
        for (let iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    res.json(ips);
});


// TCP Proxy başlat
app.post('/api/start-tcp-proxy', (req, res) => {
    const { externalPort, internalPort } = req.body;
    if (activeTcpProxies[externalPort]) {
        return res.status(400).json({ error: 'TCP Proxy already running on this port.' });
    }
    const connections = new Set();
    const server = net.createServer((clientSocket) => {
        const serverSocket = net.connect(internalPort, '127.0.0.1');
        connections.add(clientSocket);
        connections.add(serverSocket);

        clientSocket.pipe(serverSocket);
        serverSocket.pipe(clientSocket);

        clientSocket.on('close', () => {
            connections.delete(clientSocket);
            serverSocket.end();
        });
        serverSocket.on('close', () => {
            connections.delete(serverSocket);
            clientSocket.end();
        });
        clientSocket.on('error', () => serverSocket.end());
        serverSocket.on('error', () => clientSocket.end());
    });
    server.listen(externalPort, () => {
        activeTcpProxies[externalPort] = { server, connections };
        res.json({ success: true });
    });
    server.on('error', (err) => {
        res.status(500).json({ error: err.message });
    });
});

// TCP Proxy durdur
app.post('/api/stop-tcp-proxy', (req, res) => {
    const { externalPort } = req.body;
    const proxyObj = activeTcpProxies[externalPort];
    if (!proxyObj) {
        return res.status(400).json({ error: 'No TCP proxy running on this port.' });
    }
    // Tüm bağlantıları kapat
    for (const conn of proxyObj.connections) {
        conn.destroy();
    }
    proxyObj.server.close(() => {
        delete activeTcpProxies[externalPort];
        res.json({ success: true });
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`IP API running on http://localhost:${PORT}`)); 