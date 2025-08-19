const mongoose = require("mongoose");
const Machine = require("./models/machineModel");

mongoose.connect("mongodb://127.0.0.1:27017/inventorydb", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ Connection error:", err));

async function copyComponentData() {
  try {
    const machine = await Machine.findOne({ name: "Cylinder" });

    if (!machine) {
      console.warn("⚠️ Machine 'Powerpack' not found");
      return;
    }

    const components = machine.components;
    const sourceIndex = components.findIndex(c => c.name === "MAIN");
    const targetIndex = components.findIndex(c => c.name === "OTHER");

    if (sourceIndex === -1 || targetIndex === -1) {
      console.warn("⚠️ Source or target component not found (TANK or MANIFOLD)");
      return;
    }

    const sourceComponent = components[sourceIndex];
    const clonedComponent = {
      name: components[targetIndex].name, // Keep original name (MANIFOLD)
      materials: JSON.parse(JSON.stringify(sourceComponent.materials)), // Deep copy materials
    };

    // Replace the target component with cloned data
    components[targetIndex] = clonedComponent;

    await machine.save();
    console.log(`✅ Successfully copied 'TANK' data to 'MANIFOLD' in Powerpack`);
  } catch (err) {
    console.error("❌ Error during copy:", err);
  } finally {
    mongoose.disconnect();
  }
}

copyComponentData();
