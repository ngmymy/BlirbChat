const mysql = require(`mysql-await`); // npm install mysql-await
// first -- I want a connection pool: https://www.npmjs.com/package/mysql#pooling-connections
// this is used a bit differently, but I think it's just better -- especially if server is doing heavy work.
var connPool = mysql.createPool({
    connectionLimit: 5, 
    host: "127.0.0.1",
    user: "C4131F23U156",
    database: "C4131F23U156",
    password: "", // we really shouldn't be saving this here long-term -- and I probably shouldn't be sharing it with you...
});

async function login(username) {
    return await connPool.awaitQuery("SELECT * FROM account WHERE username = ?;",[username]);
};

async function signup(username, hpass) {
    return await connPool.awaitQuery("INSERT INTO account (username, password, joinDate) VALUES (?,?,CURRENT_TIMESTAMP);",[username, hpass]);
};

async function createPost(username, message){
    return await connPool.awaitQuery("INSERT INTO post (username, message) VALUES (?, ?);", [username, message]);
};

async function getPostById(postId) {
    return await connPool.awaitQuery("SELECT * FROM post WHERE postId = ?;", [postId]);
};

async function editPost(postId, message) {
    return await connPool.awaitQuery("UPDATE post SET message = ? WHERE postId = ?;", [message, postId]);
};

async function deletePost(postId) {
    let result = await connPool.awaitQuery("DELETE FROM post WHERE postId = ?;", [postId]);
    return (result.affectedRows > 0);
};

async function getUserId(username) {
    let result = await connPool.awaitQuery('SELECT userId FROM account WHERE username = ?;', [username]);
    return result[0].userId;
};

async function getPosts() {
    return await connPool.awaitQuery('SELECT * FROM post ORDER BY postID DESC;');
};

async function getUsersPosts(username) {
    return await connPool.awaitQuery('SELECT * FROM post WHERE username = ? ORDER BY postID DESC;', [username]);
};

async function getRecentPosts(){
    return await connPool.awaitQuery("SELECT * FROM post ORDER BY postId DESC LIMIT 5;");
};

async function sortByLikes(){
    return await connPool.awaitQuery("SELECT * FROM post ORDER BY likes DESC LIMIT 10;");
};

async function incrementLike(postId) {
    return await connPool.awaitQuery('UPDATE post SET likes = likes + 1 WHERE postId = ?', [postId]);
};

async function decrementLike(postId) {
    return await connPool.awaitQuery('UPDATE post SET likes = likes - 1 WHERE postId = ?', [postId]);
};

connPool.on('error', (err) => {
    // check if the error is a duplicate entry error
    if (err.code === 'ER_DUP_ENTRY' && err.errno === 1062) {
      console.error('Username already taken:', err);
      // Handle the duplicate entry error here or log a message
    } else {
      // Handle other types of errors
      console.error('error in connection pool:', err);
    }
});

module.exports = {
    login,
    signup,
    createPost,
    editPost,
    deletePost,
    getPosts,
    getPostById,
    getUsersPosts,
    getRecentPosts,
    sortByLikes,
    incrementLike,
    decrementLike,    
    getUserId
};