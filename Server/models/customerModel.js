const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    customerID:{
        type:String,
        required:true,
        unique: true,
        trim: true,
        minlength: 2,
        maxlength: 20
    },
    name:{
        type:String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    NIC:{
        type:String,
        required: true,
        trim: true,
        validate: {
          validator: function(v) {
            return /^[0-9]{9}[vVxX]|[0-9]{12}$/.test(v);
          },
          message: props => `${props.value} is not a valid NIC number!`
        }
    },
    address:{
        type:String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 200
    },
    contactno:{
        type:String,
        required: true,
        trim: true,
        validate: {
          validator: function(v) {
            return /^[0-9+\-\s()]+$/.test(v) && v.length >= 10 && v.length <= 15;
          },
          message: props => `${props.value} is not a valid phone number!`
        }
    },
    email:{
        type:String,
        required: true,
        lowercase: true,
        trim: true,
        validate: {
          validator: function(v) {
            return /^\S+@\S+\.\S+$/.test(v);
          },
          message: props => `${props.value} is not a valid email!`
        }
    },
    vType:{
        type:String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 20
    },
    vName:{
        type:String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    Regno:{
        type:String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 20
    },
    vColor:{
        type:String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 20
    },
    vFuel:{
        type:String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 20
    }
});

module.exports = Customer = mongoose.model("customer", CustomerSchema);