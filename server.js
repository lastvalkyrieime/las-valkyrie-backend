const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();

require('dotenv').config();

// CORS configuration
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection - FIXED VERSION
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://lastvalkyrieime_db_user:lvime2025@lvresourcedatabase.9wth93k.mongodb.net/las_valkyrie?retryWrites=true&w=majority';

console.log('🔧 Initializing MongoDB connection...');

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB Connected Successfully to las_valkyrie database');
        
        // Check if collections exist, create if not
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(col => col.name);
        
        if (!collectionNames.includes('products')) {
            await db.createCollection('products');
            console.log('✅ Created products collection');
        }
        
        if (!collectionNames.includes('orders')) {
            await db.createCollection('orders');
            console.log('✅ Created orders collection');
        }
        
        if (!collectionNames.includes('admins')) {
            await db.createCollection('admins');
            console.log('✅ Created admins collection');
            
            // Insert default admin user
            const Admin = mongoose.model('Admin', adminSchema);
            await Admin.create({
                username: 'admin',
                password: 'lvime2025'
            });
            console.log('✅ Created default admin user');
        }
        
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.log('⚠️  Using fallback mode (in-memory storage)');
    }
};

connectDB();

// MongoDB Schemas
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { 
        type: String, 
        required: true,
        enum: ['senjata', 'amunisi', 'armor', 'attachment', 'ganja', 'meth', 'alat rampok']
    },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    description: { type: String, default: '' }
}, { 
    timestamps: true,
    collection: 'products' // Explicit collection name
});

const orderSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    discordId: { type: String, default: '' }, // Made optional
    additionalInfo: { type: String, default: '' },
    items: [{
        productId: String,
        name: String,
        price: Number,
        quantity: Number,
        category: String
    }],
    totalPrice: { type: Number, required: true },
    status: { type: String, default: 'pending' }
}, { 
    timestamps: true,
    collection: 'orders' // Explicit collection name
});

const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { 
    timestamps: true,
    collection: 'admins' // Explicit collection name
});

const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Fallback data
const fallbackProducts = [
    {
        _id: 'fallback_1',
        name: 'AK-47',
        category: 'senjata',
        price: 15000,
        stock: 10,
        description: 'Senjata assault rifle - FALLBACK MODE'
    }
];

let fallbackOrders = [];

// Check MongoDB connection
function isMongoConnected() {
    return mongoose.connection.readyState === 1;
}

// Discord webhook function
const sendDiscordNotification = async (order) => {
    try {
        const discordWebhookURL = 'https://discord.com/api/webhooks/1439553975824154816/SLTHFdcpou_q-DhgO90k0l1f2OACzguDfQtYQENgfcvN0wbPSaS17h657JIuHCJbHqy3';
        
        const itemsList = order.items.map(item => 
            `• ${item.name} (${item.category}) - ${item.quantity} x $${item.price} = $${item.quantity * item.price}`
        ).join('\n');

        const embed = {
            title: '🛒 New Order Received!',
            color: 0x00ff00,
            fields: [
                {
                    name: 'Customer Info',
                    value: `**Name:** ${order.customerName}\n**Discord ID:** ${order.discordId || 'Not provided'}`,
                    inline: false
                },
                {
                    name: 'Order Details',
                    value: itemsList,
                    inline: false
                },
                {
                    name: 'Total Price',
                    value: `$${order.totalPrice}`,
                    inline: true
                },
                {
                    name: 'Status',
                    value: order.status,
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        };

        await axios.post(discordWebhookURL, {
            embeds: [embed]
        });

        console.log('✅ Discord notification sent');
    } catch (error) {
        console.error('❌ Failed to send Discord notification:', error.message);
    }
};

// ===== PRODUCT ROUTES =====
app.post('/api/products', async (req, res) => {
    try {
        console.log('➕ POST /api/products called:', req.body);
        
        const productData = req.body;
        
        // Validation
        if (!productData.name || !productData.category || !productData.price || !productData.stock) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, category, price, stock'
            });
        }

        if (isMongoConnected()) {
            const newProduct = new Product(productData);
            const savedProduct = await newProduct.save();
            
            console.log('✅ Product saved to MongoDB:', savedProduct._id);
            
            return res.json({
                success: true,
                message: 'Product created successfully',
                data: savedProduct
            });
        } else {
            // Add to fallback data
            const newProduct = {
                _id: 'prod_' + Date.now(),
                ...productData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            fallbackProducts.push(newProduct);
            
            console.log('✅ Product saved to fallback storage');
            
            return res.json({
                success: true,
                message: 'Product created successfully in fallback storage',
                data: newProduct
            });
        }
    } catch (error) {
        console.error('❌ Error in POST /api/products:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ... (other routes remain the same as before)

app.get('/api/products', async (req, res) => {
    try {
        if (isMongoConnected()) {
            const products = await Product.find().sort({ createdAt: -1 });
            return res.json({
                success: true,
                data: products,
                message: 'Products retrieved from MongoDB'
            });
        } else {
            return res.json({
                success: true,
                data: fallbackProducts,
                message: 'Products retrieved from fallback storage'
            });
        }
    } catch (error) {
        console.error('❌ Error in /api/products:', error.message);
        res.json({
            success: true,
            data: fallbackProducts,
            message: 'Products retrieved from fallback storage (error)'
        });
    }
});

// ===== ORDER ROUTES =====
app.post('/api/orders', async (req, res) => {
    try {
        console.log('🛒 POST /api/orders called:', req.body);
        
        const orderData = req.body;
        
        // Validation
        if (!orderData.customerName || !orderData.items || orderData.items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: customerName and items'
            });
        }

        if (isMongoConnected()) {
            const newOrder = new Order(orderData);
            const savedOrder = await newOrder.save();
            
            // Send Discord notification
            await sendDiscordNotification(savedOrder);
            
            console.log('✅ Order saved to MongoDB:', savedOrder._id);
            
            return res.json({
                success: true,
                message: 'Order created successfully',
                data: savedOrder
            });
        } else {
            // Add to fallback orders
            const newOrder = {
                _id: 'order_' + Date.now(),
                ...orderData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            fallbackOrders.push(newOrder);
            
            // Send Discord notification
            await sendDiscordNotification(newOrder);
            
            console.log('✅ Order saved to fallback storage');
            
            return res.json({
                success: true,
                message: 'Order created successfully in fallback storage',
                data: newOrder
            });
        }
    } catch (error) {
        console.error('❌ Error in POST /api/orders:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ... (other routes remain the same)

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/`);
    console.log(`📍 MongoDB Status: ${isMongoConnected() ? 'Connected' : 'Disconnected'}`);
});

module.exports = app;
