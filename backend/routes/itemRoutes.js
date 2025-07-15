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


// Get fixed-category chart data for inventory
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



module.exports = router;

