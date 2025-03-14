const axios = require("axios");
require("dotenv").config();
const { log } = require("./logger");

async function getMonthlyAverage(charTag) {
    let posts = await getPostsBeforeLimit(charTag, "1month");
    if (posts.length === 0) return 5; // minimum of 5

    let totalScore = 0;
    for (const post of posts) {
        totalScore += post.score;
    }

    // At 320 posts in the last month, will give a 1.3x boost to the threshold to pass before posting
    let multiplier = 1.0 + (posts.length / 320) * 0.3;
    return Math.floor(multiplier * totalScore / posts.length);
}

// Creates an array of objects having ".id" as the post ID and ".score" as the post score
async function getPostsBeforeLimit(charTag, limit) {
    let page = 1;
    let posts = [];

    do {
        await delay();
        let webpage = await axios.get(`https://safebooru.donmai.us/posts?page=${page}&tags=${charTag}+age%3A..${limit}`);
        page++;

        if (webpage.data.includes("No posts found.")) {
            break;
        }
        posts = posts.concat(await getPostData(webpage))
    } while (true);

    return posts;
}

async function getAllPostData(postId, charTag) {
    try {
        await delay();
        const response = await axios.get(`https://safebooru.donmai.us/posts/${postId}.json`);

        return {id: postId,
            score: response.data.score,
            uploadDate: response.data.created_at,
            websiteUrl: `https://safebooru.donmai.us/posts/${postId}`,
            imageUrl: response.data.file_url,
            char: charTag,
            tags: response.data.tag_string.split(" ")
        };
    } catch (e) {
        await log(`ERR: Couldn't get all data for post ${postId}`);
    }
}

async function postHasBannedTags(post) {
    const bannedTagsArr = process.env.BANNED_TAGS.split(" ");
    let bannedCheck = post.tags.some(tag => bannedTagsArr.includes(tag));
    await log(`Post ${post.id} is new and passes the threshold, does it have banned tags? ${bannedCheck}`);

    return bannedCheck;
}

// Returns an array of objects representing all posts in the given page, saving their id and score
async function getPostData(webpage) {
    const postIds = webpage.data
        .split('article id="post_')
        .slice(1)
        .map(post => post.substring(0, post.indexOf('"')));

    const postScores = webpage.data
        .split('data-score="')
        .slice(1)
        .map(post => Number(post.substring(0, post.indexOf('"'))));

    const postTags = webpage.data
        .split('data-tags="')
        .slice(1)
        .map(post => post.substring(0, post.indexOf('"')));

    return postIds.map((id, index) => ({id, score: postScores[index], tags: postTags[index].split(" ")}));
}

async function getImageSize(imageUrl) {
    await log(`Trying to get image size at <${imageUrl}>`);
    await delay();
    try {
        const response = await axios.head(imageUrl);
        return parseInt(response.headers['content-length'], 10);
    } catch (e) {
        console.error(`Failed to fetch file size for URL: ${imageUrl}`, e);
        return false;
    }
}

// Waits for half a second
async function delay() {
    return new Promise(resolve => setTimeout(resolve, 500));
}

module.exports = { getMonthlyAverage, getPostsBeforeLimit, getImageSize, postHasBannedTags, getAllPostData };