const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS configuration yang lebih luas
app.use(cors({
    origin: '*', // Untuk testing, boleh pakai *
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple in-memory database untuk testing
let products = [
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

let orders = [];

// Routes
// Get all products
app.get('/api/products', (req, res) => {
    console.log('📦 GET /api/products called');
    res.json({
        success: true,
        data: products,
        message: 'Products retrieved successfully'
    });
});

// Create new order
app.post('/api/orders', (req, res) => {
    console.log('🛒 POST /api/orders called:', req.body);
    
    const orderData = req.body;
    const newOrder = {
        _id: 'order_' + Date.now(),
        ...orderData,
        createdAt: new Date().toISOString()
    };
    
    orders.push(newOrder);
    
    res.json({
        success: true,
        message: 'Order created successfully',
        data: newOrder
    });
});

// Admin login
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

// Get all orders (admin)
app.get('/api/orders', (req, res) => {
    console.log('📋 GET /api/orders called');
    res.json({
        success: true,
        data: orders,
        message: 'Orders retrieved successfully'
    });
});

// Update order status
app.put('/api/orders/:id', (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;
    
    const order = orders.find(o => o._id === orderId);
    if (order) {
        order.status = status;
        res.json({
            success: true,
            message: 'Order status updated successfully'
        });
    } else {
        res.status(404).json({
            success: false,
            error: 'Order not found'
        });
    }
});

// Health check endpoint - FIXED
app.get('/', (req, res) => {
    console.log('🏠 GET / called - Health check');
    res.json({
        success: true,
        message: 'Las Valkyrie API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        version: '2.0.0'
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
    console.log(`📍 Products: http://localhost:${PORT}/api/products`);
});

module.exports = app;
