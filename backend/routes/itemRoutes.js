const express = require("express");
const router = express.Router();
const Item = require("../models/Item");

// Create new item
router.post("/", async (req, res) => {
  try {
    const item = new Item(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    console.error("Create Error:", err);
    res.status(500).json({ message: "Failed to save item" });
  }
});

// Get all items
router.get("/", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch items" });
  }
});

// Get items by department (optional filter route)
router.get("/department/:department", async (req, res) => {
  try {
    const { department } = req.params;
    const items = await Item.find({ department });
    res.json(items);
  } catch (err) {
    console.error("Department Filter Error:", err);
    res.status(500).json({ message: "Failed to fetch items by department" });
  }
});

// Get items by category (optional filter route)
router.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const items = await Item.find({ category });
    res.json(items);
  } catch (err) {
    console.error("Category Filter Error:", err);
    res.status(500).json({ message: "Failed to fetch items by category" });
  }
});

// Get low stock items - Updated threshold to 20
router.get("/low-stock", async (req, res) => {
  try {
    const lowStockThreshold = 20; // Changed from 10 to 20
    const items = await Item.find({
      quantity: { $lt: lowStockThreshold }
    });
    res.json(items);
  } catch (err) {
    console.error("Low Stock Filter Error:", err);
    res.status(500).json({ message: "Failed to fetch low stock items" });
  }
});

// Get chart data - updated to include department breakdown
router.get("/chart-data", async (req, res) => {
  try {
    const categories = [
      'Raw Materials',
      'Work in Progress',
      'Finished Goods',
      'Spare Parts',
      'Packaging'
    ];

    // Aggregate quantity by category
    const data = await Item.aggregate([
      { $group: { _id: "$category", total: { $sum: "$quantity" } } }
    ]);

    // Map to ensure all categories are represented
    const chartData = categories.map(category => {
      const found = data.find(entry => entry._id === category);
      return {
        category,
        total: found ? found.total : 0
      };
    });

    res.json({
      labels: chartData.map(d => d.category),
      data: chartData.map(d => d.total)
    });
  } catch (err) {
    console.error("Chart Data Error:", err);
    res.status(500).json({ message: "Failed to fetch chart data" });
  }
});

// Get department chart data (new route for department breakdown)
router.get("/department-chart-data", async (req, res) => {
  try {
    const data = await Item.aggregate([
      { $group: { _id: "$department", total: { $sum: "$quantity" } } }
    ]);

    res.json({
      labels: data.map(d => d._id),
      data: data.map(d => d.total)
    });
  } catch (err) {
    console.error("Department Chart Data Error:", err);
    res.status(500).json({ message: "Failed to fetch department chart data" });
  }
});

// Update item (new route for edit functionality)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedItem = await Item.findByIdAndUpdate(
      id, 
      { ...req.body, lastUpdated: Date.now() }, 
      { new: true, runValidators: true }
    );
    
    if (!updatedItem) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    res.json(updatedItem);
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Failed to update item" });
  }
});

// Delete item (new route for delete functionality)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await Item.findByIdAndDelete(id);
    
    if (!deletedItem) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Failed to delete item" });
  }
});

// Get single item by ID (new route for view functionality)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Item.findById(id);
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    res.json(item);
  } catch (err) {
    console.error("Get Item Error:", err);
    res.status(500).json({ message: "Failed to fetch item" });
  }
});

module.exports = router;