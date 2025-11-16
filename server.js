// server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors({
    origin: [
        'https://lv-resource-order.netlify.app',
        'https://las-valkyrie-shop.netlify.app',
        'http://localhost:3000',
        'http://localhost:5173'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));

app.use(express.json());

// ==================== DATABASE CONNECTION ====================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lasvalkyrie';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🎯 Host: ${mongoose.connection.host}`);
})
.catch((error) => {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
});

// ==================== PRODUCT SCHEMA & MODEL ====================
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Nama produk harus diisi'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Kategori harus diisi'],
        enum: ['Senjata', 'Armor', 'Drugs', 'Attachment', 'Alat Rampok']
    },
    price: {
        type: Number,
        required: [true, 'Harga harus diisi'],
        min: [0, 'Harga tidak boleh negatif']
    },
    stock: {
        type: Number,
        required: [true, 'Stok harus diisi'],
        min: [0, 'Stok tidak boleh negatif'],
        default: 0
    },
    image: {
        type: String,
        default: '📦'
    }
}, {
    timestamps: true
});

// Auto generate emoji based on category and name
productSchema.pre('save', function(next) {
    const categoryEmojis = {
        'Senjata': '🔫',
        'Armor': '🦺',
        'Drugs': '💊',
        'Attachment': '⚙️',
        'Alat Rampok': '🔧'
    };

    if (this.category === 'Drugs') {
        const lowerName = this.name.toLowerCase();
        if (lowerName.includes('ganja')) {
            this.image = '🌿';
        } else if (lowerName.includes('meth')) {
            this.image = '💊';
        } else {
            this.image = categoryEmojis[this.category] || '📦';
        }
    } else {
        this.image = categoryEmojis[this.category] || '📦';
    }
    
    next();
});

const Product = mongoose.model('Product', productSchema);

// ==================== ROUTES ====================

// Root endpoint - Test connection
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: "Las Valkyrie API is running!",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        version: '2.0.0',
        database: {
            status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            name: mongoose.connection.name,
            host: mongoose.connection.host
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        memory: process.memoryUsage()
    });
});

// ==================== PRODUCT ROUTES ====================

// GET all products
app.get('/api/products', async (req, res) => {
    try {
        console.log('📦 Fetching all products from database...');
        const products = await Product.find().sort({ createdAt: -1 });
        
        console.log(`✅ Found ${products.length} products`);
        
        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error('❌ Error fetching products:', error);
        res.status(500).json({
            success: false,
            error: 'Database Error',
            message: error.message
        });
    }
});

// GET single product by ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('❌ Error fetching product:', error);
        res.status(500).json({
            success: false,
            error: 'Database Error',
            message: error.message
        });
    }
});

// CREATE new product
app.post('/api/products', async (req, res) => {
    try {
        const { name, category, price, stock } = req.body;

        console.log('🆕 Creating new product:', { name, category, price, stock });

        // Validation
        if (!name || !category || !price || stock === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['name', 'category', 'price', 'stock']
            });
        }

        const product = new Product({
            name: name.trim(),
            category,
            price: Number(price),
            stock: Number(stock)
        });

        const savedProduct = await product.save();
        console.log('✅ Product created successfully:', savedProduct._id);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: savedProduct
        });
    } catch (error) {
        console.error('❌ Error creating product:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                messages: messages
            });
        }

        res.status(500).json({
            success: false,
            error: 'Database Error',
            message: error.message
        });
    }
});

// UPDATE product
app.put('/api/products/:id', async (req, res) => {
    try {
        const { name, category, price, stock } = req.body;

        console.log('✏️ Updating product:', req.params.id, { name, category, price, stock });

        // Validation
        if (!name || !category || !price || stock === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['name', 'category', 'price', 'stock']
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                name: name.trim(),
                category,
                price: Number(price),
                stock: Number(stock)
            },
            { 
                new: true, 
                runValidators: true 
            }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        console.log('✅ Product updated successfully:', product._id);

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });
    } catch (error) {
        console.error('❌ Error updating product:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                messages: messages
            });
        }

        res.status(500).json({
            success: false,
            error: 'Database Error',
            message: error.message
        });
    }
});

// DELETE product
app.delete('/api/products/:id', async (req, res) => {
    try {
        console.log('🗑️ Deleting product:', req.params.id);
        
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        console.log('✅ Product deleted successfully:', product._id);

        res.json({
            success: true,
            message: 'Product deleted successfully',
            data: product
        });
    } catch (error) {
        console.error('❌ Error deleting product:', error);
        res.status(500).json({
            success: false,
            error: 'Database Error',
            message: error.message
        });
    }
});

// ==================== ORDER ROUTES ====================
app.post('/api/orders', async (req, res) => {
    try {
        // Untuk future development
        res.json({
            success: true,
            message: 'Order system - under development'
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error',
            message: error.message
        });
    }
});

// ==================== ERROR HANDLING ====================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Endpoint not found",
        availableEndpoints: [
            "GET /",
            "GET /health",
            "GET /api/products",
            "GET /api/products/:id",
            "POST /api/products",
            "PUT /api/products/:id",
            "DELETE /api/products/:id",
            "POST /api/orders"
        ]
    });
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`⚔️ Las Valkyrie API running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`📍 Base URL: http://localhost:${PORT}`);
    console.log(`🗄️ Database: ${MONGODB_URI.split('@')[1]?.split('/')[0] || 'Local'}`);
});

module.exports = app;
