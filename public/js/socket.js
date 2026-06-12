const socket = io();

let currentGuildId = null;
let guildsData = {};

socket.on('connect', () => setConnectionStatus(true));
socket.on('disconnect', () => setConnectionStatus(false));
socket.on('connect_error', (err) => {
    if (err.message === 'Unauthorized') {
        window.location.href = '/login';
    }
});

socket.on('bot_status', ({ ready, message }) => {
    if (!ready) {
        document.getElementById('server-name').textContent = message || 'Bot connecting...';
        document.getElementById('sidebar-status-text').textContent = 'Connecting...';
    }
});

socket.on('dashboard_update', (data) => {
    if (!data) return;
    dashboardReceived = true;
    guildsData = data.guilds || {};

    if (!currentGuildId || !guildsData[currentGuildId]) {
        const ids = Object.keys(guildsData);
        currentGuildId = ids.length > 0 ? ids[0] : null;
    }

    updateDashboard(data);

    // Direct fallback: populate dashboard & voice elements from guildsData
    if (currentGuildId && guildsData[currentGuildId]) {
        const g = guildsData[currentGuildId];
        const dn = document.getElementById('dash-server-name');
        if (dn) dn.textContent = g.server.name || 'Untitled';
        const dm = document.getElementById('dash-server-members');
        if (dm) dm.textContent = g.server.memberCount ?? '0';

        // Voice connect button state
        refreshVoiceConnectDropdown();
    }
});
