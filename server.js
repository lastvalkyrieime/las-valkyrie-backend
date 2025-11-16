const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

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

// MongoDB Connection dengan connection string yang valid
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
    category: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    description: { type: String, default: '' }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    discordId: { type: String, default: '' },
    additionalInfo: { type: String, default: '' },
    items: [{
        productId: String,
        name: String,
        price: Number,
        quantity: Number
    }],
    totalPrice: { type: Number, required: true },
    status: { type: String, default: 'pending' }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// Fallback data jika MongoDB down
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

// ===== PRODUCT ROUTES =====
// Get all products
app.get('/api/products', async (req, res) => {
    try {
        console.log('📦 GET /api/products called');
        
        if (isMongoConnected()) {
            const products = await Product.find().sort({ createdAt: -1 });
            console.log(`✅ Found ${products.length} products in MongoDB`);
            
            return res.json({
                success: true,
                data: products,
                message: 'Products retrieved from MongoDB',
                source: 'mongodb',
                count: products.length
            });
        } else {
            console.log('⚠️  MongoDB not connected, using fallback data');
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

// Add new product
app.post('/api/products', async (req, res) => {
    try {
        console.log('➕ POST /api/products called:', req.body);
        
        const productData = req.body;
        
        if (isMongoConnected()) {
            const newProduct = new Product(productData);
            const savedProduct = await newProduct.save();
            
            console.log('✅ Product saved to MongoDB:', savedProduct._id);
            
            return res.json({
                success: true,
                message: 'Product created successfully in MongoDB',
                data: savedProduct,
                source: 'mongodb'
            });
        } else {
            // Add to fallback data
            const newProduct = {
                _id: 'prod_' + Date.now(),
                ...productData,
                createdAt: new Date().toISOString()
            };
            fallbackProducts.push(newProduct);
            
            console.log('✅ Product saved to fallback storage');
            
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

// Delete product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        console.log('🗑️  DELETE /api/products called for ID:', productId);
        
        if (isMongoConnected()) {
            const deletedProduct = await Product.findByIdAndDelete(productId);
            
            if (!deletedProduct) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found in MongoDB'
                });
            }
            
            console.log('✅ Product deleted from MongoDB');
            
            return res.json({
                success: true,
                message: 'Product deleted successfully from MongoDB',
                data: deletedProduct
            });
        } else {
            // Delete from fallback data
            const productIndex = fallbackProducts.findIndex(p => p._id === productId);
            if (productIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found in fallback storage'
                });
            }
            
            const deletedProduct = fallbackProducts.splice(productIndex, 1)[0];
            console.log('✅ Product deleted from fallback storage');
            
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
// Create new order
app.post('/api/orders', async (req, res) => {
    try {
        console.log('🛒 POST /api/orders called:', req.body);
        
        const orderData = req.body;
        
        if (isMongoConnected()) {
            const newOrder = new Order(orderData);
            const savedOrder = await newOrder.save();
            
            console.log('✅ Order saved to MongoDB');
            
            return res.json({
                success: true,
                message: 'Order created successfully in MongoDB',
                data: savedOrder,
                source: 'mongodb'
            });
        } else {
            // Add to fallback orders
            const newOrder = {
                _id: 'order_' + Date.now(),
                ...orderData,
                createdAt: new Date().toISOString()
            };
            fallbackOrders.push(newOrder);
            
            console.log('✅ Order saved to fallback storage');
            
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

// Get all orders
app.get('/api/orders', async (req, res) => {
    try {
        console.log('📋 GET /api/orders called');
        
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

// Update order status
app.put('/api/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        
        console.log('✏️  PUT /api/orders called for ID:', orderId, 'Status:', status);
        
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
            // Update in fallback orders
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
app.post('/api/admin/login', (req, res) => {
    try {
        console.log('🔐 POST /api/admin/login called');
        
        const { username, password } = req.body;
        
        if (username === 'admin' && password === 'lvime2025') {
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

// Handle preflight requests
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.status(200).send();
});

// Handle 404
app.use('*', (req, res) => {
    console.log('❌ 404 Route not found:', req.originalUrl);
    res.status(404).json({
        success: false,
        error: 'Route not found: ' + req.originalUrl
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('🚨 Server Error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error: ' + error.message
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/`);
    console.log(`📍 MongoDB Status: ${isMongoConnected() ? 'Connected' : 'Disconnected'}`);
    console.log(`📍 Database: las_valkyrie`);
});

module.exports = app;
