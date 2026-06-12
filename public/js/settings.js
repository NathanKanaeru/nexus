let settingsChannelDropdown = null;
let statusDropdown = null;
let activityDropdown = null;

const statusOptions = [
    { value: 'online', label: 'Online', icon: '<span style="width:10px;height:10px;border-radius:50%;background:#23A55A;display:inline-block;"></span>' },
    { value: 'idle', label: 'Idle', icon: '<span style="width:10px;height:10px;border-radius:50%;background:#F0B232;display:inline-block;"></span>' },
    { value: 'dnd', label: 'Do Not Disturb', icon: '<span style="width:10px;height:10px;border-radius:50%;background:#F23F43;display:inline-block;"></span>' },
    { value: 'invisible', label: 'Invisible', icon: '<span style="width:10px;height:10px;border-radius:50%;background:#80848E;display:inline-block;"></span>' },
];

const activityOptions = [
    { value: 'PLAYING', label: 'Playing', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#60A5FA"><polygon points="5 3 19 12 5 21 5 3"/></svg>' },
    { value: 'WATCHING', label: 'Watching', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#F0B232"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' },
    { value: 'LISTENING', label: 'Listening to', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#A78BFA"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' },
    { value: 'COMPETING', label: 'Competing in', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#34D399"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>' },
];

socket.on('settings_data', ({ globalSettings, guildSettings, botInfo, guildId }) => {
    if (botInfo) {
        document.getElementById('settings-bot-avatar').src = botInfo.avatar;
        document.getElementById('settings-bot-username').textContent = botInfo.username;
        document.getElementById('settings-bot-tag').textContent = botInfo.tag;
        document.getElementById('settings-bot-id').textContent = 'ID: ' + botInfo.id;
    }
    if (globalSettings) {
        initStatusDropdown();
        initActivityDropdown();
        if (statusDropdown) statusDropdown.setValue(globalSettings.statusType || 'online');
        if (activityDropdown) activityDropdown.setValue(globalSettings.activityType || 'PLAYING');
        document.getElementById('settings-activity-text').value = globalSettings.activityText || '';
        document.getElementById('settings-panel-title').value = globalSettings.panelTitle || 'Nexus Bot Panel';
    }
    applyGuildSettings(guildSettings);
});

function initStatusDropdown() {
    const container = document.getElementById('settings-status-container');
    if (!container || statusDropdown) return;
    statusDropdown = new CustomDropdown({
        container, options: statusOptions,
        value: 'online', placeholder: 'Select status...',
        onChange: () => {}
    });
}

function initActivityDropdown() {
    const container = document.getElementById('settings-activity-container');
    if (!container || activityDropdown) return;
    activityDropdown = new CustomDropdown({
        container, options: activityOptions,
        value: 'PLAYING', placeholder: 'Select activity...',
        onChange: () => {}
    });
}

function initSettingsChannelDropdown() {
    const container = document.getElementById('settings-channel-container');
    if (!container) return;
    if (settingsChannelDropdown) return;

    settingsChannelDropdown = new CustomDropdown({
        container,
        placeholder: 'Select voice channel...',
        value: '',
        onChange: (val) => {}
    });
}

function applyGuildSettings(guildSettings) {
    let gs = guildSettings;
    if (!gs || Object.keys(gs).length === 0) {
        const guild = guildsData[currentGuildId];
        if (guild && guild.guildSettings) gs = guild.guildSettings;
    }

    initSettingsChannelDropdown();

    const guild = guildsData[currentGuildId];
    if (guild && guild.voiceChannels && settingsChannelDropdown) {
        const options = guild.voiceChannels.map(c => ({
            value: c.id,
            label: c.name,
            icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#23A55A"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
        }));

        if (options.length === 0) {
            options.push({ value: '', label: 'No voice channels', icon: '' });
        }

        settingsChannelDropdown.setOptions(options);

        if (gs && gs.defaultChannelId) {
            settingsChannelDropdown.setValue(gs.defaultChannelId);
        }
    }

    if (gs) {
        const autoJoin = document.getElementById('settings-auto-join');
        if (autoJoin) autoJoin.checked = gs.autoJoinOnStart !== false;
    }
}

socket.on('settings_saved', ({ success, settings }) => {
    if (success) {
        const title = document.getElementById('settings-panel-title').value;
        if (title) document.title = title;
        const guild = guildsData[currentGuildId];
        if (guild && guild.guildSettings) {
            if (settingsChannelDropdown) {
                guild.guildSettings.defaultChannelId = settingsChannelDropdown.getValue();
            }
            guild.guildSettings.autoJoinOnStart = document.getElementById('settings-auto-join').checked;
        }
    }
});

socket.on('settings_result', ({ key, success, message, error }) => {
    const statusEl = document.getElementById('settings-' + key + '-status');
    if (!statusEl) return;
    if (success) {
        setStatus(statusEl, '✓ ' + message, '#34d399');
    } else {
        setStatus(statusEl, '✗ ' + error, '#f87171');
    }
});

function updateUsername() {
    const username = document.getElementById('settings-username-input').value.trim();
    if (!username) return;
    socket.emit('update_bot_username', { username });
    setStatus(document.getElementById('settings-username-status'), 'Updating...', '#64748b');
}

function updateAvatar() {
    const imageUrl = document.getElementById('settings-avatar-input').value.trim();
    if (!imageUrl) return;
    socket.emit('update_bot_avatar', { imageUrl });
    setStatus(document.getElementById('settings-avatar-status'), 'Updating...', '#64748b');
}

function savePresence() {
    const status = statusDropdown ? statusDropdown.getValue() : 'online';
    const activityType = activityDropdown ? activityDropdown.getValue() : 'PLAYING';
    const activityText = document.getElementById('settings-activity-text').value.trim();
    socket.emit('save_settings', { statusType: status, activityType, activityText });
    setStatus(document.getElementById('settings-presence-status'), 'Saving...', '#64748b');
}

function saveVoiceSettings() {
    const defaultChannelId = settingsChannelDropdown ? settingsChannelDropdown.getValue() : '';
    const autoJoinOnStart = document.getElementById('settings-auto-join').checked;
    socket.emit('save_settings', { defaultChannelId, autoJoinOnStart, guildId: currentGuildId });
    setStatus(document.getElementById('settings-voice-status'), 'Saving...', '#64748b');
}

function savePanelSettings() {
    const panelTitle = document.getElementById('settings-panel-title').value.trim() || 'Nexus Bot Panel';
    socket.emit('save_settings', { panelTitle });
    setStatus(document.getElementById('settings-panel-status'), 'Saving...', '#64748b');
}

function clearChatHistory() {
    if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
        socket.emit('clear_chat_history');
    }
}
