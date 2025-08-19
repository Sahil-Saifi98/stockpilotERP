// backend/routes/purchaseRoutes.js
const express = require("express");
const router = express.Router();
const Purchase = require("../models/Purchase");
const ManufacturingItem = require("../models/ManufacturingItem");

// Create new purchase and update manufacturing inventory
router.post("/", async (req, res) => {
  try {
    const { date, invoiceNo, itemCode, partName, quantity, addedBy } = req.body;

    // Validate required fields
    if (!date || !invoiceNo || !itemCode || !partName || !quantity) {
      return res.status(400).json({ 
        message: "All fields are required: date, invoiceNo, itemCode, partName, quantity" 
      });
    }

    // Check if invoice number already exists
    const existingPurchase = await Purchase.findOne({ invoiceNo });
    if (existingPurchase) {
      return res.status(400).json({ 
        message: "Invoice number already exists" 
      });
    }

    // Create purchase record
    const purchase = new Purchase({
      date: new Date(date),
      invoiceNo,
      itemCode,
      partName,
      quantity: parseInt(quantity),
      addedBy: addedBy || "Admin"
    });

    // Find or create manufacturing item
    let manufacturingItem = await ManufacturingItem.findOne({ itemCode });
    
    if (manufacturingItem) {
      // Update existing item - add to ready stock
      manufacturingItem.readyStock += parseInt(quantity);
      manufacturingItem.lastUpdated = Date.now();
      
      // Update item name if different (in case of typo correction)
      if (manufacturingItem.itemName !== partName) {
        manufacturingItem.itemName = partName;
      }
      
      await manufacturingItem.save();
      purchase.manufacturingItemId = manufacturingItem._id;
    } else {
      // Create new manufacturing item
      manufacturingItem = new ManufacturingItem({
        itemCode,
        itemName: partName,
        department: 'Cylinder', // Default department, can be updated later
        readyStock: parseInt(quantity),
        wipStock: 0
      });
      
      await manufacturingItem.save();
      purchase.manufacturingItemId = manufacturingItem._id;
    }

    // Save purchase record
    await purchase.save();

    // Return success response with updated item info
    res.status(201).json({
      message: "Purchase added successfully and inventory updated",
      purchase,
      updatedItem: {
        itemCode: manufacturingItem.itemCode,
        itemName: manufacturingItem.itemName,
        readyStock: manufacturingItem.readyStock,
        totalStock: manufacturingItem.totalStock
      }
    });

  } catch (err) {
    console.error("Purchase Creation Error:", err);
    if (err.code === 11000) {
      // Duplicate key error
      return res.status(400).json({ 
        message: "Invoice number already exists" 
      });
    }
    res.status(500).json({ 
      message: "Failed to create purchase record",
      error: err.message 
    });
  }
});

// Get all purchases with pagination and filtering
router.get("/", async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 100, 
      sortBy = 'date', 
      sortOrder = 'desc',
      search,
      startDate,
      endDate,
      itemCode
    } = req.query;

    // Build filter query
    let filterQuery = {};

    // Search in invoice number, item code, or part name
    if (search) {
      filterQuery.$or = [
        { invoiceNo: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } },
        { partName: { $regex: search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filterQuery.date = {};
      if (startDate) filterQuery.date.$gte = new Date(startDate);
      if (endDate) filterQuery.date.$lte = new Date(endDate);
    }

    // Item code filter
    if (itemCode) {
      filterQuery.itemCode = itemCode;
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const purchases = await Purchase.find(filterQuery)
      .populate('manufacturingItemId', 'itemName department readyStock wipStock')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const totalCount = await Purchase.countDocuments(filterQuery);

    res.json({
      purchases,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalCount / limit),
        count: totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error("Fetch Purchases Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch purchase records",
      error: err.message 
    });
  }
});

