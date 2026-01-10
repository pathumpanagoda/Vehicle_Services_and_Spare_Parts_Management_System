const mongoose = require("mongoose");

const OrderSchema = mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    email: {
        type: String,
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
    address: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 200
    },
    contact: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^[0-9+\-\s()]+$/.test(v) && v.length >= 10 && v.length <= 15;
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['cash', 'card', 'online']
    },
    items: {
        type: Array,
        required: true,
        validate: {
            validator: function(v) {
                return v.length > 0;
            },
            message: 'Items array cannot be empty'
        }
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    orderDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        default: "processing",
        enum: ['processing', 'shipped', 'delivered', 'cancelled']
    },
});

module.exports = mongoose.model("Order", OrderSchema);
