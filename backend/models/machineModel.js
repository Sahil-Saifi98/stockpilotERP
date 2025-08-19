const mongoose = require("mongoose");

const MaterialSchema = new mongoose.Schema({
  name: String,
  sizes: [String],
  processes: [String],
});

const ComponentSchema = new mongoose.Schema({
  name: String,
  materials: [MaterialSchema], // ← 🔄 Now an array of materials
});

const MachineSchema = new mongoose.Schema({
  name: String,
  components: [ComponentSchema],
});

module.exports = mongoose.model("Machine", MachineSchema);
