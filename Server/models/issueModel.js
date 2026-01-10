const mongoose = require('mongoose');

const issueSchema = mongoose.Schema(
    {
      cid: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 20
      },
      Cname: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
      },
      Cnic: {
        type: String,
        required: true,
        trim: true,
        validate: {
          validator: function(v) {
            return /^[0-9]{9}[vVxX]|[0-9]{12}$/.test(v);
          },
          message: props => `${props.value} is not a valid NIC number!`
        }
      },
      Ccontact: {
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
      Clocation: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
        maxlength: 100
      },
      Cstatus: {
        type: String,
        required: true,
        enum: ['pending', 'in_progress', 'resolved', 'closed']
      },
    },
    {
      timestamps: true,
    }
  );

const Issue = mongoose.model('Issue', issueSchema);

module.exports = Issue;