
import express from "express";
import mongoose from "mongoose";
import {ShortUrl} from "./models/shortUrl.js";
import { UserData } from "./models/user.js";
import bcrypt from "bcrypt";
import passport from "passport";
import LocalStrategy from "passport-local";
import flash from "express-flash";   //for flash messages
import session from "express-session";
import uniqueValidator from "mongoose-unique-validator";

mongoose.connect("mongodb+srv://jayasurya:"+ process.env.MONGO_PWD +"@cluster0.trotk.mongodb.net/mean-app?retryWrites=true&w=majority")
.then(()=>console.log("connected successfully"))
.catch(()=>console.log("connection failed"));

function initializePassport(){
    const authenticateUser = (email, password, done) => {
        let authUser;
        UserData.findOne({email:email}).then(user=>{
            console.log(user);
        if(user == null){
            return done(null, false, {message: "no user found"});
        }
        authUser=user;
        return bcrypt.compare(password,user.password);
      }).then(result=>{
          console.log(result);
          if(!result){
              return done(null, false, {message: "Incorrect password"});
          }else{
            console.log("logged in");
              return done(null,authUser);
          }
      }).catch(err=>{
        console.log(err);
        return done(null, false, {message: "Login failed"});
      })
    }

    passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser))
    // saved to session
    // req.session.passport.user = {id: '..'}
    passport.serializeUser((user, done)=>{
        // console.log(user,"serialize");
     return done(null,user._id);}); 

    // user object attaches to the request as req.user
    passport.deserializeUser((id, done)=>{
        // console.log("deserializeUser",id );
        UserData.findById({_id:id}).then(user => {
            // console.log("deserializeUser",user);
            return done(null,user);
        }).catch(err=>{
            console.log("deserializeUser error");
            done(err);
        });
        })
}
initializePassport();





const app=express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended:true}));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false, //resave if nothing has changed
    saveUninitialized: false // save empty values in session when no values
}));
app.use(passport.initialize());
app.use(passport.session());


app.get("/",(req,res)=>{
    // console.log("in post logion")
    if(!req.isAuthenticated()) { res.redirect('/login'); }
    else{
        console.log(req.user)
        let pageData = ShortUrl.find();
        pageData.then(data=>{
            console.log(data);
            res.render("index",{urls : data});
    
        }).catch(err=>{
           console.log(err);
           res.render("index",{urls : []});
          });
    }
})

app.get("/login",checkNotAuthenticated,(req,res)=>{   
        res.render("login.ejs");   
})

app.get("/register",checkNotAuthenticated,(req,res)=>{   
    res.render("register.ejs");   
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  }))

app.post("/register",checkNotAuthenticated,(req,res)=>{   
    console.log("req",req.body);
    bcrypt.hash(req.body.password,10)
        .then(hash=> {
            let user = new UserData({
                name: req.body.name,
                email: req.body.email,
                password: hash
            });

            user.save()
                .then(result=>{
                    console.log(result);
                    res.redirect('/');
                })
                .catch(err=>{
                    // console.log(err);
                    res.redirect('/register');
                })
        }).catch(err=>{
            // console.log(err);
            res.redirect('/register');
        });
})

app.get('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/login');
      });
  })
  

app.post("/shortUrls",(req,res)=>{
   const shortUrl = new ShortUrl({full:req.body.fullUrl});
   shortUrl.save().then(result=>{
    console.log(result);
    res.redirect('/');   
    }).catch(err=>{
        console.log(err);
        res.render("index");
    });
})



app.get("/:shortUrl",(req,res)=>{
    let shortUrl = ShortUrl.findOne({short: req.params.shortUrl});
    shortUrl.then(url=>{
        console.log(shortUrl,url);
        if(!url)  {
            res.status(404).json({
            message: "Url not found"
        });
        }else{
        res.writeHead(301, {
            'Location': url.full
        });
        res.end(); 
        }     
    }).catch(err=>{
       console.log(err);
       res.status(500).json({
        message: "server error!"
    });
      });
})

function checkNotAuthenticated(req,res,next){
    if(req.isAuthenticated()){ return res.redirect('/');}
    next();
}


app.listen(process.env.PORT || 5000);