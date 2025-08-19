// backend/routes/manufacturingItemRoutes.js
const express = require("express");
const router = express.Router();
const ManufacturingItem = require("../models/ManufacturingItem");

// Get all manufacturing items with filtering and sorting
router.get("/", async (req, res) => {
  try {
    const { 
      department, 
      stockType, 
      lowStock,
      search,
      sortBy = 'lastUpdated',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    let filterQuery = {};

    // Department filter
    if (department) {
      filterQuery.department = department;
    }

    // Stock type filter
    if (stockType) {
      switch (stockType) {
        case 'Ready Stock':
          filterQuery.readyStock = { $gt: 0 };
          break;
        case 'WIP':
          filterQuery.wipStock = { $gt: 0 };
          break;
        case 'Mixed':
          filterQuery.$and = [
            { readyStock: { $gt: 0 } },
            { wipStock: { $gt: 0 } }
          ];
          break;
        case 'Out of Stock':
          filterQuery.$and = [
            { readyStock: { $eq: 0 } },
            { wipStock: { $eq: 0 } }
          ];
          break;
      }
    }

    // Low stock filter
    if (lowStock === 'true') {
      filterQuery.$expr = {
        $lt: [{ $add: ["$readyStock", "$wipStock"] }, "$minStockLevel"]
      };
    }

    // Search filter
    if (search) {
      filterQuery.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const items = await ManufacturingItem.find(filterQuery).sort(sortOptions);

    res.json(items);

  } catch (err) {
    console.error("Fetch Manufacturing Items Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch manufacturing items",
      error: err.message 
    });
  }
});

// Get items with ready stock only (for issuing to WIP)
router.get("/ready-stock", async (req, res) => {
  try {
    const items = await ManufacturingItem.find({ 
      readyStock: { $gt: 0 } 
    }).sort({ itemName: 1 });

    res.json(items);
  } catch (err) {
    console.error("Fetch Ready Stock Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch ready stock items",
      error: err.message 
    });
  }
});

// Get stock flow chart data
router.get("/stock-flow-data", async (req, res) => {
  try {
    const items = await ManufacturingItem.find({}).sort({ itemName: 1 });

    const chartData = {
      labels: items.map(item => item.itemCode),
      readyStock: items.map(item => item.readyStock),
      wipStock: items.map(item => item.wipStock)
    };

    res.json(chartData);
  } catch (err) {
    console.error("Stock Flow Chart Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch stock flow data",
      error: err.message 
    });
  }
});

// Create new manufacturing item
router.post("/", async (req, res) => {
  try {
    const item = new ManufacturingItem(req.body);
    await item.save();
    res.status(201).json({
      message: "Manufacturing item created successfully",
      item
    });
  } catch (err) {
    console.error("Create Manufacturing Item Error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: "Item code already exists" 
      });
    }
    res.status(500).json({ 
      message: "Failed to create manufacturing item",
      error: err.message 
    });
  }
});

// Update manufacturing item
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, lastUpdated: Date.now() };

    const item = await ManufacturingItem.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Manufacturing item not found" });
    }

    res.json({
      message: "Manufacturing item updated successfully",
      item
    });
  } catch (err) {
    console.error("Update Manufacturing Item Error:", err);
    res.status(500).json({ 
      message: "Failed to update manufacturing item",
      error: err.message 
    });
  }
});

// Move items between Ready Stock and WIP
router.post("/move", async (req, res) => {
  try {
    const { itemIds, operation, quantity } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: "Item IDs are required" });
    }

    if (!operation || !['wip', 'ready'].includes(operation)) {
      return res.status(400).json({ message: "Invalid operation. Use 'wip' or 'ready'" });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Valid quantity is required" });
    }

    const results = [];

    for (const itemId of itemIds) {
      const item = await ManufacturingItem.findById(itemId);
      
      if (!item) {
        results.push({ itemId, error: "Item not found" });
        continue;
      }

      if (operation === 'wip') {
        // Move from Ready Stock to WIP
        if (item.readyStock < quantity) {
          results.push({ 
            itemId, 
            error: `Insufficient ready stock. Available: ${item.readyStock}` 
          });
          continue;
        }
        
        item.readyStock -= quantity;
        item.wipStock += quantity;
      } else if (operation === 'ready') {
        // Move from WIP to Ready Stock
        if (item.wipStock < quantity) {
          results.push({ 
            itemId, 
            error: `Insufficient WIP stock. Available: ${item.wipStock}` 
          });
          continue;
        }
        
        item.wipStock -= quantity;
        item.readyStock += quantity;
      }

      item.lastUpdated = Date.now();
      await item.save();
      
      results.push({ 
        itemId, 
        success: true, 
        newReadyStock: item.readyStock,
        newWipStock: item.wipStock
      });
    }

    res.json({
      message: "Move operation completed",
      results
    });

  } catch (err) {
    console.error("Move Items Error:", err);
    res.status(500).json({ 
      message: "Failed to move items",
      error: err.message 
    });
  }
});

