const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

const channelMap = new Map();

function setChannelId(guildId, id) {
    if (id) channelMap.set(guildId, id);
}

function getChannelId(guildId) {
    return channelMap.get(guildId) || null;
}

function joinVoice(guild, channelId) {
    try {
        setChannelId(guild.id, channelId);
        const ch = guild.channels.cache.get(channelId);
        const connection = joinVoiceChannel({
            channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true
        });
        return { success: true, channelName: ch ? ch.name : channelId };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

function leaveVoice(guildId) {
    const connection = getVoiceConnection(guildId);
    if (connection) {
        connection.destroy();
        return true;
    }
    return false;
}

function isConnected(guildId) {
    return !!getVoiceConnection(guildId);
}

module.exports = { joinVoice, leaveVoice, isConnected, setChannelId, getChannelId };
