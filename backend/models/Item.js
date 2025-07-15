const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  itemCode: { type: String, required: true, unique: true },
  itemName: { type: String, required: true },
  category: {
    type: String,
    enum: ['Raw Materials', 'Work in Progress', 'Finished Goods', 'Spare Parts', 'Packaging'],
    required: true
  },
  quantity: { type: Number, required: true },
  reorderLevel: { type: Number, required: true },
  unitCost: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Item", itemSchema);
