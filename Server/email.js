const nodemailer = require('nodemailer');

// Create a transporter object
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ADD2,
    pass: process.env.EMAIL_PW2,
  },
});

// Define a function to send the email
const sendEmail = async (email, subject, text) => {
  try {
    // Send mail with defined transport object
    await transporter.sendMail({
      from: 'pathu.help@gmail.com',
      to: email,
      subject: subject,                 
      text: text,
      
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = sendEmail;
