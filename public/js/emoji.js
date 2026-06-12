const emojiCategories = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
    gestures: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🫀', '🫁', '🧠', '🦷', '🦴', '👀', '👁', '👅', '👄'],
    hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳'],
    objects: ['🎮', '🕹', '🎲', '🎯', '🎳', '🎰', '🎪', '🎭', '🎨', '🖼', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🎷', '🎸', '🎹', '🎺', '🎻', '🥁', '🪘', '📱', '💻', '🖥', '🖨', '⌨️', '🖱', '🖲', '💾', '💿', '📀', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎️', '📟', '📠', '📺', '📻', '🧭', '⏱', '⏲', '⏰', '🕰', '⌚', '⏳', '⌛'],
    symbols: ['🔥', '💥', '✨', '🌟', '⭐', '🌈', '☀️', '🌤', '⛅', '🌥', '☁️', '🌦', '🌧', '⛈', '🌩', '🌨', '❄️', '☃️', '⛄', '🌬', '💨', '🌪', '🌫', '🌊', '💧', '💦', '☔', '⚡', '🌀', '🌈', '🎆', '🎇', '🧨', '✅', '❎', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔲', '🔳']
};
let currentEmojiCat = 'smileys';

function setEmojiCategory(cat) {
    currentEmojiCat = cat;
    document.querySelectorAll('.emoji-cat-btn').forEach(b => {
        b.style.background = 'none';
        b.style.color = '#949ba4';
    });
    const active = document.getElementById('ecat-' + cat);
    if (active) {
        active.style.background = 'rgba(255,255,255,0.1)';
        active.style.color = '#dbdee1';
    }
    renderEmojiGrid();
}

function renderEmojiGrid() {
    const grid = document.getElementById('emoji-grid');
    if (!grid) return;
    grid.innerHTML = (emojiCategories[currentEmojiCat] || []).map(e =>
        '<button onclick="insertEmoji(\'' + e + '\')" style="background:none;border:none;cursor:pointer;font-size:1.3rem;padding:4px;border-radius:4px;line-height:1;" onmouseover="this.style.background=\'rgba(255,255,255,0.1)\'" onmouseout="this.style.background=\'none\'">' + e + '</button>'
    ).join('');
}

function toggleEmojiPicker(e) {
    if (e) e.stopPropagation();
    const picker = document.getElementById('emoji-picker');
    const isOpen = picker.style.display !== 'none';
    picker.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) renderEmojiGrid();
}

function insertEmoji(emoji) {
    const input = document.getElementById('chat-input');
    const pos = input.selectionStart;
    const val = input.value;
    input.value = val.slice(0, pos) + emoji + val.slice(pos);
    input.selectionStart = input.selectionEnd = pos + emoji.length;
    input.focus();
}

document.addEventListener('click', (e) => {
    const picker = document.getElementById('emoji-picker');
    const btn = document.getElementById('emoji-btn');
    if (picker && btn && !picker.contains(e.target) && !btn.contains(e.target)) {
        picker.style.display = 'none';
    }
});