// Get purchase by ID
router.get("/:id", async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('manufacturingItemId', 'itemName department readyStock wipStock');
    
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }
    
    res.json(purchase);
  } catch (err) {
    console.error("Get Purchase Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch purchase",
      error: err.message 
    });
  }
});

// Update purchase (limited fields)
router.put("/:id", async (req, res) => {
  try {
    const { addedBy } = req.body;
    
    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      { addedBy },
      { new: true, runValidators: true }
    );
    
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }
    
    res.json({ message: "Purchase updated successfully", purchase });
  } catch (err) {
    console.error("Update Purchase Error:", err);
    res.status(500).json({ 
      message: "Failed to update purchase",
      error: err.message 
    });
  }
});

// Delete purchase (admin only - also reverses inventory changes)
router.delete("/:id", async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    // Reverse inventory changes if manufacturing item exists
    if (purchase.manufacturingItemId) {
      const manufacturingItem = await ManufacturingItem.findById(purchase.manufacturingItemId);
      if (manufacturingItem) {
        // Subtract the quantity from ready stock
        manufacturingItem.readyStock = Math.max(0, manufacturingItem.readyStock - purchase.quantity);
        manufacturingItem.lastUpdated = Date.now();
        await manufacturingItem.save();
      }
    }

    // Delete purchase record
    await Purchase.findByIdAndDelete(req.params.id);
    
    res.json({ 
      message: "Purchase deleted successfully and inventory updated",
      reversedQuantity: purchase.quantity,
      itemCode: purchase.itemCode
    });
    
  } catch (err) {
    console.error("Delete Purchase Error:", err);
    res.status(500).json({ 
      message: "Failed to delete purchase",
      error: err.message 
    });
  }
});

// Get purchase statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let matchStage = {};
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate);
    }

    const stats = await Purchase.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          uniqueItems: { $addToSet: "$itemCode" },
          uniqueSuppliers: { $addToSet: "$invoiceNo" }
        }
      },
      {
        $project: {
          _id: 0,
          totalPurchases: 1,
          totalQuantity: 1,
          uniqueItemCount: { $size: "$uniqueItems" },
          uniqueInvoiceCount: { $size: "$uniqueSuppliers" }
        }
      }
    ]);

    res.json(stats[0] || {
      totalPurchases: 0,
      totalQuantity: 0,
      uniqueItemCount: 0,
      uniqueInvoiceCount: 0
    });

  } catch (err) {
    console.error("Purchase Stats Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch purchase statistics",
      error: err.message 
    });
  }
});

// Get monthly purchase trends
router.get("/stats/monthly-trends", async (req, res) => {
  try {
    const trends = await Purchase.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" }
          },
          totalQuantity: { $sum: "$quantity" },
          totalPurchases: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $switch: {
                  branches: [
                    { case: { $eq: ["$_id.month", 1] }, then: "01" },
                    { case: { $eq: ["$_id.month", 2] }, then: "02" },
                    { case: { $eq: ["$_id.month", 3] }, then: "03" },
                    { case: { $eq: ["$_id.month", 4] }, then: "04" },
                    { case: { $eq: ["$_id.month", 5] }, then: "05" },
                    { case: { $eq: ["$_id.month", 6] }, then: "06" },
                    { case: { $eq: ["$_id.month", 7] }, then: "07" },
                    { case: { $eq: ["$_id.month", 8] }, then: "08" },
                    { case: { $eq: ["$_id.month", 9] }, then: "09" },
                    { case: { $eq: ["$_id.month", 10] }, then: "10" },
                    { case: { $eq: ["$_id.month", 11] }, then: "11" },
                    { case: { $eq: ["$_id.month", 12] }, then: "12" }
                  ]
                }
              }
            ]
          },
          totalQuantity: 1,
          totalPurchases: 1
        }
      }
    ]);

    res.json(trends);
  } catch (err) {
    console.error("Monthly Trends Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch monthly trends",
      error: err.message 
    });
  }
});

module.exports = router;