// Dispatch items (reduce ready stock)
router.post("/dispatch", async (req, res) => {
  try {
    const { itemIds, destination, date, quantity } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: "Item IDs are required" });
    }

    if (!destination || !date || !quantity || quantity <= 0) {
      return res.status(400).json({ 
        message: "Destination, date, and valid quantity are required" 
      });
    }

    const results = [];

    for (const itemId of itemIds) {
      const item = await ManufacturingItem.findById(itemId);
      
      if (!item) {
        results.push({ itemId, error: "Item not found" });
        continue;
      }

      if (item.readyStock < quantity) {
        results.push({ 
          itemId, 
          error: `Insufficient ready stock for dispatch. Available: ${item.readyStock}` 
        });
        continue;
      }

      // Reduce ready stock
      item.readyStock -= quantity;
      item.lastUpdated = Date.now();
      await item.save();

      results.push({ 
        itemId, 
        success: true,
        dispatched: quantity,
        remainingStock: item.readyStock,
        destination,
        date
      });
    }

    res.json({
      message: "Dispatch operation completed",
      results
    });

  } catch (err) {
    console.error("Dispatch Items Error:", err);
    res.status(500).json({ 
      message: "Failed to dispatch items",
      error: err.message 
    });
  }
});

// Get single manufacturing item
router.get("/:id", async (req, res) => {
  try {
    const item = await ManufacturingItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: "Manufacturing item not found" });
    }

    res.json(item);
  } catch (err) {
    console.error("Get Manufacturing Item Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch manufacturing item",
      error: err.message 
    });
  }
});

// Delete manufacturing item
router.delete("/:id", async (req, res) => {
  try {
    const item = await ManufacturingItem.findByIdAndDelete(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: "Manufacturing item not found" });
    }

    res.json({ 
      message: "Manufacturing item deleted successfully",
      deletedItem: {
        itemCode: item.itemCode,
        itemName: item.itemName
      }
    });
  } catch (err) {
    console.error("Delete Manufacturing Item Error:", err);
    res.status(500).json({ 
      message: "Failed to delete manufacturing item",
      error: err.message 
    });
  }
});

// Get low stock manufacturing items
router.get("/alerts/low-stock", async (req, res) => {
  try {
    const items = await ManufacturingItem.find({
      $expr: {
        $lt: [{ $add: ["$readyStock", "$wipStock"] }, "$minStockLevel"]
      }
    }).sort({ itemName: 1 });

    res.json(items);
  } catch (err) {
    console.error("Low Stock Alert Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch low stock items",
      error: err.message 
    });
  }
});

// Get manufacturing item statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const stats = await ManufacturingItem.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalReadyStock: { $sum: "$readyStock" },
          totalWipStock: { $sum: "$wipStock" },
          itemsWithReadyStock: { 
            $sum: { $cond: [{ $gt: ["$readyStock", 0] }, 1, 0] } 
          },
          itemsWithWipStock: { 
            $sum: { $cond: [{ $gt: ["$wipStock", 0] }, 1, 0] } 
          },
          lowStockItems: {
            $sum: {
              $cond: [
                { $lt: [{ $add: ["$readyStock", "$wipStock"] }, "$minStockLevel"] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const departmentStats = await ManufacturingItem.aggregate([
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
          readyStock: { $sum: "$readyStock" },
          wipStock: { $sum: "$wipStock" }
        }
      }
    ]);

    res.json({
      summary: stats[0] || {
        totalItems: 0,
        totalReadyStock: 0,
        totalWipStock: 0,
        itemsWithReadyStock: 0,
        itemsWithWipStock: 0,
        lowStockItems: 0
      },
      departmentBreakdown: departmentStats
    });

  } catch (err) {
    console.error("Manufacturing Stats Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch manufacturing statistics",
      error: err.message 
    });
  }
});

module.exports = router;