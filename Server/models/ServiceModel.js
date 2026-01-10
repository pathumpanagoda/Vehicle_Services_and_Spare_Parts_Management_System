// Import required libraries
const mongoose = require('mongoose');

// Define the schema
const serviceSchema = new mongoose.Schema({
    serviceTitle: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    details: {
        type: String,
        trim: true,
        maxlength: 500
    }, 
    estimatedHour: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 20
    },
    imagePath: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v) {
                return /^https?:\/\/.+/.test(v);
            },
            message: props => `${props.value} is not a valid URL!`
        }
    } // Image path field    
});

// Create the model
const Service = mongoose.model('Service', serviceSchema);
module.exports = Service; 