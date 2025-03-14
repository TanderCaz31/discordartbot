require("dotenv").config();
const { log, client } = require("./utils/logger");
const website = require("./utils/website");
const database = require("./utils/database");

const { ChannelType } = require("discord.js");
const moment = require("moment/moment");

// Catch errors to not make batch files stop
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    lowConnection = true;
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    lowConnection = true;
});

let lowConnection;
let sentPosts;
client.on("ready", async() => {
    const server = client.guilds.cache.get(process.env.SERVERID)
    await log("Hourly score checks:");

    let characters = await database.getCharacters();

    for (const char of characters) {
        if (!await findChannel(char.channelName)) {
            await createChannel(server, char.channelName);
        }
    }

    sentPosts = await database.getAllPostIds();

    // For each character, find any new good-enough posts and send them
    for (const char of characters) {
        await log(`Trying to get posts in the last week for ${char.channelName}...`);

        try {
            const posts = await website.getPostsBeforeLimit(char.tag, `1week score:>=${char.monthlyAvg}`);
            await log(`Number of good ${char.channelName} posts: ${posts.length}`);

            for (let post of posts) {
                try {
                    if (!sentPosts.includes(post.id) && !await website.postHasBannedTags(post)) {
                        post = await website.getAllPostData(post.id, char.tag);

                        await sendPost(post, char.channelName);
                    }
                } catch (e) {
                    const postId = post && post.id ? post.id : 'unknown';
                    await log(`ERR: Failed to process post ${postId} in #${char.channelName}: ${e}`);
                }
            }
        } catch (e) {
            await log(`ERR: Failed to get weekly posts for #${char.channelName}: ${e}`);
        }
    }

    if (lowConnection) {await delay(300000)} // 5 minute wait
    await log(`Finished running hourly script at ${moment().format("HH:mm")}`);
    process.exit(0);
})

async function delay(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}

client.on("messageCreate", async (message) => {
    if (message.content.includes("Website link")) {

        const websiteLink = message.content.slice(
            15,
            message.content.indexOf(
                message.content.includes(">") ? ">" : ")"
            )
        )

        const postId = websiteLink.split("/")[4];

        if (!sentPosts.includes(postId)) {
            // Keep track of sent posts
            sentPosts.push(postId);

            await log(`Found a new post in a message in #${message.channel.name}, of post id ${postId}`);
        } else {
            message.delete().catch(e => log("ERR: Error deleting duplicate message: " + e));
            await log(`Deleted duplicate message linking to ${postId}.`);
        }
    }
});

async function findChannel(tag) {
    return client.channels.cache.find(
        (ch) => ch.name === tag && ch.isTextBased()
    )
}

async function createChannel(server, channelName) {
    server.channels.create({
        name: channelName,
        type: ChannelType.GuildText
    })
}

async function sendPost(post, channelName) {
    const channel = await findChannel(channelName);
    let sentMessage;

    // Handle discord's 10MB upload limit
    const imageSize = await website.getImageSize(post.imageUrl)

    if (imageSize < 10485760) {
        await log(`Sending ${post.id} in #${channelName} using a ${imageSize} byte attachment`);
        try {
            sentMessage = await sendMessageWithAttachment(post, channel);
        } catch (e) {
            await log(`ERR: Failed to send attachment message for post ${post.id} with an attachment:\n${e}`)
            lowConnection = true;
        }
    } else {
        await log(`Sending ${post.id} in #${channelName} using an embed`);
        sentMessage = await sendMessageWithLink(post, channel);
    }

    await log(`Sent ${post.id} in #${channelName}`);
    await database.addPost(post);

    if (["gotoh_hitori", "nachoneko"].includes(post.char)) {
        await log("Trying to heart the message i just sent...");
        await sentMessage.react('❤️');
    }
}

async function sendMessageWithAttachment(post, channel) {
    return await channel.send({
        content: `[Website link](<${post.websiteUrl}>)\n[Image link](<${post.imageUrl}>)`,
        files: [post.imageUrl]
    });
}

async function sendMessageWithLink(post, channel) {
    return await channel.send(`[Website link](<${post.websiteUrl}>)\n[Image link](${post.imageUrl})`);
}

client.login(process.env.DC_BOT_TOKEN);