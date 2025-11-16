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

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://lastvalkyrieime_db_user:lvime2025@lvresourcedatabase.9wth93k.mongodb.net/las_valkyrie?retryWrites=true&w=majority';

console.log('🔧 Initializing MongoDB connection...');

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
    collection: 'admin'
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

// Global connection state
let mongoConnected = false;

// Connect to MongoDB dengan error handling
const connectDB = async () => {
    try {
        if (!MONGODB_URI) {
            console.log('❌ MONGODB_URI not found');
            return false;
        }

        console.log('🔗 Attempting MongoDB connection...');
        
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };

        await mongoose.connect(MONGODB_URI, options);
        console.log('✅ MongoDB Connected Successfully');
        mongoConnected = true;
        return true;
        
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.log('⚠️  Using fallback mode (in-memory storage)');
        mongoConnected = false;
        return false;
    }
};

// Initialize connection
connectDB();

// ===== ROUTES =====

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Las Valkyrie Backend is running!',
        timestamp: new Date().toISOString(),
        mongodb_status: mongoConnected ? 'connected' : 'disconnected',
        database: 'las_valkyrie'
    });
});

// Database Check Endpoint - FIXED VERSION
app.get('/api/check-database', async (req, res) => {
    try {
        if (!mongoConnected) {
            return res.json({
                status: 'disconnected',
                message: 'MongoDB is not connected - using fallback mode',
                mode: 'fallback'
            });
        }

        // Pastikan koneksi masih aktif
        if (mongoose.connection.readyState !== 1) {
            mongoConnected = false;
            return res.json({
                status: 'disconnected',
                message: 'MongoDB connection lost',
                mode: 'fallback'
            });
        }

        const db = mongoose.connection.db;
        const databaseName = db.databaseName;
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        res.json({
            status: 'connected',
            connected_to_database: databaseName,
            available_collections: collectionNames,
            expected_collections: ['products', 'orders', 'admin'],
            missing_collections: ['products', 'orders', 'admin'].filter(col => !collectionNames.includes(col)),
            mode: 'database'
        });
        
    } catch (error) {
        console.error('Error in /api/check-database:', error);
        res.status(500).json({
            status: 'error',
            error: 'Internal server error in database check',
            message: error.message
        });
    }
});

// Check if admin user exists - SIMPLIFIED
app.get('/api/check-admin', async (req, res) => {
    try {
        if (mongoConnected && mongoose.connection.readyState === 1) {
            const adminCount = await Admin.countDocuments();
            res.json({
                has_admin: adminCount > 0,
                admin_count: adminCount,
                status: 'success',
                mode: 'database'
            });
        } else {
            res.json({
                has_admin: false,
                admin_count: 0,
                status: 'success', 
                mode: 'fallback'
            });
        }
    } catch (error) {
        res.json({
            has_admin: false,
            admin_count: 0,
            status: 'error',
            mode: 'fallback',
            error: error.message
        });
    }
});

// Products route - SIMPLIFIED
app.get('/api/products', async (req, res) => {
    try {
        if (mongoConnected && mongoose.connection.readyState === 1) {
            const products = await Product.find().sort({ createdAt: -1 });
            res.json({
                success: true,
                data: products,
                message: 'Products from database',
                mode: 'database'
            });
        } else {
            res.json({
                success: true,
                data: fallbackProducts,
                message: 'Products from fallback storage',
                mode: 'fallback'
            });
        }
    } catch (error) {
        res.json({
            success: true,
            data: fallbackProducts,
            message: 'Products from fallback storage (error)',
            mode: 'fallback'
        });
    }
});

// Simple test route
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Test route working',
        mongodb_connected: mongoConnected,
        mongodb_ready_state: mongoose.connection.readyState
    });
});

// Catch all route
app.get('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        requested_url: req.originalUrl
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 MongoDB Status: ${mongoConnected ? 'Connected' : 'Disconnected'}`);
});

module.exports = app;
