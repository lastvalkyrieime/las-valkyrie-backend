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

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://lastvalkyrieime_db_user:lvime2025@lvresourcedatabase.9wth93k.mongodb.net/las_valkyrie?retryWrites=true&w=majority';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        // Tetap jalankan server meski MongoDB error
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

// ===== PRODUCT ROUTES =====
// Get all products
app.get('/api/products', async (req, res) => {
    try {
        console.log('📦 GET /api/products called');
        
        // Cek koneksi MongoDB
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                error: 'Database connection failed',
                data: getSampleProducts() // Fallback data
            });
        }
        
        const products = await Product.find().sort({ createdAt: -1 });
        
        res.json({
            success: true,
            data: products,
            message: 'Products retrieved successfully'
        });
    } catch (error) {
        console.error('❌ Error getting products:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            data: getSampleProducts() // Fallback data
        });
    }
});

// Add new product
app.post('/api/products', async (req, res) => {
    try {
        console.log('➕ POST /api/products called:', req.body);
        
        const productData = req.body;
        
        // Cek koneksi MongoDB
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                error: 'Database connection failed'
            });
        }
        
        const newProduct = new Product(productData);
        const savedProduct = await newProduct.save();
        
        res.json({
            success: true,
            message: 'Product created successfully',
            data: savedProduct
        });
    } catch (error) {
        console.error('❌ Error creating product:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const productData = req.body;
        
        // Cek koneksi MongoDB
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                error: 'Database connection failed'
            });
        }
        
        const updatedProduct = await Product.findByIdAndUpdate(
            productId, 
            productData, 
            { new: true, runValidators: true }
        );
        
        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: updatedProduct
        });
    } catch (error) {
        console.error('❌ Error updating product:', error);
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
        
        // Cek koneksi MongoDB
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                error: 'Database connection failed'
            });
        }
        
        const deletedProduct = await Product.findByIdAndDelete(productId);
        
        if (!deletedProduct) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Product deleted successfully',
            data: deletedProduct
        });
    } catch (error) {
        console.error('❌ Error deleting product:', error);
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
        
        // Cek koneksi MongoDB
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                error: 'Database connection failed'
            });
        }
        
        const newOrder = new Order(orderData);
        const savedOrder = await newOrder.save();
        
        res.json({
            success: true,
            message: 'Order created successfully',
            data: savedOrder
        });
    } catch (error) {
        console.error('❌ Error creating order:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all orders (admin)
app.get('/api/orders', async (req, res) => {
    try {
        console.log('📋 GET /api/orders called');
        
        // Cek koneksi MongoDB
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                error: 'Database connection failed',
                data: []
            });
        }
        
        const orders = await Order.find().sort({ createdAt: -1 });
        
        res.json({
            success: true,
            data: orders,
            message: 'Orders retrieved successfully'
        });
    } catch (error) {
        console.error('❌ Error getting orders:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            data: []
        });
    }
});

// Update order status
app.put('/api/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        
        // Cek koneksi MongoDB
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                error: 'Database connection failed'
            });
        }
        
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true }
        );
        
        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Order status updated successfully',
            data: updatedOrder
        });
    } catch (error) {
        console.error('❌ Error updating order:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== ADMIN ROUTES =====
app.post('/api/admin/login', (req, res) => {
    console.log('🔐 POST /api/admin/login called:', req.body);
    
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
            status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
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

// Fallback sample data
function getSampleProducts() {
    return [
        {
            _id: '1',
            name: 'AK-47',
            category: 'senjata',
            price: 15000,
            stock: 10,
            description: 'Senjata assault rifle - SAMPLE DATA'
        },
        {
            _id: '2',
            name: 'Body Armor', 
            category: 'armor',
            price: 8000,
            stock: 15,
            description: 'Pelindung tubuh level 3 - SAMPLE DATA'
        },
        {
            _id: '3',
            name: 'Ganja Premium',
            category: 'ganja',
            price: 5000,
            stock: 20,
            description: 'Ganja kualitas tinggi - SAMPLE DATA'
        }
    ];
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/`);
    console.log(`📍 MongoDB Status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
});

module.exports = app;
