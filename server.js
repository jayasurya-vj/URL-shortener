import express from "express";
import mongoose from "mongoose";
import {ShortUrl} from "./models/shortUrl.js";


mongoose.connect('mongodb+srv://jayasurya:surya15VJ@cluster0.7ob4e.mongodb.net/?retryWrites=true&w=majority',{
useNewUrlParser:true, useUnifiedTopology:true
});

const app=express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended:true}));


app.get("/",(req,res)=>{
    let pageData = ShortUrl.find();
    pageData.then(data=>{
        res.render("index",{urls : data});

    }).catch(err=>{
       console.log(err);
       res.render("index");
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
        // shortUrl.visits++;
        // shortUrl.save();
        // res.setHeader("Content-Type", "text/html");
        // res.redirect( url.full );
        // console.log("hello");
        // res.end();
        // console.log("redirecting..")
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


app.listen(process.env.PORT || 5000);