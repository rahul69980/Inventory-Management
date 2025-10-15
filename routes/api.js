const express = require('express');
const router = express.Router();

// Models
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const Alert = require('../models/Alert');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');

// INVENTORY ROUTES

// Get all inventory items with pagination and filtering
router.get('/inventory', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.lowStock === 'true') {
      filter.$where = 'this.qtyOnHand <= this.minThreshold';
    }
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { sku: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const items = await Inventory.find(filter)
      .populate('category', 'name code')
      .populate('supplier', 'name code')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Inventory.countDocuments(filter);

    res.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single inventory item
router.get('/inventory/:id', async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('category', 'name code')
      .populate('supplier', 'name code contactPerson')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new inventory item
router.post('/inventory', async (req, res) => {
  try {
    const inventoryData = {
      ...req.body,
      createdBy: req.session.user._id,
      updatedBy: req.session.user._id
    };

    const item = new Inventory(inventoryData);
    await item.save();

    // Create initial transaction
    const transaction = new Transaction({
      inventory: item._id,
      type: 'IN',
      subType: 'PRODUCTION',
      quantity: item.qtyOnHand,
      balanceAfter: item.qtyOnHand,
      availableAfter: item.qtyAvailable,
      reason: 'Initial stock entry',
      createdBy: req.session.user._id
    });
    await transaction.save();

    // Check for alerts
    await Alert.createStockAlert(item);

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('inventory-updated', { type: 'created', item });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Create inventory error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'SKU already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update inventory item
router.put('/inventory/:id', async (req, res) => {
  try {
    const oldItem = await Inventory.findById(req.params.id);
    if (!oldItem) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    const updateData = {
      ...req.body,
      updatedBy: req.session.user._id
    };

    const item = await Inventory.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );

    // Create transaction if quantity changed
    if (req.body.qtyOnHand !== undefined && req.body.qtyOnHand !== oldItem.qtyOnHand) {
      const quantityDiff = req.body.qtyOnHand - oldItem.qtyOnHand;
      const transaction = new Transaction({
        inventory: item._id,
        type: quantityDiff > 0 ? 'IN' : 'OUT',
        subType: quantityDiff > 0 ? 'PRODUCTION' : 'CONSUMPTION',
        quantity: Math.abs(quantityDiff),
        balanceAfter: item.qtyOnHand,
        availableAfter: item.qtyAvailable,
        reason: req.body.reason || 'Manual adjustment',
        createdBy: req.session.user._id
      });
      await transaction.save();
    }

    // Check for alerts
    await Alert.createStockAlert(item);

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('inventory-updated', { type: 'updated', item });

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete inventory item
router.delete('/inventory/:id', async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // Create deletion transaction
    const transaction = new Transaction({
      inventory: item._id,
      type: 'OUT',
      subType: 'CONSUMPTION',
      quantity: item.qtyOnHand,
      balanceAfter: 0,
      availableAfter: 0,
      reason: 'Item deleted',
      createdBy: req.session.user._id
    });
    await transaction.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('inventory-updated', { type: 'deleted', item });

    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// TRANSACTION ROUTES

// Get transactions
router.get('/transactions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.inventory) filter.inventory = req.query.inventory;
    if (req.query.type) filter.type = req.query.type;

    const transactions = await Transaction.find(filter)
      .populate('inventory', 'sku name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ALERTS ROUTES

// Get all alerts
router.get('/alerts', async (req, res) => {
  try {
    const filter = {};
    if (req.query.resolved !== undefined) {
      filter.isResolved = req.query.resolved === 'true';
    }
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    const alerts = await Alert.find(filter)
      .populate('inventory', 'sku name qtyOnHand minThreshold')
      .sort({ priority: -1, createdAt: -1 });

    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark alert as resolved
router.put('/alerts/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: req.session.user._id,
        resolutionNotes: req.body.notes || '',
        actionTaken: req.body.actionTaken || 'OTHER'
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// CATEGORY ROUTES

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create category
router.post('/categories', async (req, res) => {
  try {
    const category = new Category({
      ...req.body,
      createdBy: req.session.user._id
    });
    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Create category error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Category name or code already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// SUPPLIER ROUTES

// Get all suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find({ isActive: true })
      .sort({ name: 1 });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create supplier
router.post('/suppliers', async (req, res) => {
  try {
    const supplier = new Supplier({
      ...req.body,
      createdBy: req.session.user._id
    });
    await supplier.save();
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Supplier code already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// DASHBOARD STATS

// Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue,
      recentTransactions,
      activeAlerts
    ] = await Promise.all([
      Inventory.countDocuments({ isActive: true }),
      Inventory.countDocuments({ 
        isActive: true,
        $where: 'this.qtyOnHand <= this.minThreshold && this.qtyOnHand > 0'
      }),
      Inventory.countDocuments({ 
        isActive: true,
        qtyOnHand: 0
      }),
      Inventory.aggregate([
        { $match: { isActive: true } },
        { 
          $group: {
            _id: null,
            totalValue: { 
              $sum: { $multiply: ['$qtyOnHand', '$unitCost'] }
            }
          }
        }
      ]),
      Transaction.find()
        .populate('inventory', 'sku name')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10),
      Alert.countDocuments({ isResolved: false })
    ]);

    res.json({
      success: true,
      data: {
        totalItems,
        lowStockItems,
        outOfStockItems,
        totalValue: totalValue[0]?.totalValue || 0,
        recentTransactions,
        activeAlerts
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
