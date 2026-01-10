const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const { log } = require("console");
const Joi = require("joi");

// Trust reverse proxy (Render/Heroku/NGINX) so req.secure & x-forwarded-proto work
app.set('trust proxy', 1);

// Remove Express fingerprinting
app.disable('x-powered-by');

// Helmet baseline (no CSP here — handled by another member)
app.use(helmet({
  frameguard: { action: 'deny' },   // X-Frame-Options: DENY
  hidePoweredBy: true,              // X-Powered-By removed
  noSniff: true,                    // X-Content-Type-Options: nosniff
  referrerPolicy: { policy: 'no-referrer' } // optional but safe default
}));
const Product = require("./models/OnlineShopModels/Product");
const Users = require("./models/OnlineShopModels/Users");
const Order = require("./models/OnlineShopModels/Order");
const Admins = require("./models/OnlineShopModels/Admin")
var nodemailer = require('nodemailer');

// Validation Schemas
const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim().required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required()
});

const productSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required(),
  category: Joi.string().min(2).max(50).trim().required(),
  brand: Joi.string().min(2).max(50).trim().required(),
  image: Joi.string().uri().required(),
  new_price: Joi.number().positive().required(),
  old_price: Joi.number().positive().required(),
  description: Joi.string().max(500).trim().required(),
  quantity: Joi.number().integer().min(0).required()
});

const orderSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).trim().required(),
  email: Joi.string().email().lowercase().trim().required(),
  address: Joi.string().min(10).max(200).trim().required(),
  contact: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(15).required(),
  paymentMethod: Joi.string().valid('cash', 'card', 'online').required(),
  items: Joi.array().items(Joi.object()).min(1).required(),
  totalAmount: Joi.number().positive().required()
});

const bookingSchema = Joi.object({
  ownerName: Joi.string().min(2).max(100).trim().required(),
  email: Joi.string().email().lowercase().trim().required(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(15).required(),
  specialNotes: Joi.string().max(500).trim().allow(''),
  location: Joi.string().min(5).max(100).trim().required(),
  serviceType: Joi.string().min(2).max(50).trim().required(),
  vehicleModel: Joi.string().min(2).max(50).trim().required(),
  vehicleNumber: Joi.string().min(2).max(20).trim().required(),
  date: Joi.date().min('now').required(),
  time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
});

const serviceSchema = Joi.object({
  serviceTitle: Joi.string().min(2).max(100).trim().required(),
  details: Joi.string().max(500).trim().allow(''),
  estimatedHour: Joi.string().min(1).max(20).trim().required(),
  image: Joi.string().uri().required()
});

const customerSchema = Joi.object({
  customerID: Joi.string().min(2).max(20).trim().required(),
  name: Joi.string().min(2).max(100).trim().required(),
  NIC: Joi.string().pattern(/^[0-9]{9}[vVxX]|[0-9]{12}$/).required(),
  address: Joi.string().min(10).max(200).trim().required(),
  contactno: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(15).required(),
  email: Joi.string().email().lowercase().trim().required(),
  vType: Joi.string().min(2).max(20).trim().required(),
  vName: Joi.string().min(2).max(50).trim().required(),
  Regno: Joi.string().min(2).max(20).trim().required(),
  vColor: Joi.string().min(2).max(20).trim().required(),
  vFuel: Joi.string().min(2).max(20).trim().required()
});

const issueSchema = Joi.object({
  cid: Joi.string().min(2).max(20).trim().required(),
  Cname: Joi.string().min(2).max(100).trim().required(),
  Cnic: Joi.string().pattern(/^[0-9]{9}[vVxX]|[0-9]{12}$/).required(),
  Ccontact: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(15).required(),
  Clocation: Joi.string().min(5).max(100).trim().required(),
  Cstatus: Joi.string().valid('pending', 'in_progress', 'resolved', 'closed').required()
});

// Strict CORS with allow-list
const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,https://vehicle-sever.onrender.com')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // allow same-origin / non-browser clients without Origin
    if (!origin) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked: origin not allowed'), false);
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','auth-token'],
  // Only enable credentials if the app actually uses cookies across origins.
  // credentials: true,
  optionsSuccessStatus: 204
};

app.use(express.json());
app.use(cors(corsOptions));

