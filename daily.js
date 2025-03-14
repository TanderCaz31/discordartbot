require("dotenv").config();
const { log, client } = require("./utils/logger");
const database = require("./utils/database");

const moment = require("moment");

// Stuff to do on load
client.on("ready", async() => {
    await log("Daily monthly score updates & database cleanup:");

    let characters = await database.getCharacters();

    await database.updateMonthlyAverages(characters);
    await log("Updated monthly average scores for all characters");

    // Check if there's any posts in the database older than a week, delete them if so
    await deleteOldPosts();

    await log(`Finished running daily script at ${moment().format("HH:mm")}`);
    process.exit(0);
})

async function deleteOldPosts() {
    const timeLimit = moment().subtract(1, "week")
        .utcOffset(-300) // to account for the -5 timezone safebooru uses
        .format('YYYY-MM-DD HH:mm:ss');

    const oldPosts = await database.getOldPosts(timeLimit);

    if (oldPosts && oldPosts.length > 0) {
        await database.deletePostsArr(oldPosts);
        await log(`Deleted ${oldPosts.length} old posts`)
    } else {
        await log("No old posts found to delete");
    }
}
client.login(process.env.DC_BOT_TOKEN);