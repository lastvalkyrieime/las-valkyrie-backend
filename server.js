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

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://lastvalkyrieime_db_user:lvime2025@lvresourcedatabase.9wth93k.mongodb.net/las_valkyrie?retryWrites=true&w=majority';

console.log('🔧 Initializing MongoDB connection...');
console.log('📝 Database: las_valkyrie');

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB Connected Successfully to las_valkyrie database');
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
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    discordId: { type: String, required: true },
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
}, { timestamps: true });

const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Initialize admin user
const initializeAdmin = async () => {
    try {
        const adminExists = await Admin.findOne({ username: 'admin' });
        if (!adminExists) {
            await Admin.create({
                username: 'admin',
                password: 'lvime2025'
            });
            console.log('✅ Admin user initialized');
        }
    } catch (error) {
        console.log('ℹ️ Admin user already exists');
    }
};

// Fallback data
const fallbackProducts = [
    {
        _id: 'fallback_1',
        name: 'AK-47',
        category: 'senjata',
        price: 15000,
        stock: 10,
        description: 'Senjata assault rifle - FALLBACK MODE'
    },
    {
        _id: 'fallback_2',
        name: 'Body Armor', 
        category: 'armor',
        price: 8000,
        stock: 15,
        description: 'Pelindung tubuh level 3 - FALLBACK MODE'
    },
    {
        _id: 'fallback_3',
        name: 'Ganja Premium',
        category: 'ganja',
        price: 5000,
        stock: 20,
        description: 'Ganja kualitas tinggi - FALLBACK MODE'
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
                    value: `**Name:** ${order.customerName}\n**Discord ID:** ${order.discordId}`,
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
                },
                {
                    name: 'Additional Info',
                    value: order.additionalInfo || 'No additional information',
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Las Valkyrie Order System'
            }
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
app.get('/api/products', async (req, res) => {
    try {
        if (isMongoConnected()) {
            const products = await Product.find().sort({ createdAt: -1 });
            return res.json({
                success: true,
                data: products,
                message: 'Products retrieved from MongoDB',
                source: 'mongodb',
                count: products.length
            });
        } else {
            return res.json({
                success: true,
                data: fallbackProducts,
                message: 'Products retrieved from fallback storage',
                source: 'fallback',
                count: fallbackProducts.length
            });
        }
    } catch (error) {
        console.error('❌ Error in /api/products:', error.message);
        res.json({
            success: true,
            data: fallbackProducts,
            message: 'Products retrieved from fallback storage (error)',
            source: 'fallback',
            count: fallbackProducts.length
        });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const productData = req.body;
        
        if (isMongoConnected()) {
            const newProduct = new Product(productData);
            const savedProduct = await newProduct.save();
            
            return res.json({
                success: true,
                message: 'Product created successfully in MongoDB',
                data: savedProduct,
                source: 'mongodb'
            });
        } else {
            const newProduct = {
                _id: 'prod_' + Date.now(),
                ...productData,
                createdAt: new Date().toISOString()
            };
            fallbackProducts.push(newProduct);
            
            return res.json({
                success: true,
                message: 'Product created successfully in fallback storage',
                data: newProduct,
                source: 'fallback'
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

app.put('/api/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const updateData = req.body;
        
        if (isMongoConnected()) {
            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                updateData,
                { new: true }
            );
            
            if (!updatedProduct) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found in MongoDB'
                });
            }
            
            return res.json({
                success: true,
                message: 'Product updated successfully in MongoDB',
                data: updatedProduct
            });
        } else {
            const productIndex = fallbackProducts.findIndex(p => p._id === productId);
            if (productIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found in fallback storage'
                });
            }
            
            fallbackProducts[productIndex] = {
                ...fallbackProducts[productIndex],
                ...updateData
            };
            
            return res.json({
                success: true,
                message: 'Product updated successfully in fallback storage',
                data: fallbackProducts[productIndex]
            });
        }
    } catch (error) {
        console.error('❌ Error in PUT /api/products:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        
        if (isMongoConnected()) {
            const deletedProduct = await Product.findByIdAndDelete(productId);
            
            if (!deletedProduct) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found in MongoDB'
                });
            }
            
            return res.json({
                success: true,
                message: 'Product deleted successfully from MongoDB',
                data: deletedProduct
            });
        } else {
            const productIndex = fallbackProducts.findIndex(p => p._id === productId);
            if (productIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found in fallback storage'
                });
            }
            
            const deletedProduct = fallbackProducts.splice(productIndex, 1)[0];
            
            return res.json({
                success: true,
                message: 'Product deleted successfully from fallback storage',
                data: deletedProduct
            });
        }
    } catch (error) {
        console.error('❌ Error in DELETE /api/products:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== ORDER ROUTES =====
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        
        if (isMongoConnected()) {
            const newOrder = new Order(orderData);
            const savedOrder = await newOrder.save();
            
            // Send Discord notification
            await sendDiscordNotification(savedOrder);
            
            return res.json({
                success: true,
                message: 'Order created successfully in MongoDB',
                data: savedOrder,
                source: 'mongodb'
            });
        } else {
            const newOrder = {
                _id: 'order_' + Date.now(),
                ...orderData,
                createdAt: new Date().toISOString()
            };
            fallbackOrders.push(newOrder);
            
            // Send Discord notification
            await sendDiscordNotification(newOrder);
            
            return res.json({
                success: true,
                message: 'Order created successfully in fallback storage',
                data: newOrder,
                source: 'fallback'
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
                message: 'Orders retrieved from MongoDB',
                count: orders.length
            });
        } else {
            return res.json({
                success: true,
                data: fallbackOrders,
                message: 'Orders retrieved from fallback storage',
                count: fallbackOrders.length
            });
        }
    } catch (error) {
        console.error('❌ Error in GET /api/orders:', error.message);
        res.json({
            success: true,
            data: fallbackOrders,
            message: 'Orders retrieved from fallback storage (error)',
            count: fallbackOrders.length
        });
    }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        
        if (isMongoConnected()) {
            const updatedOrder = await Order.findByIdAndUpdate(
                orderId,
                { status },
                { new: true }
            );
            
            if (!updatedOrder) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found in MongoDB'
                });
            }
            
            return res.json({
                success: true,
                message: 'Order status updated successfully in MongoDB',
                data: updatedOrder
            });
        } else {
            const order = fallbackOrders.find(o => o._id === orderId);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found in fallback storage'
                });
            }
            
            order.status = status;
            return res.json({
                success: true,
                message: 'Order status updated successfully in fallback storage',
                data: order
            });
        }
    } catch (error) {
        console.error('❌ Error in PUT /api/orders:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== ADMIN ROUTES =====
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (isMongoConnected()) {
            const admin = await Admin.findOne({ username, password });
            if (admin) {
                res.json({
                    success: true,
                    message: 'Login successful'
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
        } else {
            // Fallback admin credentials
            if (username === 'admin' && password === 'lvime2025') {
                res.json({
                    success: true,
                    message: 'Login successful (fallback mode)'
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
        }
    } catch (error) {
        console.error('❌ Error in POST /api/admin/login:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Las Valkyrie API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        version: '2.0.0',
        database: {
            status: isMongoConnected() ? 'connected' : 'disconnected',
            name: 'las_valkyrie'
        }
    });
});

// Initialize admin on startup
initializeAdmin();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/`);
    console.log(`📍 MongoDB Status: ${isMongoConnected() ? 'Connected' : 'Disconnected'}`);
});

module.exports = app;
