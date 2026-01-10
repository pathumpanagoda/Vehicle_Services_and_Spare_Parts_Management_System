const mongoose = require('mongoose');

// Function to generate a unique order ID
function generateBookingId() {
  // Generate a random number for the numerical part of the ID
  const randomNumber = Math.floor(1000 + Math.random() * 9000); // Generates a random 4-digit number
  
  // Concatenate 'B' with the random number to form the booking ID
  const BookingId = 'B' + randomNumber.toString();
  
  return BookingId;
}


const bookingSchema = new mongoose.Schema({
  bookingId: { 
    type: String, 
    default: generateBookingId,
    unique: true
  }, // Set default value to the function generateBookingId 
  ownerName: { 
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
  phone: { 
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
  specialNotes: { 
    type: String,
    trim: true,
    maxlength: 500
  },
  status: { 
    type: String, 
    default: 'pending',
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled']
  }, 
  mechanic: { 
    type: String,
    trim: true,
    maxlength: 100
  },
  location: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 100
  },
  serviceType: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  vehicleModel: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  vehicleNumber: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 20
  },
  date: { 
    type: Date, 
    required: true,
    min: Date.now
  },
  time: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format (HH:MM)!`
    }
  },
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
