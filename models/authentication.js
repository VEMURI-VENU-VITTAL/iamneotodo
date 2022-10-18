const mongoose=require('mongoose');
const Schema=mongoose.Schema;
const passportLocalMongoose=require("passport-local-mongoose");


const AuthSchema=new Schema({
    email:{
        type:String,
        required:true,
        unique:true
    }
})

AuthSchema.plugin(passportLocalMongoose);

module.exports=mongoose.model('Auth',AuthSchema);
