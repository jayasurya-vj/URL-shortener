import mongoose from "mongoose";
import shortId from "shortId";    //for shorturl genration

export const shortUrlSchema = new mongoose.Schema({
    full:{
        type:String,
        required:true
    },
    short:{
        type:String,
        required:true,
        default: shortId.generate
    }
});

export const ShortUrl = mongoose.model("ShortUrl",shortUrlSchema);