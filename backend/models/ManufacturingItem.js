// backend/models/ManufacturingItem.js
const mongoose = require("mongoose");

const manufacturingItemSchema = new mongoose.Schema({
  itemCode: { 
    type: String, 
    required: true, 
    unique: true 
  },
  itemName: { 
    type: String, 
    required: true 
  },
  department: {
    type: String,
    enum: ['Cylinder', 'PowerPack', 'Assembly', 'Quality', 'Testing'],
    required: true,
  },
  category: {
    type: String,
    enum: ['Raw Materials', 'Components', 'Sub-assemblies', 'Finished Products'],
    default: 'Raw Materials'
  },
  // Stock quantities
  readyStock: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  wipStock: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  // Minimum stock levels
  minStockLevel: {
    type: Number,
    default: 10
  },
  // Unit of measurement
  unit: {
    type: String,
    default: 'PCS',
    enum: ['PCS', 'KG', 'LITER', 'METER', 'SET']
  },
  // Pricing information (optional)
  unitPrice: {
    type: Number,
    default: 0
  },
  // Supplier information
  supplier: {
    type: String,
    default: ''
  },
  // Last updated timestamp
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  },
  // Created timestamp
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Virtual field for total stock
manufacturingItemSchema.virtual('totalStock').get(function() {
  return this.readyStock + this.wipStock;
});

// Virtual field for stock status
manufacturingItemSchema.virtual('stockStatus').get(function() {
  const total = this.readyStock + this.wipStock;
  if (total === 0) return 'Out of Stock';
  if (total < this.minStockLevel) return 'Low Stock';
  return 'In Stock';
});

// Virtual field for stock type
manufacturingItemSchema.virtual('stockType').get(function() {
  if (this.readyStock > 0 && this.wipStock > 0) return 'Mixed';
  if (this.readyStock > 0) return 'Ready Stock';
  if (this.wipStock > 0) return 'WIP';
  return 'Out of Stock';
});

// Include virtuals when converting to JSON
manufacturingItemSchema.set('toJSON', { virtuals: true });
manufacturingItemSchema.set('toObject', { virtuals: true });

// Indexes for better query performance
manufacturingItemSchema.index({ itemCode: 1 });
manufacturingItemSchema.index({ department: 1 });
manufacturingItemSchema.index({ readyStock: 1 });
manufacturingItemSchema.index({ wipStock: 1 });

// Pre-save middleware to update lastUpdated
manufacturingItemSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model("ManufacturingItem", manufacturingItemSchema);