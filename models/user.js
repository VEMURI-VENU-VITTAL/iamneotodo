const mongoose=require("mongoose");

const Schema=mongoose.Schema;

const userSchema=new Schema({
    fname:String,
    work:[{
        type:String, 
    }],
    image:[{
        url:String,
        filename: String
    }],
    author:{
        type:Schema.Types.ObjectId,
        ref:'Auth'
    }
})

module.exports=mongoose.model('User',userSchema);