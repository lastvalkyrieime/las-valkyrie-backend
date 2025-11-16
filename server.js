const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();

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

// Health check route (PENTING untuk Vercel)
app.get('/', (req, res) => {
    res.json({ 
        message: 'Las Valkyrie Backend is running!',
        timestamp: new Date().toISOString(),
        mongodb_status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// MongoDB Connection - VERCEL OPTIMIZED
const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔧 Initializing MongoDB connection...');
console.log('MongoDB URI available:', !!MONGODB_URI);

// MongoDB Schemas (DEFINE SEBELUM CONNECTION)
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
    collection: 'products'
});

const orderSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    discordId: { type: String, default: '' },
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
    collection: 'orders'
});

const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { 
    timestamps: true,
    collection: 'admins'
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

// Improved MongoDB connection with timeout
const connectDB = async () => {
    try {
        if (!MONGODB_URI) {
            console.log('❌ MONGODB_URI not found in environment variables');
            return;
        }

        // Connection options for better performance
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        await mongoose.connect(MONGODB_URI, options);
        console.log('✅ MongoDB Connected Successfully');
        
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.log('⚠️  Using fallback mode (in-memory storage)');
    }
};

// Connect to MongoDB
connectDB();

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
        console.log('➕ POST /api/products called');
        
        const productData = req.body;
        
        if (!productData.name || !productData.category || !productData.price || !productData.stock) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, category, price, stock'
            });
        }

        if (isMongoConnected()) {
            const newProduct = new Product(productData);
            const savedProduct = await newProduct.save();
            
            return res.json({
                success: true,
                message: 'Product created successfully',
                data: savedProduct
            });
        } else {
            const newProduct = {
                _id: 'prod_' + Date.now(),
                ...productData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            fallbackProducts.push(newProduct);
            
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
        console.log('🛒 POST /api/orders called');
        
        const orderData = req.body;
        
        if (!orderData.customerName || !orderData.items || orderData.items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: customerName and items'
            });
        }

        if (isMongoConnected()) {
            const newOrder = new Order(orderData);
            const savedOrder = await newOrder.save();
            
            await sendDiscordNotification(savedOrder);
            
            return res.json({
                success: true,
                message: 'Order created successfully',
                data: savedOrder
            });
        } else {
            const newOrder = {
                _id: 'order_' + Date.now(),
                ...orderData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            fallbackOrders.push(newOrder);
            
            await sendDiscordNotification(newOrder);
            
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

app.get('/api/orders', async (req, res) => {
    try {
        if (isMongoConnected()) {
            const orders = await Order.find().sort({ createdAt: -1 });
            return res.json({
                success: true,
                data: orders,
                message: 'Orders retrieved from MongoDB'
            });
        } else {
            return res.json({
                success: true,
                data: fallbackOrders,
                message: 'Orders retrieved from fallback storage'
            });
        }
    } catch (error) {
        console.error('❌ Error in /api/orders:', error.message);
        res.json({
            success: true,
            data: fallbackOrders,
            message: 'Orders retrieved from fallback storage (error)'
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('🚨 Unhandled Error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Export untuk Vercel (PENTING)
module.exports = app;
