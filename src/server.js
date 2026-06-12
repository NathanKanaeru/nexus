const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const path = require('path');
const config = require('./config');
const { router: authRouter, requireAuth, requireApiKey } = require('./auth');
const { setupSocket, createLogger, activityLog } = require('./socket');
const { getDashboardData } = require('./dashboard');
const { loadGlobalSettings } = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const sessionMiddleware = session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000
    }
});

app.use(sessionMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(authRouter);

const addLog = createLogger(io);

// API routes
app.get('/api/dashboard', requireAuth, requireApiKey, (req, res) => {
    const data = getDashboardData();
    if (!data) return res.status(503).json({ error: 'Bot belum ready' });
    res.json(data);
});

app.get('/api/logs', requireAuth, requireApiKey, (_req, res) => {
    res.json(activityLog);
});

app.get('/api/settings', requireAuth, requireApiKey, (req, res) => {
    const guildId = req.query.guildId || null;
    const data = { globalSettings: loadGlobalSettings() };
    res.json(data);
});

app.use(requireAuth, express.static(path.join(__dirname, '..', 'public')));

// Socket.IO auth
io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, (err) => {
        if (err) return next(err);
        if (socket.request.session?.authenticated) return next();
        next(new Error('Unauthorized'));
    });
});

function broadcastUpdate() {
    const data = getDashboardData();
    if (data) io.emit('dashboard_update', data);
}

const socketHandlers = setupSocket(io, addLog, broadcastUpdate);

function startServer() {
    server.listen(config.panelPort, '0.0.0.0', () => {
        console.log(`🌐 Panel control aktif di http://0.0.0.0:${config.panelPort}`);
    });
}

module.exports = { app, server, io, addLog, broadcastUpdate, startServer, socketHandlers };
