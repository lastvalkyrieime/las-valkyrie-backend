const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configuration yang lebih fleksibel
app.use(cors({
    origin: ['https://lv-resource-order.netlify.app', 'http://localhost:3000', 'http://127.0.0.1:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Koneksi MongoDB dengan error handling yang lebih baik
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lasvalkyrie';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

connectDB();

// Basic routes untuk testing
app.get('/api/products', async (req, res) => {
    try {
        // Contoh data produk sementara
        const sampleProducts = [
            {
                _id: '1',
                name: 'AK-47',
                category: 'senjata',
                price: 15000,
                stock: 10,
                description: 'Senjata assault rifle'
            },
            {
                _id: '2', 
                name: 'Body Armor',
                category: 'armor',
                price: 8000,
                stock: 15,
                description: 'Pelindung tubuh level 3'
            },
            {
                _id: '3',
                name: 'Ganja Premium',
                category: 'ganja', 
                price: 5000,
                stock: 20,
                description: 'Ganja kualitas tinggi'
            }
        ];
        
        res.json({
            success: true,
            data: sampleProducts,
            message: 'Products retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        console.log('📦 New order received:', orderData);
        
        // Simpan ke database (sementara return success)
        res.json({
            success: true,
            message: 'Order created successfully',
            data: {
                orderId: 'ORD_' + Date.now(),
                ...orderData
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Admin routes
app.post('/api/admin/login', (req, res) => {
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

// Handle 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('🚨 Server Error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
