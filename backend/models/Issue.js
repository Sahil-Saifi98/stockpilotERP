// backend/models/Issue.js
const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ManufacturingItem',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  itemCode: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  issuedTo: {
    type: String,
    required: true
  },
  workOrder: {
    type: String,
    required: true
  },
  machine: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  issuedBy: {
    type: String,
    required: true,
    default: "Admin"
  },
  department: {
    type: String,
    default: ""
  },
  remarks: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ['Issued', 'Completed', 'Returned'],
    default: 'Issued'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
issueSchema.index({ date: -1 });
issueSchema.index({ workOrder: 1 });
issueSchema.index({ productId: 1 });
issueSchema.index({ issuedTo: 1 });

module.exports = mongoose.model("Issue", issueSchema);