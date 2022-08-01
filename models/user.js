import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

const userSchema = mongoose.Schema({
    name:{type:String,required:true},
  email:{type:String,required:true,unique:true},
  password:{type:String,required:true}
})

userSchema.plugin(uniqueValidator);

export const UserData = mongoose.model("UserData",userSchema);
