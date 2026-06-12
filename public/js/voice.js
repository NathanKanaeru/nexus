let cachedVoiceChannels = [];
let voiceConnectDropdown = null;

function initVoiceConnectDropdown() {
    const container = document.getElementById('voice-connect-container');
    if (!container) return;
    if (voiceConnectDropdown) return;

    voiceConnectDropdown = new CustomDropdown({
        container,
        placeholder: 'Select a voice channel...',
        value: '',
        onChange: (val) => {
            document.getElementById('voice-connect-btn').disabled = !val;
        }
    });
}

function refreshVoiceConnectDropdown() {
    const guild = guildsData[currentGuildId];
    if (!guild) return;

    initVoiceConnectDropdown();

    const channels = buildVoiceChannels(guild);
    const options = channels.map(c => ({
        value: c.id,
        label: c.name,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#23A55A"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
    }));

    if (voiceConnectDropdown) {
        voiceConnectDropdown.setOptions(options);
        if (options.length > 0 && options[0].value) {
            voiceConnectDropdown.setValue(options[0].value);
        }
        const btn = document.getElementById('voice-connect-btn');
        if (btn) btn.disabled = options.length === 0 || !options[0].value;
    }
}

function buildVoiceChannels(guild) {
    if (guild.voiceChannels && guild.voiceChannels.length > 0) return guild.voiceChannels;
    if (guild.voice && guild.voice.channelId) {
        const id = guild.voice.channelId;
        const name = guild.voice.channelName || 'Unknown';
        return [{ id, name }];
    }
    return [];
}

function connectBotFromVoiceTab() {
    const channelId = voiceConnectDropdown ? voiceConnectDropdown.getValue() : '';
    if (!channelId) return;
    socket.emit('bot_action', { action: 'connect', targetChannelId: channelId, guildId: currentGuildId });
}

function botAction(action) {
    socket.emit('bot_action', { action, guildId: currentGuildId });
}

function disconnectBotFromVoice() {
    socket.emit('bot_action', { action: 'disconnect', guildId: currentGuildId });
}

function renderMembers(members) {
    const list = document.getElementById('members-list');
    if (!members || members.length === 0) {
        list.innerHTML = '<div class="empty-state"><i data-lucide="radio" style="width:32px;height:32px;margin:0 auto 12px;opacity:0.4;"></i><p style="font-style:italic;">Channel is empty</p></div>';
        refreshIcons();
        return;
    }
    list.innerHTML = members.map((m, i) => {
        const mutedClass = m.isMuted ? 'btn-red' : 'btn-ghost';
        const deafClass = m.isDeaf ? 'btn-red' : 'btn-ghost';
        const statusColor = m.isMuted || m.isDeaf ? 'var(--dnd)' : 'var(--online)';
        return '<div class="member-card" data-member-id="' + m.id + '" data-muted="' + m.isMuted + '" data-deaf="' + m.isDeaf + '" style="animation-delay:' + (i * 0.04) + 's">' +
            '<div class="member-avatar-ring">' +
                '<img src="' + m.avatar + '" alt="' + escHtml(m.username) + '" onerror="this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'">' +
                '<div class="member-status" style="background:' + statusColor + ';"></div>' +
            '</div>' +
            '<div style="flex:1;min-width:0;">' +
                '<div style="font-weight:600;font-size:0.875rem;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
                    escHtml(m.username) +
                    (m.isBot ? ' <span style="font-size:0.55rem;background:var(--primary);color:white;padding:2px 6px;border-radius:var(--radius-sm);font-weight:700;vertical-align:middle;">BOT</span>' : '') +
                '</div>' +
                '<div style="display:flex;gap:6px;margin-top:4px;">' +
                    '<span data-badge="muted" class="badge badge-red" style="font-size:0.55rem;padding:1px 6px;display:' + (m.isMuted ? 'inline-flex' : 'none') + ';"><i data-lucide="mic-off" style="width:10px;height:10px;"></i> Muted</span>' +
                    '<span data-badge="deafened" class="badge badge-red" style="font-size:0.55rem;padding:1px 6px;display:' + (m.isDeaf ? 'inline-flex' : 'none') + ';"><i data-lucide="ear-off" style="width:10px;height:10px;"></i> Deafened</span>' +
                '</div>' +
            '</div>' +
            '<div style="display:flex;gap:5px;flex-shrink:0;">' +
                '<button class="btn btn-icon ' + mutedClass + '" data-action="mute" onclick="memberAction(\'' + m.id + '\',\'mute\')" title="' + (m.isMuted ? 'Unmute' : 'Mute') + '">' +
                    '<i data-lucide="mic-off" style="width:13px;height:13px;"></i>' +
                '</button>' +
                '<button class="btn btn-icon ' + deafClass + '" data-action="deafen" onclick="memberAction(\'' + m.id + '\',\'deafen\')" title="' + (m.isDeaf ? 'Undeafen' : 'Deafen') + '">' +
                    '<i data-lucide="ear-off" style="width:13px;height:13px;"></i>' +
                '</button>' +
                '<button class="btn btn-icon btn-blue" onclick="openMoveModal(\'' + m.id + '\',\'' + escHtml(m.username).replace(/'/g, "\\'") + '\')" title="Move">' +
                    '<i data-lucide="move" style="width:13px;height:13px;"></i>' +
                '</button>' +
                '<button class="btn btn-icon btn-red" onclick="memberAction(\'' + m.id + '\',\'kick\')" title="Kick from voice">' +
                    '<i data-lucide="user-x" style="width:13px;height:13px;"></i>' +
                '</button>' +
            '</div>' +
        '</div>';
    }).join('');
    refreshIcons();
}

function memberAction(userId, action) {
    socket.emit('member_action', { userId, action, guildId: currentGuildId });
    if (action === 'mute' || action === 'deafen') {
        const memberCard = document.querySelector('[data-member-id="' + userId + '"]');
        if (!memberCard) return;
        if (action === 'mute') {
            const isMuted = memberCard.dataset.muted === 'true';
            const newMuted = !isMuted;
            memberCard.dataset.muted = newMuted;
            const muteBtn = memberCard.querySelector('[data-action="mute"]');
            const muteBadge = memberCard.querySelector('[data-badge="muted"]');
            if (muteBtn) {
                muteBtn.className = 'btn btn-icon ' + (newMuted ? 'btn-red' : 'btn-ghost');
                muteBtn.title = newMuted ? 'Unmute' : 'Mute';
            }
            if (muteBadge) muteBadge.style.display = newMuted ? 'inline-flex' : 'none';
        }
        if (action === 'deafen') {
            const isDeaf = memberCard.dataset.deaf === 'true';
            const newDeaf = !isDeaf;
            memberCard.dataset.deaf = newDeaf;
            const deafBtn = memberCard.querySelector('[data-action="deafen"]');
            const deafBadge = memberCard.querySelector('[data-badge="deafened"]');
            if (deafBtn) {
                deafBtn.className = 'btn btn-icon ' + (newDeaf ? 'btn-red' : 'btn-ghost');
                deafBtn.title = newDeaf ? 'Undeafen' : 'Deafen';
            }
            if (deafBadge) deafBadge.style.display = newDeaf ? 'inline-flex' : 'none';
        }
    }
}

function bulkAction(action) {
    socket.emit('bulk_action', { action, guildId: currentGuildId });
}

function confirmKickAll() {
    if (confirm('Kick ALL members from voice channel? This cannot be undone.')) bulkAction('kick_all');
}
