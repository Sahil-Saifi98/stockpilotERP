// backend/models/Purchase.js
const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
  date: { 
    type: Date, 
    required: true 
  },
  invoiceNo: { 
    type: String, 
    required: true,
    unique: true 
  },
  itemCode: { 
    type: String, 
    required: true 
  },
  partName: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 1 
  },
  addedBy: { 
    type: String, 
    required: true,
    default: "Admin" 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  // Reference to manufacturing item if this purchase updates manufacturing inventory
  manufacturingItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ManufacturingItem',
    default: null
  }
});

// Index for faster queries
purchaseSchema.index({ date: -1 });
purchaseSchema.index({ invoiceNo: 1 });
purchaseSchema.index({ itemCode: 1 });

module.exports = mongoose.model("Purchase", purchaseSchema);