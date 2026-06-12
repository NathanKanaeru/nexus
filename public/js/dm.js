let currentChatUser = null;
let currentChatUserName = '';
let currentChatUserAvatar = '';
let replyState = null;

function renderDMUsers(users) {
    const list = document.getElementById('dm-user-list');
    if (!users || users.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:#949ba4;font-size:0.875rem;"><i data-lucide="loader" class="lucide-spin" style="width:16px;height:16px;margin:0 auto 8px;display:block;"></i>Waiting for users...</div>';
        refreshIcons();
        return;
    }
    const statusColors = { online: '#23A55A', idle: '#F0B232', dnd: '#F23F43', offline: '#80848E' };
    list.innerHTML = users.map(u => {
        const active = u.id === currentChatUser ? 'active' : '';
        const sc = statusColors[u.presence] || '#80848E';
        return '<div class="dm-user-item ' + active + '" data-user-id="' + u.id + '" onclick="selectDMUserMobile(\'' + u.id + '\',\'' + escHtml(u.username).replace(/'/g, "\\'") + '\',\'' + escHtml(u.avatar) + '\')">' +
            '<div class="user-avatar-wrap">' +
                '<img src="' + u.avatar + '" onerror="this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'">' +
                '<div class="user-presence-dot"><div class="user-presence-dot-inner" style="background:' + sc + ';"></div></div>' +
            '</div>' +
            '<div style="min-width:0;flex:1;">' +
                '<div style="font-size:0.875rem;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escHtml(u.username) + '</div>' +
                '<div style="font-size:0.65rem;color:var(--ink-muted);text-transform:capitalize;">' + u.presence + '</div>' +
            '</div>' +
        '</div>';
    }).join('');
    refreshIcons();
}

function selectDMUser(userId, username, avatar) {
    currentChatUser = userId;
    currentChatUserName = username;
    currentChatUserAvatar = avatar;

    document.querySelectorAll('.dm-user-item').forEach(el => el.classList.remove('active'));
    const selected = document.querySelector('[data-user-id="' + userId + '"]');
    if (selected) selected.classList.add('active');

    document.getElementById('chat-header-name').textContent = username;
    document.getElementById('chat-header-avatar').src = avatar;
    document.getElementById('chat-header-status').textContent = 'Chatting...';
    document.getElementById('chat-header-presence-inner').style.background = '#23A55A';
    document.getElementById('chat-input').disabled = false;
    document.getElementById('btn-send-chat').disabled = false;
    document.getElementById('chat-input').placeholder = 'Message @' + username;

    const container = document.getElementById('chat-messages');
    container.innerHTML = '<div data-placeholder style="display:flex;align-items:center;justify-content:center;height:100%;color:#949ba4;font-size:0.95rem;"><div><i data-lucide="loader" class="lucide-spin" style="width:32px;height:32px;margin:0 auto 12px;display:block;"></i>Loading messages...</div></div>';
    refreshIcons();

    socket.emit('get_dm_history', { userId });
}

socket.on('dm_history', ({ userId, messages }) => {
    if (userId !== currentChatUser) return;
    renderMessages(messages);
});

socket.on('dm_received', ({ userId, message, username }) => {
    if (userId === currentChatUser) {
        appendMessage(message);
    } else {
        document.getElementById('dm-badge').style.display = 'inline-flex';
    }
});

socket.on('dm_error', (err) => {
    alert(err);
});

function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg || !currentChatUser) return;
    const payload = { userId: currentChatUser, message: msg };
    if (replyState) payload.replyTo = replyState;
    socket.emit('send_dm', payload);
    input.value = '';
    cancelReply();
}

function showDMUsers() {
    document.getElementById('dm-user-panel').classList.remove('hidden');
}

function selectDMUserMobile(userId, username, avatar) {
    if (window.innerWidth <= 768) {
        document.getElementById('dm-user-panel').classList.add('hidden');
    }
    selectDMUser(userId, username, avatar);
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('chat-input');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendChat();
        });
    }
});

function renderMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!messages || messages.length === 0) {
        container.innerHTML = '<div data-placeholder style="display:flex;align-items:center;justify-content:center;height:100%;color:#949ba4;font-style:italic;font-size:0.875rem;text-align:center;padding:20px;"><div><i data-lucide="message-circle" style="width:32px;height:32px;margin:0 auto 8px;display:block;opacity:0.3;"></i>No messages yet</div></div>';
        refreshIcons();
        return;
    }
    container.innerHTML = '';
    let prevSender = null, prevTime = null;
    messages.forEach((m) => {
        const currTime = new Date(m.time);
        const sameGroup = prevSender === m.sender && prevTime && (currTime - prevTime) < 5 * 60 * 1000;
        appendMessage(m, false, sameGroup);
        prevSender = m.sender;
        prevTime = currTime;
    });
    container.scrollTop = container.scrollHeight;
}

function appendMessage(m, scrollToBottom = true, grouped = false) {
    const container = document.getElementById('chat-messages');
    const placeholder = container.querySelector('[data-placeholder]');
    if (placeholder) placeholder.remove();

    const isBot = m.sender === 'bot';
    const timeStr = new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullTime = new Date(m.time).toLocaleString();
    const msgId = 'msg-' + m.time + '-' + Math.random().toString(36).slice(2, 6);

    const avatarSrc = isBot
        ? (document.getElementById('settings-bot-avatar')?.src || 'https://cdn.discordapp.com/embed/avatars/0.png')
        : (currentChatUserAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png');
    const displayName = isBot ? (document.getElementById('settings-bot-username')?.textContent || 'Bot') : currentChatUserName;

    const wrapper = document.createElement('div');
    wrapper.id = msgId;
    wrapper.className = 'msg-wrapper' + (grouped ? ' grouped' : '');

    let replyHTML = '';
    if (m.replyTo) {
        replyHTML = '<div class="msg-reply" onclick="scrollToMsg(\'' + m.replyTo.msgId + '\')">' +
            '<div class="reply-line"></div>' +
            '<img src="' + escHtml(m.replyTo.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png') + '">' +
            '<span class="reply-name">' + escHtml(m.replyTo.name) + '</span>' +
            '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:300px;">' + escHtml(m.replyTo.text) + '</span>' +
        '</div>';
    }

    const actionBtns =
        '<div class="msg-actions">' +
            '<button onclick="startReply(\'' + msgId + '\',\'' + escHtml(displayName).replace(/'/g, "\\'") + '\',\'' + escHtml(m.text).replace(/'/g, "\\'") + '\',\'' + escHtml(avatarSrc).replace(/'/g, "\\'") + '\',\'' + msgId + '\')" title="Reply">↩</button>' +
        '</div>';

    if (grouped) {
        wrapper.innerHTML =
            '<span class="msg-hover-time">' + timeStr + '</span>' +
            '<div class="msg-content">' +
                replyHTML +
                '<div class="msg-text">' + escHtml(m.text) + '</div>' +
            '</div>' +
            actionBtns;
    } else {
        wrapper.innerHTML =
            '<img class="msg-avatar" src="' + escHtml(avatarSrc) + '" onerror="this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'">' +
            '<div class="msg-content">' +
                replyHTML +
                '<div class="msg-header">' +
                    '<span class="msg-author" style="' + (isBot ? 'color:var(--primary);' : '') + '">' + escHtml(displayName) + '</span>' +
                    '<span class="msg-time" title="' + fullTime + '">' + timeStr + '</span>' +
                '</div>' +
                '<div class="msg-text">' + escHtml(m.text) + '</div>' +
            '</div>' +
            actionBtns;
    }

    container.appendChild(wrapper);
    if (scrollToBottom) container.scrollTop = container.scrollHeight;
    refreshIcons();
}

function startReply(msgId, name, text, avatar, targetId) {
    replyState = { msgId: targetId, name, text, avatar };
    const bar = document.getElementById('reply-bar');
    bar.style.display = 'flex';
    document.getElementById('reply-to-name').textContent = name;
    document.getElementById('reply-preview').textContent = text.substring(0, 80) + (text.length > 80 ? '...' : '');
    document.getElementById('chat-input').focus();
    refreshIcons();
}

function cancelReply() {
    replyState = null;
    document.getElementById('reply-bar').style.display = 'none';
}

function scrollToMsg(msgId) {
    const el = document.getElementById(msgId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.background = 'rgba(88,101,242,0.15)';
        setTimeout(() => el.style.background = '', 1500);
    }
}