// HSTS (production + HTTPS only)
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  app.use((req, res, next) => {
    const https = req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (https) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
}

// MongoDB Connection - Mongo uri exposure vulnerability fixed by Kasundi
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/vehicle_services";
mongoose.connect(mongoURI)
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.error("MongoDB Connection Error:", err));

//API Creation

app.get("/",(req, res) =>{
    res.send("Express App is running")
})

// Image Storage Engine

const storage = multer.diskStorage({
    destination: './upload/images',
    filename:(req,file,cb)=>{
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 2 * 1024 * 1024 // 2MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
        const allowedExts = ['.jpg', '.jpeg', '.png'];
        
        if (!allowedMimes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only JPEG and PNG images are allowed.'), false);
        }
        
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedExts.includes(ext)) {
            return cb(new Error('Invalid file extension. Only .jpg, .jpeg, and .png files are allowed.'), false);
        }
        
        cb(null, true);
    }
})

//Creating upload endpoint for images
app.use('/images',express.static('upload/images'))

app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})

app.post('/addproduct', async (req,res)=>{
    try {
        // Validate input
        const { error, value } = productSchema.validate(req.body, { allowUnknown: false });
        if (error) {
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        const products = await Product.find({});
        let id = 1;

        if(products.length > 0) {
            const lastProduct = products[products.length - 1];
            id = lastProduct.id + 1;
        }

        const product = new Product({
            id: id,
            name: value.name,
            category: value.category,
            brand: value.brand,
            image: value.image,
            new_price: value.new_price,
            old_price: value.old_price,
            description: value.description,
            quantity: value.quantity,
        });

        console.log(product);
        await product.save();
        console.log("Saved");
        res.json({
            success: true,
            name: value.name,
        });
    } catch (error) {
        console.error("Error while adding product:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
})


// Creating API for deleting Product

app.post('/removeproduct',async (req,res)=>{
    try {
        // Validate input
        const { error, value } = Joi.object({
            id: Joi.number().integer().positive().required(),
            name: Joi.string().min(1).max(100).trim().required()
        }).validate(req.body, { allowUnknown: false });
        
        if (error) {
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        await Product.findOneAndDelete({id: value.id});
        console.log("Removed");
        res.json({
            success:true,
            name: value.name,
        });
    } catch (error) {
        console.error("Error while removing product:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
})

// Creating API for getting all products

app.get('/allproducts',async (req, res)=>{
    let products = await Product.find({})
    console.log("All Products Fetched");
    res.send(products);
})

const port = process.env.PORT || 5000;

app.listen(port,(error)=>{
    if(!error){
        console.log("Server Running on Port " + port)
    }else{
        console.log("Error : " + error)
    }
})

// Creating API for update product
app.put('/updateproduct/:id', async (req, res) => {
    try {
        // Validate productId
        const { error: idError, value: productId } = Joi.number().integer().positive().required().validate(req.params.id);
        if (idError) {
            return res.status(400).json({ success: false, error: 'Invalid product ID' });
        }

        // Validate input data
        const { error, value } = productSchema.validate(req.body, { allowUnknown: false });
        if (error) {
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        const product = await Product.findOneAndUpdate(
            { id: productId }, 
            value, 
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        console.log("Updated Product:", product);
        res.json({ success: true, product });
    } catch (error) {
        console.error("Error while updating product:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// Creating API for getting a specific product by ID
app.get('/product/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Find the product by ID
        const product = await Product.findOne({ id: productId });

        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        res.json({ success: true, product });
    } catch (error) {
        console.error("Error while fetching product:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

app.get('/lowStockProducts', async (req, res) => {
    try {
        let products = await Product.find({});
        
        // Filter products with quantity less than 2
        const lowStockProducts = products.filter(product => product.quantity < 3);

        if (lowStockProducts.length > 0) {
            // Send a notification or flag to indicate low stock products
            res.json({ success: true, products, lowStockProducts });
        } else {
            res.json({ success: true, products });
        }
    } catch (error) {
        console.error("Error while fetching all products:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

app.get('/processingOrdersCount', async (req, res) => {
    try {
        let orders = await Order.find({});

        const processingOrdersCount = orders.filter(Order => Order.status === 'processing');

        if (processingOrdersCount.length > 0) {
            res.json({ success: true, orders, processingOrdersCount });
        } else {
            res.json({ success: true, orders });
        }
    } catch (error) {
        console.error("Error while fetching processing orders:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

app.post('/signup',async (req,res) =>{
    try {
        // Validate input
        const { error, value } = userSchema.validate(req.body, { allowUnknown: false });
        if (error) {
            return res.status(400).json({success:false,errors: error.details[0].message});
        }

        let check = await Users.findOne({email: value.email});
        if(check){
            return res.status(400).json({success:false,errors:"existing user found with same email address"});
        }
        
        let cart = {};
        for (let i = 0; i < 300; i++){
            cart[i]=0;
        }
        
        const user = new Users({
            name: value.name,
            email: value.email,
            password: value.password,
            cartData: cart,
        });

        await user.save();

        const data = {
            user: {
                id: user.id
            }
        };

        const token = jwt.sign(data, process.env.JWT_SECRET || "default_jwt_secret");
        res.json({success:true,token});
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).json({success:false,errors:"Internal server error"});
    }
})


// Route to handle admin signup
app.post('/adminsignup', async (req, res) => {
    try {
        const { name, email, password, roles } = req.body;

        // Check if admin with the same email already exists
        const existingAdmin = await Admins.findOne({ email });

        if (existingAdmin) {
            return res.status(400).json({ success: false, errors: "An admin with this email already exists" });
        }

        // Create a new Admin document
        const newAdmin = new Admin({
            name,
            email,
            password,
            role: roles || [],  // Assign roles array to 'role' field
        });

        // Save the newAdmin document to the database
        await newAdmin.save();

        // Prepare response data
        const data = {
            Admin: {
                id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email,
                role: newAdmin.role,
            }
        };

        // Return success response with token (if needed)
        res.json({ success: true, data });
    } catch (error) {
        console.error('Admin signup error:', error);
        res.status(500).json({ success: false, errors: "Internal server error" });
    }
});

app.post('/login', async (req,res) => {
    try {
        // Validate input
        const { error, value } = loginSchema.validate(req.body, { allowUnknown: false });
        if (error) {
            return res.status(400).json({success:false,errors: error.details[0].message});
        }

        let user = await Users.findOne({email: value.email});
        if(user){
            const passCompare = value.password === user.password;
            if(passCompare){
                const data = {
                    user:{
                        id: user.id
                    }
                }
                const token = jwt.sign(data, process.env.JWT_SECRET || "default_jwt_secret");
                res.json({success:true,token});
            } else {
                res.json({success:false,errors:"Invalid credentials"});
            }
        } else {
            res.json({success:false,errors:"Invalid credentials"});
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({success:false,errors:"Internal server error"});
    }
})

app.post('/adminlogin', async (req,res) => {
    try {
        // Validate input
        const { error, value } = loginSchema.validate(req.body, { allowUnknown: false });
        if (error) {
            return res.status(400).json({success:false,errors: error.details[0].message});
        }

        let Admin = await Admins.findOne({email: value.email});
        if(Admin){
            const passCompare = value.password === Admin.password;
            if(passCompare){
                const data = {
                    Admin: {
                        id: Admin._id,
                        name: Admin.name,
                        email: Admin.email,
                        role: Admin.role,
                    }
                };
                const token = jwt.sign(data, process.env.JWT_SECRET || "default_jwt_secret");
                res.json({success:true,token});
            } else {
                res.json({success:false,errors:"Invalid credentials"});
            }
        } else {
            res.json({success:false,errors:"Invalid credentials"});
        }
    } catch (error) {
        console.error("Error during admin login:", error);
        res.status(500).json({success:false,errors:"Internal server error"});
    }
})

app.get('/newcollections', async (req,res) =>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection);
})

// jwt secret exposure vulnerability was fixed by kasundi
const fetchUser = async (req,res,next)=>{
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"please authenticate using valid token"})
    }
    else{
        try{
            const data = jwt.verify(token,process.env.JWT_SECRET || "default_jwt_secret");
            req.user = data.user;
            next();
        } catch(error){
            res.status(401).send({errors:"please authenticate using valid token"})
        }
    }
}

app.post('/addtocart', fetchUser, async (req, res) => {
    try {
        const itemId = Number(req.body.itemId);
        if (isNaN(itemId)) {
            return res.status(400).json({ success: false, error: 'Invalid item ID' });
        }

        const product = await Product.findOne({ id: itemId });

        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        if (product.quantity <= 0) {
            return res.status(400).json({ success: false, error: 'Product out of stock' });
        }

        product.quantity -= 1;
        await product.save();

        console.log("Added", itemId);

        let userData = await Users.findOne({ _id: req.user.id });
        userData.cartData[itemId] += 1;
        await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
        
        res.json({ success: true, message: "Item added to cart successfully" });
    } catch (error) {
        console.error("Error while adding item to cart:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});


app.post('/removefromcart', fetchUser, async (req, res) => {
    try {
        const itemId = Number(req.body.itemId);

        if (isNaN(itemId)) {
            return res.status(400).json({ success: false, error: 'Invalid item ID' });
        }

        let userData = await Users.findOne({ _id: req.user.id });


        if (userData.cartData[itemId] > 0) {

            userData.cartData[itemId] -= 1;
            
            const product = await Product.findOne({ id: itemId });


            product.quantity += 1;

            await product.save();

            await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });

            console.log("Removed", itemId);
            res.json({ success: true, message: "Item removed from cart successfully" });
        } else {
            res.status(400).json({ success: false, error: "Item not found in cart" });
        }
    } catch (error) {
        console.error("Error while removing item from cart:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});


app.post('/getcart',fetchUser,async (req,res) =>{
    console.log("GetCart");
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData)
})

// Function to generate a unique order ID
function generateOrderId() {
    // Generate a random string of characters for the order ID
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 8;
    let orderId = '';
    for (let i = 0; i < length; i++) {
        orderId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return orderId;
}

const getDefaultCart = () =>{
    let cart = {};
    for (let index = 0; index < 300 + 1; index++){
        cart[index]=0;
    }
    return cart;
}

const clearCart = async (userId) => {
    try {
        const defaultCart = getDefaultCart();
        await Users.findByIdAndUpdate(userId, {cartData : defaultCart });
        console.log("Cart cleared for user:", userId);
    } catch (error) {
        console.error("Error while clearing cart:", error);
    }
};

// email and password exposure vulnerability was fixed by kasundi
// Create a transporter using SMTP transport
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_ADD, 
        pass: process.env.EMAIL_PW
    }
});

app.post('/checkout',fetchUser, async (req, res) => {
    try {
        // Validate input
        const { error, value } = orderSchema.validate(req.body, { allowUnknown: false });
        if (error) {
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        const { fullName, email, address, contact, paymentMethod, items, totalAmount } = value;

        const orderId = generateOrderId();

        const order = new Order({
            orderId,
            fullName,
            email,
            address,
            contact,
            paymentMethod,
            items,
            totalAmount,
        });

        await order.save();

        const userId = req.user.id;

        await clearCart(userId);
        
        const mailOptions = {
            from: 'pprajeshvara@gmail.com',
            to: email,
            subject: 'Order Confirmation',
            text: `Dear ${fullName},\n\nYour order (${orderId}) has been successfully placed.\n\nTotal Amount:- Rs.${totalAmount}\nPayment Method:- ${paymentMethod}\nDate:- ${new Date(order.orderDate).toLocaleDateString()}\n\nThank you for shopping with us!`, // Email body
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        res.json({ success: true, orderId });
    } catch (error) {
        console.error("Error while saving order:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// Creating API for getting the quantity of a specific product
app.get('/product/quantity/:id', async (req, res) => {
    try {
        const productId = req.params.id;

        const product = await Product.findOne({ id: productId });

        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        res.json({ success: true, quantity: product.quantity });
    } catch (error) {
        console.error("Error while fetching product quantity:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// Define route for fetching all orders data
app.get('/orders', async (req, res) => {
    try {

        const orders = await Order.find({});

        res.json({ success: true, orders });
    } catch (error) {
        console.error("Error while fetching orders:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// Define route for delete order
app.delete('/order/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const deletedOrder = await Order.findOneAndDelete({ orderId });
        if (!deletedOrder) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        res.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        console.error("Error while deleting order:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// Define route for updating order status
app.put('/order/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const newStatus = req.body.status;
        const updatedOrder = await Order.findOneAndUpdate(
            { orderId: orderId },
            { status: newStatus },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        res.json({ success: true, order: updatedOrder });

        const { fullName, email } = updatedOrder;

        const mailOptions = {
            from: 'pprajeshvara@gmail.com',
            to: email,
            subject: 'Order Shipped',
            text: `Dear ${fullName},\n\nYour order (${orderId}) has been shipped. Thank you for shopping with us!`,
        };

        // Send the email
        await transporter.sendMail(mailOptions);
        
    } catch (error) {
        console.error("Error while updating order status:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

app.get('/processingOrders', async (req, res) => {
    try {
        const processingOrdersCount = await Order.countDocuments({ status: 'processing' });
        res.json({ success: true, processingOrdersCount });
    } catch (error) {
        console.error("Error while fetching processing orders count:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

app.get('/shippedOrders', async (req, res) => {
    try {
        const shippedOrdersCount = await Order.countDocuments({ status: 'shipped' });
        res.json({ success: true, shippedOrdersCount });
    } catch (error) {
        console.error("Error while fetching shipped orders count:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// Creating API to get the total amount of all orders
app.get('/totalAmountOfOrders', async (req, res) => {
    try {
        // Fetch all orders
        const orders = await Order.find({});

        // Calculate total amount by summing up 'totalAmount' field of each order
        const totalAmountOfOrders = orders.reduce((total, order) => total + order.totalAmount, 0);

        res.json({ success: true, totalAmountOfOrders });
    } catch (error) {
        console.error("Error while fetching total amount of all orders:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});


app.get('/deliveredOrders', async (req, res) => {
    try {
        const deliveredOrdersCount = await Order.countDocuments({ status: 'delivered' });
        res.json({ success: true, deliveredOrdersCount });
    } catch (error) {
        console.error("Error while fetching delivered orders count:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// Creating API to get the total amount of all orders
app.get('/totalAmountOfOrders', async (req, res) => {
    try {
        // Fetch all orders
        const orders = await Order.find({});

        // Calculate total amount by summing up 'totalAmount' field of each order
        const totalAmountOfOrders = orders.reduce((total, order) => total + order.totalAmount, 0);

        res.json({ success: true, totalAmountOfOrders });
    } catch (error) {
        console.error("Error while fetching total amount of all orders:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

app.get('/totalAmountOfDelivered', async (req, res) => {
    try {
        // Fetch orders with status 'delivered'
        const deliveredOrders = await Order.find({ status: 'delivered' });

        // Calculate total amount by summing up 'totalAmount' field of each delivered order
        const totalAmountOfDeliveredOrders = deliveredOrders.reduce((total, order) => total + order.totalAmount, 0);

        res.json({ success: true, totalAmountOfDeliveredOrders });
    } catch (error) {
        console.error("Error while fetching total amount of delivered orders:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

app.get('/totalAmountOfPending', async (req, res) => {
    try {
        // Fetch orders with status 'shipped' or 'processing'
        const pendingOrders = await Order.find({ status: { $in: ['shipped', 'processing'] } });

        // Calculate total amount by summing up 'totalAmount' field of each pending order
        const totalAmountOfPending = pendingOrders.reduce((total, order) => total + order.totalAmount, 0);

        res.json({ success: true, totalAmountOfPending });
    } catch (error) {
        console.error("Error while fetching total amount of pending orders:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});




//Pathum,s Booking routes

const Booking = require('./models/BookingModel');

app.post('/addbooking', async (req, res) => {
    try {
      // Validate input
      const { error, value } = bookingSchema.validate(req.body, { allowUnknown: false });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
  
      // Create a new booking instance
      const newBooking = new Booking(value);
  
      // Save the booking to the database
      await newBooking.save();
      console.log("booking added");
  
      res.status(201).json({ message: 'Booking saved successfully' });
    } catch (error) {
      console.error('Error saving booking:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });


  const sendEmail = require('./email');

  // Update booking status route
app.put('/updateBookingStatus2/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate status
        const { error, value } = Joi.object({
            status: Joi.string().valid('pending', 'accepted', 'in_progress', 'completed', 'cancelled').required()
        }).validate(req.body, { allowUnknown: false });
        
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const updatedBooking = await Booking.findByIdAndUpdate(
            id,
            { $set: { status: value.status } }, // Update status
            { new: true, runValidators: true }
        );
        
        if (!updatedBooking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        if (updatedBooking.status === 'accepted') {
            const { email } = updatedBooking;
            const subject = 'Booking Accepted';
            const text = 'We are excited to confirm your booking! Your service request has been accepted. We look forward to serving you on Booking Date at Booking Time. Should you have any questions, feel free to reach out. Thank you for choosing us.';
      
            await sendEmail(email, subject, text);
        }

        res.status(200).json({ message: 'Booking status updated successfully', updatedBooking });
    } catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
  

    // Update booking details route
    app.put('/updateBookingDetails/:id', async (req, res) => {
        try {
          const { id } = req.params;
          
          // Validate input
          const { error, value } = bookingSchema.validate(req.body, { allowUnknown: false });
          if (error) {
            return res.status(400).json({ error: error.details[0].message });
          }
          
          const updatedBooking = await Booking.findByIdAndUpdate(
            id,
            value, // Update booking details
            { new: true, runValidators: true }
          );
    
        if (!updatedBooking) {
          return res.status(404).json({ error: 'Booking not found' });
        }
        res.status(200).json({ message: 'Booking details updated successfully', updatedBooking });
        } catch (error) {
        console.error('Error updating booking details:', error);
        res.status(500).json({ error: 'Server error' });
        }
        }); 
    
    //get all booking details
    app.get('/allBookingRequest', async (req, res) => {
        try {
            const data = await Booking.find();
            res.json(data);
            console.log("All Booking Requests Fetched");
    
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
        }
    );  
        
    //pathum's Service Routes

const Service = require('./models/ServiceModel');

// POST route for adding a new service
app.post('/addservice', upload.single('image'), async (req, res) => {
    try {
        // Validate input
        const { error, value } = serviceSchema.validate(req.body, { allowUnknown: false });
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Create new service object
        const newService = new Service({
            serviceTitle: value.serviceTitle,
            estimatedHour: value.estimatedHour,
            details: value.details,
            imagePath: value.image, // Save image path
        });
        // Save the service to MongoDB
        await newService.save();
        res.json({
            success: true,
            name: value.serviceTitle,
        });
    } catch (error) {
        console.error('Error adding service:', error);
        res.status(500).json({ error: 'An error occurred while adding the service' });
    }
});

// 3. Create API endpoint to retrieve data
app.get('/allServices', async (req, res) => {
    try {
      const data = await Service.find();
      res.json(data);
      console.log("All Booking Requests Fetched");

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });


  // Define route for deleting booking requests
app.delete('/deleteBookingRequest/:id', async (req, res) => {
    const requestId = req.params.id;
  
    try {
      // Find the booking request by ID and delete it
      await Booking.findByIdAndDelete(requestId);
      res.status(200).send('Booking request deleted successfully');
    } catch (error) {
      console.error('Error deleting booking request:', error);
      res.status(500).send('Internal server error');
    }
  });
  
  
  
  // Define route for deleting Services
app.delete('/deleteServices/:id', async (req, res) => {
    const requestId = req.params.id;
  
    try {
      // Find the Services by ID and delete it
      await Service.findByIdAndDelete(requestId);
      res.status(200).send('Booking request deleted successfully');
    } catch (error) {
      console.error('Error deleting booking request:', error);
      res.status(500).send('Internal server error');
    }
  });

  // Add a new route to handle service updates
app.put('/updateservice/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate input
        const { error, value } = serviceSchema.validate(req.body, { allowUnknown: false });
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Find and update the service in the database
        const updatedService = await Service.findByIdAndUpdate(id, value, { new: true, runValidators: true });
        
        if (!updatedService) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        console.log("Service updated");
        res.status(200).json({ message: 'Service updated successfully', service: updatedService });
    } catch (error) {
        console.error('Error updating Service:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

  //Ruwindi routes
  const Issue = require('./models/issueModel');
const Admin = require("./models/OnlineShopModels/Admin");

  //Route for save new Issue
app.post('/issues', async (request, response) => {
    try {
        // Validate input
        const { error, value } = issueSchema.validate(request.body, { allowUnknown: false });
        if (error) {
            return response.status(400).send({
                message: error.details[0].message,
            });
        }

        const issue = await Issue.create(value);
        return response.status(201).send(issue);
    } catch (error) {
        console.log(error.message);
        response.status(500).send({ message: error.message })
    }
});

//Route for get all books from database
app.get('/issues', async (request, response) => {
    try {
        const issues = await Issue.find({});
        return response.status(200).json({
            count: issues.length,
            data: issues
        });
    } catch (error) {
        confirm.log(error.message);
        response.status(500).send({ message: error.message });
    }
});

//Route for get one book from database by id
app.get('/issues/:id', async (request, response) => {
    try {
        const { id } = request.params;

        const issue = await Issue.findById(id);
        return response.status(200).json(issue);
    } catch (error) {
        confirm.log(error.message);
        response.status(500).send({ message: error.message });
    }
});

//Route for update a Book
app.put('/issues/:id', async (request, response) => {
    try {
        // Validate input
        const { error, value } = issueSchema.validate(request.body, { allowUnknown: false });
        if (error) {
            return response.status(400).send({
                message: error.details[0].message,
            });
        }

        const { id } = request.params;

        const result = await Issue.findByIdAndUpdate(id, value, { new: true, runValidators: true });

        if (!result) {
            return response.status(404).json({ message: 'Issue not found' });
        }

        return response.status(200).json({ message: 'Issue update Successfully', issue: result });

    } catch (error) {
        console.log(error.message);
        response.status(500).send({ message: error.message });
    }
});

//Route for Delete a issue 
app.delete('/issues/:id', async (request, response) => {
    try {
        const { id } = request.params;

        const result = await Issue.findByIdAndDelete(id);

        if (!result) {
            return response.status(404).json({ message: 'Issue not found' });
        }

        return response.status(200).send({ message: 'Issue delete Successfully' });

    } catch (error) {
        console.log(error.message);
        response.status(500).send({ message: error.message });
    }
});

//Amada's Routes

const Customers = require("./models/customerModel");

app.post("/customers/", (req, res) => {
    try {
        // Validate input
        const { error, value } = customerSchema.validate(req.body, { allowUnknown: false });
        if (error) {
            return res.status(400).json({ msg: error.details[0].message });
        }

        Customers.create(value)
            .then(() => res.json({ msg: "Customer added successfully" }))
            .catch((err) => {
                console.error("Error creating customer:", err);
                res.status(400).json({ msg: "Customer adding failed" });
            });
    } catch (error) {
        console.error("Error validating customer data:", error);
        res.status(500).json({ msg: "Internal server error" });
    }
});

app.get("/customers/", (req, res) => {

    Customers.find()
        .then((customers) => res.json(customers))
        .catch(() => rex.status(400).json({ msg: "No employee" }));
});

app.get("/customers/:id", (req, res) => {
    Customers.findById(req.params.id)
        .then((customers) => res.json(customers))
        .catch(() => res.status(400).json({ msg: "cannot find this customer" }))
});

app.put("/customers/:id", (req, res) => {
    try {
        // Validate input
        const { error, value } = customerSchema.validate(req.body, { allowUnknown: false });
        if (error) {
            return res.status(400).json({ msg: error.details[0].message });
        }

        Customers.findByIdAndUpdate(req.params.id, value, { runValidators: true, new: true })
            .then((updatedCustomer) => {
                if (!updatedCustomer) {
                    return res.status(404).json({ msg: "Customer not found" });
                }
                res.json({ msg: "Update successfully", customer: updatedCustomer });
            })
            .catch((err) => {
                console.error("Error updating customer:", err);
                res.status(400).json({ msg: "Update fail" });
            });
    } catch (error) {
        console.error("Error validating customer data:", error);
        res.status(500).json({ msg: "Internal server error" });
    }
});

app.delete("/customers/:id", (req, res) => {
    Customers.findByIdAndDelete(req.params.id).then(() =>
        res
            .json({ msg: "Delete successfully" }))
            .catch(() => res.status(400).json({ msg: "Delete fail" }));
});

app.get('/allusers',async (req, res)=>{
    let users = await Admin.find({})
    console.log("All Users Fetched");
    res.send(users);
})

app.delete("/users/:id", (req, res) => {
    Admin.findByIdAndDelete(req.params.id).then(() =>
        res
            .json({ msg: "Delete successfully" }))
            .catch(() => res.status(400).json({ msg: "Delete fail" }));
});