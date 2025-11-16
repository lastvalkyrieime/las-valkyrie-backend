const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  image: { type: String, required: true }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

// Routes
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Las Valkyrie API is running!',
    timestamp: new Date().toISOString()
  });
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();
    res.json({ success: true, data: savedProduct });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
