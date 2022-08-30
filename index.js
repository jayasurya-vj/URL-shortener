
import express from "express";
import mongoose from "mongoose";
import { ShortUrl } from "./models/shortUrl.js";
import { UserData } from "./models/user.js";
import bcrypt from "bcrypt";
import passport from "passport";
import LocalStrategy from "passport-local";
import flash from "express-flash";   //for flash messages
import session from "express-session";
import path from 'path';
const __dirname = path.resolve();



mongoose.connect("mongodb+srv://jayasurya:"+ process.env.MONGO_PWD +"@cluster0.trotk.mongodb.net/url-shortener?retryWrites=true&w=majority")
    .then(()=>console.log("connected successfully"))
    .catch((e) => console.log("connection failed", e));

function initializePassport() {
    const authenticateUser = (email, password, done) => {
        let authUser;
        UserData.findOne({ email: email }).then(user => {
            if (user == null) {
                console.log("no user found");
                return done(null, false, { message: "no user found" });
            } else {
                console.log("user found =>", user.name);
                authUser = user;
                return bcrypt.compare(password, user.password);
            }
        }).then(result => {
            if (!result) {
                return done(null, false, { message: "Incorrect password" });
            } else {
                console.log("logged in");
                return done(null, authUser);
            }
        }).catch(err => {
            console.log(err, "in initializePassport()");
            return done(null, false, { message: "Login failed" });
        })
    }

    passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser))
    // saved to session
    // req.session.passport.user = {id: '..'}
    passport.serializeUser((user, done) => {
        // console.log(user,"serialize");
        return done(null, user._id);
    });

    // user object attaches to the request as req.user
    passport.deserializeUser((id, done) => {
        // console.log("deserializeUser",id );
        UserData.findById({ _id: id }).then(user => {
            // console.log("deserializeUser",user);
            return done(null, user);
        }).catch(err => {
            console.log("deserializeUser error");
            done(err);
        });
    })
}
initializePassport();





const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname + '/views'));
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false, //resave if nothing has changed
    saveUninitialized: false // save empty values in session when no values
}));
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
    let domain = "https://" + req.get("host") + "/";
    let errMsg = '';
    if (!req.isAuthenticated()) { 
        // res.redirect('/login'); 
        res.render("index", { urls: [], name: null, errMsg, origin: domain });
    }
    else {
        console.log(req.user, "=>req.user");
        let redirect = req.query.redirect;
        if (!redirect) errMsg = '';
        else if (redirect == "duplicate") errMsg = 'The url is already shortened. Please find it in the list below or try again with a different url';
        else if (redirect == "error") errMsg = 'Something went wrong.Please try again after sometime.';
        let pageData = ShortUrl.find({ creator: req.user._id });
        pageData.then(data => {
            // console.log(data, "url data");
            res.render("index", { urls: data, name: req.user.name, errMsg, origin: domain });
            res.end();

        }).catch(err => {
            console.log(err, "error in index");
            res.render("index", { urls: [], name: req.user.name, errMsg: "something went wrong while fetching your short URls", origin: domain });
        });
    }
})

app.get("/login", checkNotAuthenticated, (req, res) => {
    res.render("login.ejs", { sucMsg: "",errMsg: "" });
})

app.get("/register", checkNotAuthenticated, (req, res) => {
    res.render("register.ejs", { message: "" });
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

app.post("/register", checkNotAuthenticated, (req, res) => {
    bcrypt.hash(req.body.password, 10)
        .then(hash => {
            let user = new UserData({
                name: req.body.name,
                email: req.body.email,
                password: hash
            });

            user.save()
                .then(result => {
                    res.render("login.ejs", { sucMsg: "Registration successful! Please login now." ,errMsg: ""});
                })
                .catch(err => {
                    console.log("err in saving reqiesteration", err);
                    if (err) {
                        res.render("register.ejs", { message: "Email already registered. Try with a different email Id or Login" });
                    }
                    else {
                        res.render("register.ejs", { message: "Registration failed" });
                    }
                })
        }).catch(err => {
            console.log("err in reqiester", err);
            res.render("register.ejs", { message: "Registration failed" });
        });
})

app.get('/logout', (req, res) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/login');
    });
})


app.post("/shortUrls", (req, res) => {
    if (!req.isAuthenticated()) { 
        res.render("login.ejs", { errMsg: "Please login/register to shorten the Url" ,sucMsg: "" });
    }
    else {
    let shortUrlExisting = ShortUrl.find({ full: req.body.fullUrl.trim(), creator: req.user._id });
    shortUrlExisting.then(reslt => {
        console.log(reslt, reslt.length, "=> preexistig long url");
        if (reslt.length > 0) {
            res.redirect("/?redirect=duplicate");
        } else {
            const shortUrl = new ShortUrl({ full: req.body.fullUrl.trim(), creator: req.user._id });
            shortUrl.save().then(result => {
                res.redirect("/");
                res.end();
            }).catch(err => {
                console.log(err, "error in post url saving");
                res.redirect("/?redirect=error");
            });
        }
    }).catch(err => {
        console.log(err, "error in post url");
        res.redirect("/?redirect=error");
    });
}
});



app.get("/:shortUrl", (req, res) => {
    let shortUrl = ShortUrl.findOne({ short: req.params.shortUrl });
    shortUrl.then(url => {
        console.log(shortUrl, url);
        if (!url) {
            res.status(404).json({
                message: "The Url you requested is not found"
            });
        } else {
            res.writeHead(301, {
                'Location': url.full
            });
            res.end();
        }
    }).catch(err => {
        console.log(err, "=>error in redirecting");
        res.status(500).json({
            message: "server error!"
        });
    });
})

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return res.redirect('/'); }
    next();
}


app.listen(process.env.PORT || 6789, ()=>{console.log("server is running")});