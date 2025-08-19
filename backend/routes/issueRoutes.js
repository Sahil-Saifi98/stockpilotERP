// backend/routes/issueRoutes.js
const express = require("express");
const router = express.Router();
const Issue = require("../models/Issue");
const ManufacturingItem = require("../models/ManufacturingItem");

// Create new issue to WIP
router.post("/", async (req, res) => {
  try {
    const { productId, quantity, issuedTo, workOrder, machine, date, issuedBy, remarks } = req.body;

    // Validate required fields
    if (!productId || !quantity || !issuedTo || !workOrder || !machine || !date) {
      return res.status(400).json({ 
        message: "All fields are required: productId, quantity, issuedTo, workOrder, machine, date" 
      });
    }

    // Find the manufacturing item
    const manufacturingItem = await ManufacturingItem.findById(productId);
    if (!manufacturingItem) {
      return res.status(404).json({ message: "Manufacturing item not found" });
    }

    // Check if sufficient ready stock is available
    if (manufacturingItem.readyStock < quantity) {
      return res.status(400).json({ 
        message: `Insufficient ready stock. Available: ${manufacturingItem.readyStock}, Required: ${quantity}` 
      });
    }

    // Create issue record
    const issue = new Issue({
      productId,
      productName: manufacturingItem.itemName,
      itemCode: manufacturingItem.itemCode,
      quantity: parseInt(quantity),
      issuedTo,
      workOrder,
      machine,
      date: new Date(date),
      issuedBy: issuedBy || "Admin",
      department: manufacturingItem.department,
      remarks: remarks || ""
    });

    // Update manufacturing item - move from ready stock to WIP
    manufacturingItem.readyStock -= parseInt(quantity);
    manufacturingItem.wipStock += parseInt(quantity);
    manufacturingItem.lastUpdated = Date.now();

    // Save both records
    await issue.save();
    await manufacturingItem.save();

    res.status(201).json({
      message: "Items successfully issued to WIP",
      issue,
      updatedItem: {
        itemCode: manufacturingItem.itemCode,
        itemName: manufacturingItem.itemName,
        readyStock: manufacturingItem.readyStock,
        wipStock: manufacturingItem.wipStock
      }
    });

  } catch (err) {
    console.error("Issue Creation Error:", err);
    res.status(500).json({ 
      message: "Failed to issue items to WIP",
      error: err.message 
    });
  }
});

// Get all issues with filtering
router.get("/", async (req, res) => {
  try {
    const { 
      workOrder, 
      issuedTo, 
      status, 
      startDate, 
      endDate,
      search,
      page = 1,
      limit = 100
    } = req.query;

    // Build filter query
    let filterQuery = {};

    if (workOrder) filterQuery.workOrder = workOrder;
    if (issuedTo) filterQuery.issuedTo = issuedTo;
    if (status) filterQuery.status = status;

    // Date range filter
    if (startDate || endDate) {
      filterQuery.date = {};
      if (startDate) filterQuery.date.$gte = new Date(startDate);
      if (endDate) filterQuery.date.$lte = new Date(endDate);
    }

    // Search filter
    if (search) {
      filterQuery.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } },
        { workOrder: { $regex: search, $options: 'i' } },
        { issuedTo: { $regex: search, $options: 'i' } },
        { machine: { $regex: search, $options: 'i' } }
      ];
    }

    const issues = await Issue.find(filterQuery)
      .populate('productId', 'itemName department readyStock wipStock')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalCount = await Issue.countDocuments(filterQuery);

    res.json({
      issues,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalCount / limit),
        count: totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error("Fetch Issues Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch issue records",
      error: err.message 
    });
  }
});

// Get single issue by ID
router.get("/:id", async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('productId', 'itemName department readyStock wipStock');
    
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }
    
    res.json(issue);
  } catch (err) {
    console.error("Get Issue Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch issue",
      error: err.message 
    });
  }
});

// Update issue status
router.put("/:id", async (req, res) => {
  try {
    const { status, remarks } = req.body;
    
    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { status, remarks },
      { new: true, runValidators: true }
    );
    
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }
    
    res.json({ message: "Issue updated successfully", issue });
  } catch (err) {
    console.error("Update Issue Error:", err);
    res.status(500).json({ 
      message: "Failed to update issue",
      error: err.message 
    });
  }
});

// Delete issue (reverses the stock movement)
router.delete("/:id", async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // Reverse the stock movement
    const manufacturingItem = await ManufacturingItem.findById(issue.productId);
    if (manufacturingItem) {
      manufacturingItem.readyStock += issue.quantity;
      manufacturingItem.wipStock = Math.max(0, manufacturingItem.wipStock - issue.quantity);
      manufacturingItem.lastUpdated = Date.now();
      await manufacturingItem.save();
    }

    await Issue.findByIdAndDelete(req.params.id);
    
    res.json({ 
      message: "Issue deleted successfully and stock movement reversed",
      reversedQuantity: issue.quantity,
      itemCode: issue.itemCode
    });
    
  } catch (err) {
    console.error("Delete Issue Error:", err);
    res.status(500).json({ 
      message: "Failed to delete issue",
      error: err.message 
    });
  }
});

// Get issue statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const stats = await Issue.aggregate([
      {
        $group: {
          _id: null,
          totalIssues: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          uniqueWorkOrders: { $addToSet: "$workOrder" },
          uniquePersons: { $addToSet: "$issuedTo" }
        }
      }
    ]);

    const statusStats = await Issue.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          quantity: { $sum: "$quantity" }
        }
      }
    ]);

    res.json({
      summary: stats[0] || {
        totalIssues: 0,
        totalQuantity: 0,
        uniqueWorkOrders: [],
        uniquePersons: []
      },
      statusBreakdown: statusStats
    });

  } catch (err) {
    console.error("Issue Stats Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch issue statistics",
      error: err.message 
    });
  }
});

module.exports = router;