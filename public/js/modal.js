let currentMoveTarget = null;
let moveChannelDropdown = null;

function initMoveModalDropdown() {
    const container = document.getElementById('modal-channel-container');
    if (!container) return;
    if (moveChannelDropdown) return;

    moveChannelDropdown = new CustomDropdown({
        container,
        placeholder: 'Select channel...',
        value: '',
        onChange: (val) => {
            document.getElementById('modal-confirm-btn').disabled = !val;
        }
    });
}

function openConnectModal() {
    currentMoveTarget = 'connect';
    document.getElementById('modal-title').innerHTML = 'Connect to <span id="move-target-name">a voice channel</span>';
    document.getElementById('modal-confirm-btn').innerHTML = '<i data-lucide="cable" style="width:14px;height:14px;"></i> Connect';
    setupModalChannels();
}

function openMoveModal(target, username) {
    currentMoveTarget = target;
    const label = target === 'bot' ? 'Bot' : (username || 'User');
    document.getElementById('modal-title').innerHTML = 'Move <span id="move-target-name">' + label + '</span>';
    document.getElementById('modal-confirm-btn').innerHTML = '<i data-lucide="check" style="width:14px;height:14px;"></i> Confirm Move';
    setupModalChannels();
}

function setupModalChannels() {
    initMoveModalDropdown();

    const options = cachedVoiceChannels.map(c => ({
        value: c.id,
        label: c.name,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#23A55A"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
    }));

    if (options.length === 0) {
        options.push({ value: '', label: 'No channels available', icon: '' });
    }

    moveChannelDropdown.setOptions(options);
    if (options.length > 0 && options[0].value) {
        moveChannelDropdown.setValue(options[0].value);
    }

    document.getElementById('modal-confirm-btn').disabled = options.length === 0 || !options[0].value;

    document.getElementById('move-modal').classList.add('open');
    refreshIcons();
}

function closeMoveModal() {
    document.getElementById('move-modal').classList.remove('open');
    currentMoveTarget = null;
}

function confirmMove() {
    const channelId = moveChannelDropdown ? moveChannelDropdown.getValue() : '';
    if (!channelId) return alert('Please select a channel first!');

    if (currentMoveTarget === 'connect') {
        socket.emit('bot_action', { action: 'connect', targetChannelId: channelId, guildId: currentGuildId });
    } else if (currentMoveTarget === 'bot') {
        socket.emit('bot_action', { action: 'move_bot', targetChannelId: channelId, guildId: currentGuildId });
    } else {
        socket.emit('member_action', { userId: currentMoveTarget, action: 'move', targetChannelId: channelId, guildId: currentGuildId });
    }
    closeMoveModal();
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('move-modal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === this) closeMoveModal();
        });
    }
});
