const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let channel;

client.once('ready', () => {
    channel = client.channels.cache.find(
        (ch) => ch.name === process.env.LOGCHANNELNAME && ch.isTextBased()
    );
});

async function log(message) {
    console.log(message);
    await channel.send(message);
}

module.exports = { log, client };