const { loadGlobalSettings, loadGuildSettings } = require('./database');
const voice = require('./voice');
const { getClient } = require('./bot');

const presenceStatusMap = { online: 'online', idle: 'idle', dnd: 'dnd', invisible: 'offline', offline: 'offline' };

function getGuildData(guild) {
    if (!guild) return null;

    const currentChannelId = voice.getChannelId(guild.id);
    const voiceChannel = guild.channels.cache.get(currentChannelId);
    const connection = voice.isConnected(guild.id);

    const voiceChannels = guild.channels.cache
        .filter(c => c.isVoiceBased())
        .map(c => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const textChannels = guild.channels.cache
        .filter(c => c.isTextBased() && c.type === 0)
        .map(c => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name));

    let members = [];
    if (voiceChannel && voiceChannel.isVoiceBased()) {
        members = voiceChannel.members.map(m => ({
            id: m.id, username: m.user.username,
            avatar: m.user.displayAvatarURL({ dynamic: true, size: 64 }),
            isMuted: m.voice.serverMute || m.voice.selfMute,
            isDeaf: m.voice.serverDeaf || m.voice.selfDeaf, isBot: m.user.bot
        }));
    }

    const allServerUsers = guild.members.cache
        .filter(m => !m.user.bot)
        .map(m => ({
            id: m.id,
            username: m.user.username,
            avatar: m.user.displayAvatarURL({ dynamic: true, size: 64 }),
            presence: presenceStatusMap[m.presence?.status] || 'offline'
        }))
        .sort((a, b) => {
            const order = { online: 0, idle: 1, dnd: 2, offline: 3 };
            return (order[a.presence] ?? 3) - (order[b.presence] ?? 3) || a.username.localeCompare(b.username);
        });

    return {
        server: { id: guild.id, name: guild.name, icon: guild.iconURL({ dynamic: true, size: 64 }) || 'https://cdn.discordapp.com/embed/avatars/0.png', memberCount: guild.memberCount },
        voice: {
            status: connection ? 'Connected' : 'Disconnected',
            channelName: voiceChannel ? voiceChannel.name : 'Unknown',
            channelId: currentChannelId
        },
        voiceChannels, textChannels, members, allServerUsers,
        guildSettings: loadGuildSettings(guild.id),
    };
}

function getDashboardData() {
    const client = getClient();
    if (!client || !client.user) return null;

    const guilds = {};
    for (const [, guild] of client.guilds.cache) {
        const data = getGuildData(guild);
        if (data) guilds[guild.id] = data;
    }

    const settings = loadGlobalSettings();

    return {
        stats: { ping: client.ws.ping, uptime: Math.floor(client.uptime / 60000), guilds: client.guilds.cache.size, users: client.users.cache.size },
        guilds,
        botInfo: {
            username: client.user.username,
            tag: client.user.tag,
            id: client.user.id,
            avatar: client.user.displayAvatarURL({ dynamic: true, size: 128 }),
            status: settings.statusType,
            activityType: settings.activityType,
            activityText: settings.activityText,
        },
        globalSettings: settings,
    };
}

module.exports = { getDashboardData };
