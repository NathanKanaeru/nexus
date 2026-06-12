const config = require('./config');
const bot = require('./bot');
const server = require('./server');

const client = bot.createBot(
    server.addLog,
    server.broadcastUpdate,
    server.socketHandlers.emitDMReceived
);

client.login(config.token);
server.startServer();
