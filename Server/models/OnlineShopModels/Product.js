const mongoose = require("mongoose");

const ProductSchema = mongoose.Schema({
    id:{
        type: Number,
        required:true,
        unique: true
    },
    name:{
        type:String,
        required:true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    category:{
        type:String,
        required:true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    brand:{
        type:String,
        required:true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    new_price:{
        type:Number,
        required:true,
        min: 0
    },
    old_price:{
        type:Number,
        required:true,
        min: 0
    },
    description:{
        type:String,
        required:true,
        trim: true,
        maxlength: 500
    },
    quantity:{
        type:Number,
        required:true,
        min: 0
    },
    image:{
        type:String,
        required:true,
        validate: {
            validator: function(v) {
                return /^https?:\/\/.+/.test(v);
            },
            message: props => `${props.value} is not a valid URL!`
        }
    },
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    }
});

module.exports = mongoose.model("Product", ProductSchema);
