const express = require('express');
const bodyParser = require('body-parser');
const data = require('./database');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const port = 8154;

app.use("/css", express.static("resources/css"));
app.use("/js", express.static("resources/js"));
app.use("/images", express.static("resources/images"));

app.use(session({
    secret: 'kjdwyun4awfbu45yawg1bdk5c232macjhaiu62e9nawe;f',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
}));

let requestLogger = (req, res, next) => {
    // requested method and URL
    console.log(`${req.method} ${req.url}`);
    next();
};

app.use(requestLogger);

app.set("views", "templates");
app.set('view engine', 'pug');

app.use(express.urlencoded({ extended: true })); // middleware
app.use(bodyParser.json());
app.use(express.json())

// hash password using bcrypt
async function hashPass(password) {
    let salt = 10;
    return bcrypt.hash(password, salt);
}

// Verify password using bcrypt
async function verifyPass(pass, hpass) {
    return bcrypt.compare(pass, hpass);
}

// middleware checking if user is logged in:
function isLoggedIn(req, res, next) {
    if (req.session && req.session.username) {
        // user is logged in, by pass
        next();
    } else {
        // User is not logged in, redirect to login page or perform any other desired action
        res.redirect('/login');
    }
}

// Example usage of the isLoggedIn middleware
app.get('/profile', isLoggedIn, async (req, res) => {
    let username = req.session.username; // person logged in
    let user = await data.login(username); // get user info
    let posts = await data.getUsersPosts(username);
    res.render("profile.pug", {posts, username, user});
});

app.get('/home', isLoggedIn, async (req, res) => {
   try { 
        let posts = await data.getPosts();
        res.render("loggedinfeed.pug", {posts, user: req.session.username});
    } catch (error) {
        res.render("error.pug", { message: 'Failed to load posts' });
    }
});

app.get(('/', ''), async (req, res) => {
    res.render("welcome.pug")
});

app.get(('/main'), async (req, res) => {
    let posts = await data.getPosts();
    res.render("feed.pug", {posts})
});

// SIGNING UP FUNCTIONS

app.get(('/signup'), (req, res) => {
    res.render("signup.pug")
});

app.post('/signup', async (req, res) => {
    let { username, password } = req.body;
  
    try {
        // generates salt
        let hpass = await hashPass(password);
        await data.signup(username, hpass);
        // stores encrypted password
        console.log('Account successfully created')
        res.redirect('/home');
    } catch (error) {
        console.error('Error during signup:', error);
        return res.render("error.pug", { message: 'Username already exists'});
    }
});

// LOG IN FUNCTIONS 

app.get(('/login'), (req, res) => {
    res.render("login.pug")
});

app.post('/login', async (req, res) => {
    let { username, password } = req.body;
    let results = await data.login(username);

    if (results.length > 0) {
        let hashedPasswordInDB = results[0].password;
        let verification = await verifyPass(password, hashedPasswordInDB);

        if (verification) {
            // passwords match!
            req.session.username = username;
            res.redirect("/home")
        } else {
            console.log('Passwords do not match');
            return res.render("error.pug", { message: 'Invalid username or password' });
        }
    } else {
        console.log('No results found for the username');
        return res.render("error.pug", { message: 'Invalid username or password' });
    }
});

// NEW POST FUNCTIONS 

// POST route for creating a new post
app.post('/api/post', isLoggedIn, async (req, res) => {
    let { message } = req.body;
    let user = req.session.username; // owner of post
    if (!message) {
        return res.render("error.pug", { message: 'Missing message' });
    }
    await data.createPost(user, message);
    res.status(201).json({ message: 'Post created successfully' });
});

// GET route for edit file
app.get('/api/post/edit/:id', isLoggedIn, async (req, res) => {
    try { 
        let post = await data.getPostById(req.params.id);
        res.render("edit.pug", {post, user: req.session.username});
    } catch (error) {
        res.render("error.pug", { message: 'Failed to edit posts' });
    }
});

// PUT route for editing a post
app.put('/api/post/:id', isLoggedIn, async (req, res) => {
    let { message } = req.body;
    let postId = req.params.id; 

    try {
        await data.editPost(postId, message);
        // res.redirect('/home'); // send to feed after successful edit
    } catch (error) {
        res.status(400).render("error.pug", { message: 'Internal server error' });
    }
});

// DELETE route for deleting a post
app.delete('/api/post', isLoggedIn, async (req, res) => {
    try {
        const {id} = req.body;

        await data.deletePost(id);
        return res.status(200).send("contact deleted successfully");

    } catch (error) {
        return res.status(400).send("error processing the request");
    }

});

// LIKE FUNCTIONS
app.put('/api/post/like/:id', isLoggedIn, async (req, res) => {
    let postId = req.params.id;
    let action = req.body.action; // 'like' or 'unlike'

    try {
        if (action === 'like') {
            await data.incrementLike(postId);
            res.status(200).send('Like added successfully');
        } else if (action === 'unlike') {
            await data.decrementLike(postId);
            res.status(200).send('Like removed successfully');
        } else {
            res.status(400).send('not an option');
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('Error processing the request');
    }
});

// SORT BY LIKES:
app.get('/sortedByLikes', isLoggedIn, async (req, res) => {
    try {
        let posts = await data.sortByLikes();
        res.render("loggedinfeed.pug", {posts, user: req.session.username});
    } catch (error) {
        res.status(500).send('Error fetching sorted posts');
    }
});

// LOGOUT FUNCTION
app.get('/logout', isLoggedIn, async (req, res) => {
    req.session.destroy(function(err){
        console.log('User logged out successfully');
        res.status(200).redirect("/main");
    });
});

app.use((req,res,next) => {
    console.log('Error 404');
    res.status(404).render('404.pug')
});

app.listen (port , () => {
    console.log(`Example app listening on port http://localhost:${port}/`)
});