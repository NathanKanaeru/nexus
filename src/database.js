const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'chats.json');
const SETTINGS_FILE = path.join(__dirname, '..', 'settings.json');

const globalDefaults = {
    statusType: 'online',
    activityType: 'PLAYING',
    activityText: '',
    panelTitle: 'Nexus Bot Panel',
};

function loadStructure(data) {
    if (!data) data = {};
    return {
        global: { ...globalDefaults, ...(data.global || {}) },
        guilds: data.guilds || {},
    };
}

function loadRaw() {
    if (!fs.existsSync(SETTINGS_FILE)) return null;
    try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); }
    catch (e) { return null; }
}

function saveRaw(data) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

function loadGlobalSettings() {
    const raw = loadRaw();
    const structure = loadStructure(raw);
    return structure.global;
}

function saveGlobalSettings(data) {
    const raw = loadRaw() || {};
    const structure = loadStructure(raw);
    structure.global = { ...structure.global, ...data };
    saveRaw(structure);
}

function loadGuildSettings(guildId) {
    const raw = loadRaw();
    const structure = loadStructure(raw);
    return structure.guilds[guildId] || {};
}

function saveGuildSettings(guildId, data) {
    const raw = loadRaw() || {};
    const structure = loadStructure(raw);
    if (!structure.guilds[guildId]) structure.guilds[guildId] = {};
    structure.guilds[guildId] = { ...structure.guilds[guildId], ...data };
    saveRaw(structure);
}

function loadChats() {
    if (!fs.existsSync(DB_FILE)) return {};
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
    catch (e) { return {}; }
}

function saveChats(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
    loadGlobalSettings, saveGlobalSettings,
    loadGuildSettings, saveGuildSettings,
    loadChats, saveChats,
};
