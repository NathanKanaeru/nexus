require('dotenv').config();

const config = {
    token: process.env.TOKEN,
    clientId: process.env.CLIENT_ID,
    panelPort: process.env.PANEL_PORT || 3000,
    panelUsername: process.env.PANEL_USERNAME || 'admin',
    panelPassword: process.env.PANEL_PASSWORD || 'changeme123',
    apiKey: process.env.API_KEY || '',
    sessionSecret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
    qasimdevApiKey: process.env.QASIMDEV_API_KEY || '',
};

module.exports = config;
