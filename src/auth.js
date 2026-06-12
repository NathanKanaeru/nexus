const express = require('express');
const config = require('./config');

const router = express.Router();
const loginAttempts = new Map();

function loginRateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const entry = loginAttempts.get(ip) || { count: 0, resetAt: now + 60000 };
    if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60000; }
    entry.count++;
    loginAttempts.set(ip, entry);
    if (entry.count > 10) {
        return res.status(429).send('Too many login attempts. Try again in a minute.');
    }
    next();
}

function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) return next();
    if (config.apiKey) {
        const key = req.headers['x-api-key'] || req.query.api_key;
        if (key === config.apiKey) return next();
    }
    if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.redirect('/login');
}

function requireApiKey(req, res, next) {
    if (!config.apiKey) return next();
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key === config.apiKey) return next();
    res.status(401).json({ error: 'Invalid or missing API key' });
}

router.get('/login', (req, res) => {
    if (req.session?.authenticated) return res.redirect('/');
    res.sendFile(require('path').join(__dirname, '..', 'public', 'login.html'));
});

router.post('/login', loginRateLimit, (req, res) => {
    const { username, password } = req.body;
    if (username === config.panelUsername && password === config.panelPassword) {
        req.session.authenticated = true;
        req.session.loginTime = Date.now();
        return res.redirect('/');
    }
    res.redirect('/login?error=1');
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = { router, requireAuth, requireApiKey };
