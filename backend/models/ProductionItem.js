// models/ProductionItem.js
const mongoose = require('mongoose');

const processSchema = new mongoose.Schema({
  processId: String,
  name: String,
  status: {
    type: String,
    enum: ['waiting', 'in-progress', 'stop', 'completed'],
    default: 'waiting'
  },
  inProcessDuration: Number,
  pauseToNextDuration: Number,
  startTime: Date,
  pauseTime: Date
});

// NEW: Schema for halt duration records
const haltDurationSchema = new mongoose.Schema({
  workOrder: String,
  machine: String,
  type: String,
  component: String,
  fromProcess: String,
  toProcess: String,
  duration: Number,
  createdAt: { type: Date, default: Date.now }
});

const productionItemSchema = new mongoose.Schema({
  workOrder: String,
  machineName: String,
  requirementNo: String,
  department: String,
  component: String,
  material: String,
  size: String,
  processPath: [processSchema],
  currentProcessIndex: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Export both models
module.exports = {
  ProductionItem: mongoose.model("ProductionItem", productionItemSchema),
  HaltDuration: mongoose.model("HaltDuration", haltDurationSchema)
};