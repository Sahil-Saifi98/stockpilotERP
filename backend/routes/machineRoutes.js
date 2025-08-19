const express = require('express');
const router = express.Router();
const Machine = require('../models/machineModel');

// ✅ GET all machines (full data with components/materials)
router.get('/', async (req, res) => {
  try {
    const machines = await Machine.find({});
    res.json(machines);
  } catch (err) {
    console.error("❌ Failed to fetch machines:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router; // ✅ Add this line to fix the crash!
