const logColors = { system: '#6366f1', voice: '#22d3ee', moderation: '#f59e0b', message: '#34d399', settings: '#a78bfa' };
const logIcons = { system: 'monitor', voice: 'mic-2', moderation: 'gavel', message: 'message-square', settings: 'sliders' };

socket.on('logs_history', (logs) => renderLogs(logs));
socket.on('activity_log', (entry) => {
    prependLog(entry);
    if (currentTab !== 'logs') document.getElementById('log-badge').style.display = 'inline-flex';
});

function renderLogs(logs) {
    const list = document.getElementById('logs-list');
    if (!logs || logs.length === 0) {
        list.innerHTML = '<div class="empty-state" style="padding:40px 20px;"><i data-lucide="scroll-text" style="width:32px;height:32px;margin:0 auto 12px;opacity:0.3;"></i><p style="font-style:italic;">No activity yet</p></div>';
        return;
    }
    list.innerHTML = logs.map(e => logEntryHTML(e)).join('');
}

function prependLog(entry) {
    const list = document.getElementById('logs-list');
    if (list.querySelector('[data-placeholder]')) list.innerHTML = '';
    const div = document.createElement('div');
    div.innerHTML = logEntryHTML(entry);
    list.insertBefore(div.firstChild, list.firstChild);
}

function logEntryHTML(e) {
    const color = logColors[e.type] || '#94a3b8';
    const icon = logIcons[e.type] || 'circle-alert';
    const time = new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = new Date(e.time).toLocaleDateString([], { month: 'short', day: 'numeric' });
    return '<div class="log-entry">' +
        '<div style="width:32px;height:32px;border-radius:8px;background:' + color + '18;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid ' + color + '30;">' +
            '<i data-lucide="' + icon + '" style="width:14px;height:14px;color:' + color + ';"></i>' +
        '</div>' +
        '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:0.8rem;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escHtml(e.message) + '</div>' +
            '<div style="font-size:0.65rem;color:var(--ink-muted);margin-top:3px;text-transform:capitalize;display:flex;align-items:center;gap:6px;">' +
                '<span style="width:6px;height:6px;border-radius:50%;background:' + color + ';display:inline-block;"></span>' +
                e.type +
            '</div>' +
        '</div>' +
        '<div style="font-size:0.65rem;color:var(--ink-muted);text-align:right;flex-shrink:0;line-height:1.4;"><div>' + time + '</div><div style="opacity:0.6;">' + date + '</div></div>' +
    '</div>';
}

function clearLogs() {
    document.getElementById('logs-list').innerHTML = '<div data-placeholder class="empty-state" style="padding:40px 20px;"><i data-lucide="scroll-text" style="width:32px;height:32px;margin:0 auto 12px;opacity:0.3;"></i><p style="font-style:italic;color:var(--ink-muted);">Display cleared — new events will appear here</p></div>';
}
