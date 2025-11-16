const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
    origin: ['lv-resource-order.netlify.app', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());

// Koneksi MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
    }
};

connectDB();

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

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
app.options('*', cors());

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
