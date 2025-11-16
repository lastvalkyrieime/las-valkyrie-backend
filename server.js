const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB Connection dengan timeout lebih panjang
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://lastvalkyrieime_db_user:lvime2025@lvresourcedatabase.9wth93k.mongodb.net/las_valkyrie?retryWrites=true&w=majority';

console.log('🔧 MongoDB Connection initialized');

let mongoConnected = false;

const connectDB = async () => {
    try {
        if (!MONGODB_URI) {
            console.log('❌ MONGODB_URI not found in environment');
            return;
        }

        console.log('🔗 Connecting to MongoDB...');
        
        // Connection options dengan timeout lebih panjang
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 30000, // 30 detik
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
            bufferCommands: false,
            bufferMaxEntries: 0
        };

        console.log('⏳ Attempting connection with 30s timeout...');
        
        await mongoose.connect(MONGODB_URI, options);
        
        console.log('✅ MongoDB Connected Successfully!');
        mongoConnected = true;
        
        // Test connection
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('📊 Collections found:', collections.map(c => c.name));
        
    } catch (error) {
        console.error('❌ MongoDB Connection FAILED:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        mongoConnected = false;
    }
};

// Start connection (non-blocking)
connectDB();

// ===== ROUTES =====

app.get('/', (req, res) => {
    const readyState = mongoose.connection.readyState;
    const states = {
        0: 'disconnected',
        1: 'connected', 
        2: 'connecting',
        3: 'disconnecting'
    };
    
    res.json({ 
        message: 'Las Valkyrie Backend is running!',
        timestamp: new Date().toISOString(),
        mongodb_ready_state: states[readyState] || 'unknown',
        mongodb_connected: mongoConnected,
        database: 'las_valkyrie'
    });
});

app.get('/api/test', (req, res) => {
    const readyState = mongoose.connection.readyState;
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting', 
        3: 'disconnecting'
    };
    
    res.json({
        message: 'Test route working',
        mongodb_connected: mongoConnected,
        mongodb_ready_state: states[readyState],
        ready_state_code: readyState
    });
});

// Simple products route (fallback only)
app.get('/api/products', (req, res) => {
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
    
    res.json({
        success: true,
        data: fallbackProducts,
        message: 'Products from fallback storage',
        mode: 'fallback',
        mongodb_connected: mongoConnected
    });
});

// Health check tanpa MongoDB dependency
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        server_time: new Date().toISOString(),
        mongodb_status: mongoConnected ? 'connected' : 'disconnected',
        uptime: process.uptime()
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
