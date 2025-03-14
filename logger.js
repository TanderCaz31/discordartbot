const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

async function findChannel(tag) {
    return client.channels.cache.find(
        (ch) => ch.name === tag && ch.isTextBased()
    );
}

async function log(message) {
    console.log(message);
    let channel = await findChannel("botlogs");
    if (channel) {
        await channel.send(message);
    }
}

module.exports = { log, client };