let announceDropdown = null;

function initAnnounceDropdown() {
    const container = document.getElementById('announce-channel-container');
    if (!container) return;

    if (announceDropdown) {
        announceDropdown.setOptions([]);
        return;
    }

    announceDropdown = new CustomDropdown({
        container,
        placeholder: 'Select a channel...',
        value: '',
        onChange: (val) => {
            document.getElementById('btn-send-announce').disabled = !val;
        }
    });
}

function refreshAnnounceChannels() {
    const guild = guildsData[currentGuildId];
    if (!guild) return;

    const serverName = document.getElementById('announce-server-name');
    if (serverName) serverName.textContent = guild.server.name || 'Current server';

    const channels = guild.textChannels || [];
    const options = channels.map(c => ({
        value: c.id,
        label: '# ' + c.name,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#949BA4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
    }));

    if (!announceDropdown) initAnnounceDropdown();
    if (announceDropdown) {
        announceDropdown.setOptions(options);
        if (options.length > 0) announceDropdown.setValue(options[0].value);
    }
}

function sendAnnounce() {
    if (!announceDropdown) return;
    const channelId = announceDropdown.getValue();
    const message = document.getElementById('announce-message').value.trim();
    const status = document.getElementById('announce-status');
    if (!channelId) return setStatus(status, 'Please select a channel', '#f87171');
    if (!message) return setStatus(status, 'Message cannot be empty', '#f87171');
    socket.emit('announce', { channelId, message, guildId: currentGuildId });
    setStatus(status, 'Sending...', '#64748b');
    document.getElementById('btn-send-announce').disabled = true;
}

socket.on('announce_success', (msg) => {
    setStatus(document.getElementById('announce-status'), '✓ ' + msg, '#34d399');
    document.getElementById('announce-message').value = '';
    document.getElementById('btn-send-announce').disabled = false;
});

socket.on('announce_error', (err) => {
    setStatus(document.getElementById('announce-status'), '✗ ' + err, '#f87171');
    document.getElementById('btn-send-announce').disabled = false;
});

function sendBroadcast() {
    const message = document.getElementById('broadcast-message').value.trim();
    const status = document.getElementById('broadcast-status');
    if (!message) return setStatus(status, 'Message cannot be empty', '#f87171');
    socket.emit('broadcast_message', { message, guildId: currentGuildId });
    setStatus(status, 'Sending...', '#64748b');
    document.getElementById('btn-send-broadcast').disabled = true;
}

socket.on('broadcast_result', ({ sent, failed }) => {
    setStatus(document.getElementById('broadcast-status'),
        '✓ Sent to ' + sent + ' member' + (sent !== 1 ? 's' : '') +
        (failed > 0 ? ', ' + failed + ' failed' : ''),
        '#34d399');
    document.getElementById('broadcast-message').value = '';
    document.getElementById('btn-send-broadcast').disabled = false;
});
