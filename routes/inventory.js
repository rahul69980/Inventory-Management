const express = require('express');
const router = express.Router();

// Models
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const Alert = require('../models/Alert');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');

// Add item page
router.get('/add-item', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    const suppliers = await Supplier.find({ isActive: true }).sort({ name: 1 });
    
    res.render('add-item', { 
      categories,
      suppliers,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Add item page error:', error);
    res.render('add-item', { 
      categories: [],
      suppliers: [],
      error: 'Failed to load form data',
      success: null
    });
  }
});

// Edit item page
router.get('/edit-item/:id', async (req, res) => {
  try {
    const [item, categories, suppliers] = await Promise.all([
      Inventory.findById(req.params.id)
        .populate('category')
        .populate('supplier'),
      Category.find({ isActive: true }).sort({ name: 1 }),
      Supplier.find({ isActive: true }).sort({ name: 1 })
    ]);

    if (!item) {
      return res.redirect('/inventory-list?error=Item not found');
    }

    res.render('edit-item', { 
      item,
      categories,
      suppliers,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Edit item page error:', error);
    res.redirect('/inventory-list?error=Failed to load item');
  }
});

// Inventory list page
router.get('/inventory-list', async (req, res) => {
  try {
    res.render('inventory-list', {
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error('Inventory list page error:', error);
    res.render('inventory-list', {
      error: 'Failed to load inventory list',
      success: null
    });
  }
});

// Low stock page
router.get('/low-stock', async (req, res) => {
  try {
    res.render('low-stock', {
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Low stock page error:', error);
    res.render('low-stock', {
      error: 'Failed to load low stock items',
      success: null
    });
  }
});

// Alerts page
router.get('/alerts', async (req, res) => {
  try {
    res.render('alerts', {
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Alerts page error:', error);
    res.render('alerts', {
      error: 'Failed to load alerts',
      success: null
    });
  }
});

// Transaction log page
router.get('/transaction-log', async (req, res) => {
  try {
    res.render('transaction-log', {
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Transaction log page error:', error);
    res.render('transaction-log', {
      error: 'Failed to load transaction log',
      success: null
    });
  }
});

// Hazardous materials page
router.get('/hazardous-materials', async (req, res) => {
  try {
    res.render('hazardous-materials', {
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Hazardous materials page error:', error);
    res.render('hazardous-materials', {
      error: 'Failed to load hazardous materials',
      success: null
    });
  }
});

// Reserved items page
router.get('/reserved-items', async (req, res) => {
  try {
    res.render('reserved-items', {
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Reserved items page error:', error);
    res.render('reserved-items', {
      error: 'Failed to load reserved items',
      success: null
    });
  }
});

// Items available page
router.get('/items-available', async (req, res) => {
  try {
    res.render('items-available', {
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Items available page error:', error);
    res.render('items-available', {
      error: 'Failed to load available items',
      success: null
    });
  }
});

module.exports = router;
