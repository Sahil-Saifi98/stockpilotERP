// backend/models/Dispatch.js
const mongoose = require("mongoose");

const dispatchSchema = new mongoose.Schema({
  items: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ManufacturingItem',
      required: true
    },
    itemCode: {
      type: String,
      required: true
    },
    itemName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  }],
  destination: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    default: ""
  },
  address: {
    type: String,
    default: ""
  },
  contactNumber: {
    type: String,
    default: ""
  },
  dispatchDate: {
    type: Date,
    required: true
  },
  deliveryDate: {
    type: Date,
    default: null
  },
  transportMode: {
    type: String,
    enum: ['Road', 'Rail', 'Air', 'Sea', 'Courier'],
    default: 'Road'
  },
  vehicleNumber: {
    type: String,
    default: ""
  },
  driverName: {
    type: String,
    default: ""
  },
  driverContact: {
    type: String,
    default: ""
  },
  dispatchedBy: {
    type: String,
    required: true,
    default: "Admin"
  },
  status: {
    type: String,
    enum: ['Prepared', 'Dispatched', 'In Transit', 'Delivered', 'Returned'],
    default: 'Prepared'
  },
  totalQuantity: {
    type: Number,
    default: 0
  },
  totalItems: {
    type: Number,
    default: 0
  },
  remarks: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to calculate totals
dispatchSchema.pre('save', function(next) {
  this.totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalItems = this.items.length;
  this.updatedAt = Date.now();
  next();
});

// Indexes for better performance
dispatchSchema.index({ dispatchDate: -1 });
dispatchSchema.index({ destination: 1 });
dispatchSchema.index({ status: 1 });
dispatchSchema.index({ customerName: 1 });

module.exports = mongoose.model("Dispatch", dispatchSchema);