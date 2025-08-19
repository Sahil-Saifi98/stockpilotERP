const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  itemCode: { type: String, required: true, unique: true },
  itemName: { type: String, required: true },
  department: {
    type: String,
    enum: ['Cylinder', 'PowerPack'],
    required: true,
  },
  category: {
    type: String,
    enum: ['Raw Materials', 'Work in Progress', 'Finished Goods', 'Spare Parts', 'Packaging'],
    required: true
  },
  quantity: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Item", itemSchema);



