const mongoose = require("mongoose");

const AdminSchema = mongoose.Schema({
    name:{
        type:String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    email:{
        type:String,
        required: true,
        unique:true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^\S+@\S+\.\S+$/.test(v);
            },
            message: props => `${props.value} is not a valid email!`
        }
    },
    password:{
        type:String,
        required: true,
        minlength: 8,
        maxlength: 128
    },
    role:{
        type: [String],
        default: ['admin']
    },
    date:{
        type:Date,
        default:Date.now,
    }
});

module.exports = mongoose.model("Admins", AdminSchema);