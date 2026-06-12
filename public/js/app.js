const tabTitles = {
    dashboard: 'Dashboard',
    voice: 'Voice Control',
    dm: 'DM Chat',
    announce: 'Announce',
    logs: 'Activity Log',
    settings: 'Settings'
};

let currentTab = 'dashboard';

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const tabEl = document.getElementById('tab-' + tab);
    const navEl = document.getElementById('nav-' + tab);
    if (tabEl) tabEl.classList.add('active');
    if (navEl) navEl.classList.add('active');
    document.getElementById('page-title').textContent = tabTitles[tab] || tab;
    if (tab === 'dashboard') {
        refreshCurrentGuildViews();
    }
    if (tab === 'announce') {
        refreshAnnounceChannels();
    }
    if (tab === 'logs') {
        document.getElementById('log-badge').style.display = 'none';
        socket.emit('get_logs');
    }
    if (tab === 'settings') {
        socket.emit('get_settings', { guildId: currentGuildId });
    }
}

function setConnectionStatus(connected) {
    const pill = document.getElementById('connection-status');
    const dot = document.getElementById('conn-dot');
    const text = document.getElementById('conn-text');
    const sidebarDot = document.getElementById('sidebar-dot');
    const sidebarDotInner = document.getElementById('sidebar-dot-indicator');
    const sidebarText = document.getElementById('sidebar-status-text');
    if (connected) {
        pill.style.background = 'rgba(35,165,90,0.12)';
        pill.style.color = 'var(--online)';
        pill.style.borderColor = 'rgba(35,165,90,0.25)';
        pill.style.border = '1px solid rgba(35,165,90,0.25)';
        dot.className = 'pulse-dot green live';
        text.textContent = 'Live';
        if (sidebarDot) sidebarDot.style.background = 'var(--online)';
        if (sidebarDotInner) { sidebarDotInner.style.background = 'var(--online)'; sidebarDotInner.className = 'pulse-dot green'; }
        sidebarText.textContent = 'Online';
    } else {
        pill.style.background = 'rgba(242,63,67,0.12)';
        pill.style.color = 'var(--dnd)';
        pill.style.borderColor = 'rgba(242,63,67,0.25)';
        pill.style.border = '1px solid rgba(242,63,67,0.25)';
        dot.className = 'pulse-dot red';
        text.textContent = 'Disconnected';
        if (sidebarDot) sidebarDot.style.background = 'var(--offline)';
        if (sidebarDotInner) { sidebarDotInner.style.background = 'var(--offline)'; sidebarDotInner.className = 'pulse-dot'; }
        sidebarText.textContent = 'Offline';
    }
}

let dashboardReceived = false;

function tryRestFallback() {
    if (dashboardReceived) return;
    fetch('/api/dashboard')
        .then(r => r.json())
        .then(data => {
            if (data && !data.error) {
                dashboardReceived = true;
                guildsData = data.guilds || {};
                const ids = Object.keys(guildsData);
                if (ids.length > 0 && !currentGuildId) currentGuildId = ids[0];
                updateDashboard(data);
            } else {
                setTimeout(tryRestFallback, 3000);
            }
        })
        .catch(() => setTimeout(tryRestFallback, 3000));
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setStatus(el, msg, color) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = color;
    setTimeout(() => { el.textContent = ''; }, 5000);
}

function switchGuild(guildId) {
    currentGuildId = guildId;
    const guild = guildsData[guildId];
    if (guild) {
        const snEl = document.getElementById('server-name');
        if (snEl) snEl.textContent = guild.server.name;
        const smEl = document.getElementById('server-members');
        if (smEl) smEl.textContent = guild.server.memberCount;
        const icon = document.getElementById('server-icon');
        if (icon && guild.server.icon) icon.src = guild.server.icon;
        if (guildDropdown) guildDropdown.setValue(guildId);
        refreshCurrentGuildViews();
    }
}

function refreshCurrentGuildViews() {
    try {
        const guild = guildsData[currentGuildId];
        if (!guild) return;

        const isConnected = guild.voice && guild.voice.status === 'Connected';

        // Dashboard voice channel info
        const vStatus = document.getElementById('dash-server-voice');
        const vBadge = document.getElementById('dash-server-status');
        if (isConnected) {
            if (vStatus) vStatus.textContent = guild.voice.channelName;
            if (vBadge) vBadge.innerHTML = '<span class="badge badge-green"><span class="pulse-dot green" style="width:6px;height:6px;"></span> Connected</span>';
        } else {
            if (vStatus) vStatus.textContent = 'Not connected';
            if (vBadge) vBadge.innerHTML = '<span class="badge badge-red">Disconnected</span>';
        }

        // Voice tab: toggle connected/disconnected sections
        const connectedSection = document.getElementById('voice-connected-section');
        const disconnectedSection = document.getElementById('voice-disconnected-section');
        if (connectedSection) connectedSection.style.display = isConnected ? 'block' : 'none';
        if (disconnectedSection) disconnectedSection.style.display = isConnected ? 'none' : 'block';

        const vNameVoice = document.getElementById('voice-channel-name-voice');
        if (isConnected) {
            if (vNameVoice) vNameVoice.textContent = guild.voice.channelName;
        } else {
            if (vNameVoice) vNameVoice.textContent = 'Not connected';
        }

        cachedVoiceChannels = guild.voiceChannels;

        const memberCountBadge = document.getElementById('voice-member-count');
        if (memberCountBadge) {
            memberCountBadge.textContent = guild.members.length + ' member' + (guild.members.length !== 1 ? 's' : '');
        }

        renderMembers(guild.members);

        if (!userDropdownPopulated && guild.allServerUsers && guild.allServerUsers.length > 0) {
            userDropdownPopulated = true;
        }

        if (guild.textChannels) {
            refreshAnnounceChannels();
        }

        // Always refresh voice connect dropdown & settings dropdown
        if (guild.voiceChannels) {
            refreshVoiceConnectDropdown();

            initSettingsChannelDropdown();
            if (settingsChannelDropdown) {
                const options = guild.voiceChannels.map(c => ({
                    value: c.id,
                    label: c.name,
                    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#23A55A"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
                }));
                if (options.length === 0) {
                    options.push({ value: '', label: 'No voice channels', icon: '' });
                }
                settingsChannelDropdown.setOptions(options);
                if (guild.guildSettings && guild.guildSettings.defaultChannelId) {
                    settingsChannelDropdown.setValue(guild.guildSettings.defaultChannelId);
                }
            }
            const autoJoin = document.getElementById('settings-auto-join');
            if (autoJoin && guild.guildSettings) {
                autoJoin.checked = guild.guildSettings.autoJoinOnStart !== false;
            }
        } else {
            // No voice channels – still init dropdown so it's ready
            refreshVoiceConnectDropdown();
        }

        // Dashboard server info
        const dashNameEl = document.getElementById('dash-server-name');
        const dashMembersEl = document.getElementById('dash-server-members');
        if (dashNameEl) dashNameEl.textContent = (guild.server && guild.server.name) || 'Untitled';
        if (dashMembersEl) dashMembersEl.textContent = (guild.server && guild.server.memberCount) ?? '0';
    } catch (e) {
        console.error('refreshCurrentGuildViews error:', e);
    }
}
