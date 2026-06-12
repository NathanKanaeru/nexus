let guildDropdown = null;

function initGuildDropdown() {
    const container = document.getElementById('guild-selector-container');
    if (!container) return;
    if (guildDropdown) return;

    guildDropdown = new CustomDropdown({
        container,
        placeholder: 'Select server...',
        value: '',
        onChange: (val) => {
            if (val) switchGuild(val);
        }
    });
}

function refreshGuildDropdown() {
    initGuildDropdown();
    if (!guildDropdown) return;

    const ids = Object.keys(guildsData);
    const options = ids.map(id => {
        const g = guildsData[id];
        return {
            value: id,
            label: g ? g.server.name : id,
            icon: g && g.server.icon
                ? '<img src="' + g.server.icon + '" style="width:18px;height:18px;border-radius:50%;object-fit:cover;">'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary)"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>'
        };
    });

    guildDropdown.setOptions(options);
    if (currentGuildId && ids.includes(currentGuildId)) {
        guildDropdown.setValue(currentGuildId);
    }
}

function updateDashboard(data) {
    if (data.stats) {
        document.getElementById('stat-ping').textContent = data.stats.ping + ' ms';
        document.getElementById('stat-uptime').textContent = data.stats.uptime + ' min';
        document.getElementById('stat-guilds').textContent = data.stats.guilds;
        document.getElementById('stat-users').textContent = data.stats.users;
    }

    guildsData = data.guilds || {};

    if (!currentGuildId || !guildsData[currentGuildId]) {
        const ids = Object.keys(guildsData);
        currentGuildId = ids.length > 0 ? ids[0] : null;
    }

    refreshGuildDropdown();

    if (data.botInfo) {
        const avatarEl = document.getElementById('settings-bot-avatar');
        const nameEl = document.getElementById('settings-bot-username');
        if (avatarEl) avatarEl.src = data.botInfo.avatar;
        if (nameEl) nameEl.textContent = data.botInfo.username;

        // Dashboard bot info
        const dashBotName = document.getElementById('dash-bot-name');
        const dashBotStatus = document.getElementById('dash-bot-status');
        const dashBotActivity = document.getElementById('dash-bot-activity');
        const dashBotId = document.getElementById('dash-bot-id');
        if (dashBotName) dashBotName.textContent = data.botInfo.username + '#' + (data.botInfo.tag ? data.botInfo.tag.split('#')[1] || '0000' : '0000');
        if (dashBotStatus) {
            const statusColors = { online: '#23A55A', idle: '#F0B232', dnd: '#F23F43', invisible: '#80848E', offline: '#80848E' };
            const sc = statusColors[data.botInfo.status] || '#80848E';
            const labels = { online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', invisible: 'Invisible', offline: 'Offline' };
            dashBotStatus.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:50%;background:' + sc + ';"></span>' + (labels[data.botInfo.status] || 'Unknown') + '</span>';
        }
        if (dashBotActivity) {
            const typeLabels = { PLAYING: 'Playing', WATCHING: 'Watching', LISTENING: 'Listening to', COMPETING: 'Competing in', STREAMING: 'Streaming' };
            const act = data.botInfo.activityText;
            dashBotActivity.textContent = act ? (typeLabels[data.botInfo.activityType] || '') + ' ' + act : 'No activity';
        }
        if (dashBotId) dashBotId.textContent = data.botInfo.id;
    }

    if (currentGuildId && guildsData[currentGuildId]) {
        const guild = guildsData[currentGuildId];
        const snEl = document.getElementById('server-name');
        if (snEl) snEl.textContent = guild.server.name;
        const smEl = document.getElementById('server-members');
        if (smEl) smEl.textContent = guild.server.memberCount;
        const icon = document.getElementById('server-icon');
        if (icon && guild.server.icon) icon.src = guild.server.icon;
    }

    renderDMUsers(getCurrentGuildUsers());

    refreshCurrentGuildViews();
    refreshIcons();
}

function getCurrentGuildUsers() {
    const seen = new Set();
    const users = [];
    for (const id of Object.keys(guildsData)) {
        const guild = guildsData[id];
        if (guild && guild.allServerUsers) {
            for (const u of guild.allServerUsers) {
                if (!seen.has(u.id)) {
                    seen.add(u.id);
                    users.push(u);
                }
            }
        }
    }
    return users;
}
