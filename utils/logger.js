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

let channel;
async function log(message) {
    console.log(message);
    if (!channel)
        channel = await findChannel(process.env.LOGCHANNELNAME);
    await channel.send(message);
}

module.exports = { log, client };