const config = require('./config');
const voice = require('./voice');
const { loadChats, saveChats, loadGlobalSettings, saveGlobalSettings, loadGuildSettings, saveGuildSettings } = require('./database');
const { getClient } = require('./bot');
const { getDashboardData } = require('./dashboard');

function setupSocket(io, addLog, broadcastUpdate) {
    const activityTypeMap = { PLAYING: 0, STREAMING: 1, LISTENING: 2, WATCHING: 3, COMPETING: 5 };

    async function applyBotPresence(client, settings) {
        if (!client.user) return;
        const presenceData = { status: settings.statusType };
        if (settings.activityText) {
            presenceData.activities = [{
                name: settings.activityText,
                type: activityTypeMap[settings.activityType] ?? 0
            }];
        } else {
            presenceData.activities = [];
        }
        client.user.setPresence(presenceData);
    }

    function getGuild(guildId) {
        return getClient()?.guilds.cache.get(guildId);
    }

    io.on('connection', (socket) => {
        const initialData = getDashboardData();
        if (initialData) {
            socket.emit('dashboard_update', initialData);
        } else {
            socket.emit('bot_status', { ready: false, message: 'Bot sedang connecting ke Discord...' });
        }

        // Bot actions
        socket.on('bot_action', async ({ action, targetChannelId, guildId }) => {
            const guild = getGuild(guildId);
            if (!guild) return;
            const chId = targetChannelId || voice.getChannelId(guild.id);
            if (action === 'connect') {
                const r = voice.joinVoice(guild, chId);
                if (r.success) addLog('voice', `[${guild.name}] Bot joined: ${r.channelName}`);
            }
            if (action === 'disconnect') {
                if (voice.leaveVoice(guild.id)) addLog('voice', `[${guild.name}] Bot disconnected`);
            }
            if (action === 'reconnect') {
                voice.leaveVoice(guild.id);
                setTimeout(() => {
                    const r = voice.joinVoice(guild, chId);
                    if (r.success) addLog('voice', `[${guild.name}] Bot reconnected to: ${r.channelName}`);
                }, 1500);
            }
            if (action === 'move_bot' && targetChannelId) {
                const r = voice.joinVoice(guild, targetChannelId);
                if (r.success) addLog('voice', `[${guild.name}] Bot moved to: ${r.channelName}`);
            }
            broadcastUpdate();
        });

        // Member actions
        socket.on('member_action', async ({ userId, action, targetChannelId, guildId }) => {
            const guild = getGuild(guildId);
            if (!guild) return;
            const member = guild.members.cache.get(userId);
            if (!member || !member.voice.channel) return;
            try {
                if (action === 'mute') {
                    const newState = !member.voice.serverMute;
                    await member.voice.setMute(newState);
                    addLog('moderation', `[${guild.name}] ${newState ? 'Muted' : 'Unmuted'} ${member.user.username}`);
                }
                if (action === 'deafen') {
                    const newState = !member.voice.serverDeaf;
                    await member.voice.setDeaf(newState);
                    addLog('moderation', `[${guild.name}] ${newState ? 'Deafened' : 'Undeafened'} ${member.user.username}`);
                }
                if (action === 'kick') {
                    await member.voice.disconnect();
                    addLog('moderation', `[${guild.name}] Kicked ${member.user.username} from voice`);
                }
                if (action === 'move' && targetChannelId) {
                    await member.voice.setChannel(targetChannelId);
                    addLog('voice', `[${guild.name}] Moved ${member.user.username}`);
                }
                broadcastUpdate();
            } catch (e) { console.error("Gagal melakukan aksi:", e); }
        });

        // Bulk actions
        socket.on('bulk_action', async ({ action, guildId }) => {
            const guild = getGuild(guildId);
            if (!guild) return;
            const vc = guild.channels.cache.get(voice.getChannelId(guild.id));
            if (!vc) return;
            const members = vc.members.filter(m => !m.user.bot);
            const actions = {
                mute_all: [m => m.voice.setMute(true), 'Muted all'],
                unmute_all: [m => m.voice.setMute(false), 'Unmuted all'],
                deafen_all: [m => m.voice.setDeaf(true), 'Deafened all'],
                undeafen_all: [m => m.voice.setDeaf(false), 'Undeafened all'],
                kick_all: [m => m.voice.disconnect(), 'Kicked all'],
            };
            const [fn, label] = actions[action] || [];
            if (!fn) return;
            let count = 0;
            for (const [, m] of members) {
                try { await fn(m); count++; } catch (e) { }
            }
            addLog('moderation', `[${guild.name}] ${label} ${count} members in voice`);
            setTimeout(broadcastUpdate, 800);
        });

        // Broadcast DM
        socket.on('broadcast_message', async ({ message, guildId }) => {
            const guild = getGuild(guildId);
            if (!guild) return;
            const vc = guild.channels.cache.get(voice.getChannelId(guild.id));
            if (!vc) return;
            const members = vc.members.filter(m => !m.user.bot);
            let sent = 0, failed = 0;
            for (const [, member] of members) {
                try { await member.send(message); sent++; } catch (e) { failed++; }
            }
            addLog('message', `[${guild.name}] Broadcast DM sent to ${sent} members (${failed} failed)`);
            socket.emit('broadcast_result', { sent, failed });
        });

        // Announce
        socket.on('announce', async ({ channelId, message, guildId }) => {
            const guild = getGuild(guildId);
            if (!guild) return;
            const channel = guild.channels.cache.get(channelId);
            if (!channel || !channel.isTextBased()) return socket.emit('announce_error', 'Channel not found');
            try {
                await channel.send(message);
                addLog('message', `[${guild.name}] Announced to #${channel.name}`);
                socket.emit('announce_success', `Message sent to #${channel.name}`);
            } catch (e) {
                socket.emit('announce_error', 'Failed to send: ' + e.message);
            }
        });

        // Logs
        socket.on('get_logs', () => {
            socket.emit('logs_history', activityLog);
        });

        // Settings
        socket.on('get_settings', ({ guildId } = {}) => {
            const client = getClient();
            socket.emit('settings_data', {
                globalSettings: loadGlobalSettings(),
                guildSettings: guildId ? loadGuildSettings(guildId) : {},
                guildId: guildId || null,
                botInfo: client?.user ? {
                    username: client.user.username,
                    avatar: client.user.displayAvatarURL({ dynamic: true, size: 128 }),
                    id: client.user.id,
                    tag: client.user.tag,
                } : null
            });
        });

        socket.on('save_settings', async (payload) => {
            try {
                const { guildId, ...changes } = payload;

                if (guildId) {
                    const old = loadGuildSettings(guildId);
                    const merged = { ...old, ...changes };
                    if (changes.defaultChannelId) {
                        voice.setChannelId(guildId, changes.defaultChannelId);
                    }
                    saveGuildSettings(guildId, merged);

                    if (changes.defaultChannelId && changes.defaultChannelId !== old.defaultChannelId) {
                        const guild = getClient()?.guilds.cache.get(guildId);
                        const ch = guild?.channels.cache.get(changes.defaultChannelId);
                        addLog('settings', `[${guild?.name || guildId}] Default channel changed to: ${ch ? ch.name : changes.defaultChannelId}`);
                    }
                } else {
                    const old = loadGlobalSettings();
                    const merged = { ...old, ...changes };
                    saveGlobalSettings(merged);

                    const client = getClient();
                    if (changes.statusType !== undefined || changes.activityType !== undefined || changes.activityText !== undefined) {
                        await applyBotPresence(client, merged);
                        addLog('settings', `Presence updated: ${merged.statusType} — ${merged.activityText || 'no activity'}`);
                    }
                    if (changes.panelTitle && changes.panelTitle !== old.panelTitle) {
                        addLog('settings', `Panel title changed to: ${changes.panelTitle}`);
                    }
                }

                io.emit('settings_saved', { success: true });
                broadcastUpdate();
            } catch (e) {
                socket.emit('settings_saved', { success: false, error: e.message });
            }
        });

        // Update bot username
        socket.on('update_bot_username', async ({ username }) => {
            if (!username || username.length < 2 || username.length > 32)
                return socket.emit('settings_result', { key: 'username', success: false, error: 'Username must be 2–32 characters' });
            try {
                const client = getClient();
                await client.user.setUsername(username);
                addLog('settings', `Bot username changed to: ${username}`);
                socket.emit('settings_result', { key: 'username', success: true, message: `Username updated to ${username}` });
                broadcastUpdate();
            } catch (e) {
                socket.emit('settings_result', { key: 'username', success: false, error: e.message });
            }
        });

        // Update bot avatar
        socket.on('update_bot_avatar', async ({ imageUrl }) => {
            if (!imageUrl) return socket.emit('settings_result', { key: 'avatar', success: false, error: 'No image URL provided' });
            try {
                const client = getClient();
                await client.user.setAvatar(imageUrl);
                addLog('settings', `Bot avatar updated`);
                socket.emit('settings_result', { key: 'avatar', success: true, message: 'Avatar updated successfully' });
                setTimeout(broadcastUpdate, 2000);
            } catch (e) {
                socket.emit('settings_result', { key: 'avatar', success: false, error: e.message });
            }
        });

        // Clear chat history
        socket.on('clear_chat_history', () => {
            saveChats({});
            addLog('settings', 'All chat history cleared');
            socket.emit('settings_result', { key: 'clear-chat', success: true, message: 'Chat history cleared' });
        });

        // DM chat
        socket.on('get_dm_history', ({ userId }) => {
            const chats = loadChats();
            socket.emit('dm_history', { userId, messages: chats[userId] || [] });
        });

        socket.on('send_dm', async ({ userId, message, replyTo }) => {
            try {
                const client = getClient();
                const user = await client.users.fetch(userId);
                let sendText = message;
                if (replyTo) sendText = `> ${replyTo.text}\n${message}`;
                await user.send(sendText);
                addLog('message', `DM sent to ${user.username}: "${message.substring(0, 40)}${message.length > 40 ? '...' : ''}"`);
                const chats = loadChats();
                if (!chats[userId]) chats[userId] = [];
                const msgObj = { sender: 'bot', text: message, time: Date.now(), replyTo: replyTo || null };
                chats[userId].push(msgObj);
                saveChats(chats);
                socket.emit('dm_history', { userId, messages: chats[userId] });
            } catch (error) {
                console.error("Gagal kirim DM:", error);
                socket.emit('dm_error', "Failed to send DM");
            }
        });
    });

    return {
        emitDMReceived: (userId, message, username) => {
            io.emit('dm_received', { userId, message, username });
        }
    };
}

const activityLog = [];
function createLogger(io) {
    return function addLog(type, message) {
        const entry = { type, message, time: Date.now() };
        activityLog.unshift(entry);
        if (activityLog.length > 100) activityLog.pop();
        io.emit('activity_log', entry);
        console.log(`[${type.toUpperCase()}] ${message}`);
    };
}

module.exports = { setupSocket, createLogger, activityLog };
