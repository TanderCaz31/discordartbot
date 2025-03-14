const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("posts.sqlite");
const { getMonthlyAverage } = require("./website");
const { log } = require("./logger");

db.run(`
    CREATE TABLE IF NOT EXISTS sentPosts (
        id TEXT PRIMARY KEY,
        score INTEGER NOT NULL,
        character TEXT NOT NULL,
        uploadDate DATETIME NOT NULL,
        websiteUrl TEXT NOT NULL,
        imageUrl TEXT NOT NULL,
        tags TEXT NOT NULL
    );
`);

db.run(`
    CREATE TABLE IF NOT EXISTS characters (
        tag TEXT PRIMARY KEY,
        monthlyAvg INTEGER,
        channelName TEXT
    );
`);

const database = {
    getCharacters: async function () {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM characters ORDER BY monthlyAvg DESC`,
                (err, rows) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(rows);
                })
        })
    },

    updateMonthlyAverages: async function (characters) {
        for (let i = 0; i < characters.length; i++) {
            characters[i].monthlyAvg =  await getMonthlyAverage(characters[i].tag);
            await log(`New monthly average for ${characters[i].channelName} is ${characters[i].monthlyAvg}`);

            db.run(`UPDATE characters SET monthlyAvg = ? WHERE tag = ?`,
                [characters[i].monthlyAvg, characters[i].tag])
        }
    },

    getOldPosts: async function (timeLimit) {
        return new Promise ((resolve, reject) => {
            db.all(`SELECT id FROM sentPosts WHERE uploadDate < ? ORDER BY uploadDate DESC`,
                [timeLimit],
                (err, rows) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(rows);
                })
        })
    },

    deletePostsArr : async function (postsArr) {
        for (const post of postsArr) {
            await new Promise((resolve, reject) => {
                db.all(`DELETE FROM sentPosts WHERE id = ?`, [post.id],
                    (err) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
            })
        }
    },

    getAllPostIds: async function () {
        return new Promise((resolve, reject) => {
            db.all(`SELECT id FROM sentPosts ORDER BY uploadDate`,
                (err, rows) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(rows.map((row)=>row.id));
                })
        })
    },

    addPost: async function (post) {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO sentPosts (id, score, character, uploadDate, websiteUrl, imageUrl, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
                [post.id, post.score, post.char, post.uploadDate, post.websiteUrl, post.imageUrl, JSON.stringify(post.tags)],
                (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                })
        })
    }
}

module.exports = database;