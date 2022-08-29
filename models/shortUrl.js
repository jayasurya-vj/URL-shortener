import mongoose from "mongoose";
import shortId from "shortid";    //for shorturl genration

export const shortUrlSchema = new mongoose.Schema({
    full:{
        type:String,
        required:true
    },
    short:{
        type:String,
        required:true,
        default: shortId.generate
    },
    creator: {type:mongoose.Schema.Types.ObjectId, ref:"User",required:true}
});

export const ShortUrl = mongoose.model("ShortUrl",shortUrlSchema);