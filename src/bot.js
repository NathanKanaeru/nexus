const { Client, GatewayIntentBits, Partials, ChannelType, REST, Routes, SlashCommandBuilder } = require('discord.js');
const config = require('./config');
const voice = require('./voice');
const { loadChats, saveChats, loadGuildSettings, loadGlobalSettings } = require('./database');

let client = null;
let addLog = null;
let broadcastUpdate = null;
let emitDMReceived = null;

function createBot(logFn, broadcastFn, dmFn) {
    addLog = logFn;
    broadcastUpdate = broadcastFn;
    emitDMReceived = dmFn;

    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.MessageContent
        ],
        partials: [Partials.Channel, Partials.Message]
    });

    client.on('messageCreate', message => {
        if (message.author.bot) return;
        if (message.channel.type === ChannelType.DM) {
            const userId = message.author.id;
            const chats = loadChats();
            if (!chats[userId]) chats[userId] = [];
            const msgObj = { sender: 'user', text: message.content, time: Date.now() };
            chats[userId].push(msgObj);
            saveChats(chats);
            if (emitDMReceived) emitDMReceived(userId, msgObj, message.author.username);
            if (broadcastFn) broadcastFn();
            addLog('message', `DM received from ${message.author.username}: "${message.content.substring(0, 40)}${message.content.length > 40 ? '...' : ''}"`);
        }
    });

    client.on('voiceStateUpdate', () => {
        setTimeout(broadcastUpdate, 500);
    });

    client.on('presenceUpdate', () => {
        setTimeout(broadcastUpdate, 1000);
    });

    client.once('ready', async () => {
        console.log(`Login sebagai ${client.user.tag}`);
        const guilds = client.guilds.cache;

        for (const [, guild] of guilds) {
            console.log(`⏳ Fetching members for ${guild.name}...`);
            await guild.members.fetch();
            console.log(`✅ ${guild.name}: ${guild.memberCount} members loaded`);

            const gs = loadGuildSettings(guild.id);
            if (gs.defaultChannelId) {
                voice.setChannelId(guild.id, gs.defaultChannelId);
            }
            if (gs.autoJoinOnStart !== false && gs.defaultChannelId) {
                const r = voice.joinVoice(guild, gs.defaultChannelId);
                if (r.success) {
                    addLog('voice', `[${guild.name}] Bot auto-joined: ${r.channelName}`);
                }
            }
        }

        const commands = [
            new SlashCommandBuilder().setName('tiktokdl').setDescription('Download video TikTok')
                .addStringOption(option => option.setName('url').setDescription('Link TikTok').setRequired(true)).toJSON()
        ];
        const rest = new REST({ version: '10' }).setToken(config.token);
        try {
            await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
            console.log('✅ Global slash commands registered.');
        } catch (err) {
            console.error('⚠️ Gagal mendaftarkan slash commands:', err.message);
        }

        setInterval(broadcastUpdate, 10000);
        broadcastUpdate();
        addLog('system', `Bot started as ${client.user.tag}`);
    });

    return client;
}

function getClient() {
    return client;
}

module.exports = { createBot, getClient };
