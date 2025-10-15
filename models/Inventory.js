const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  type: {
    type: String,
    enum: ['Raw Material', 'Finished Product', 'Work in Progress', 'Consumable'],
    required: true
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  unitCost: {
    type: Number,
    default: 0,
    min: 0
  },
  sellingPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  minThreshold: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  maxThreshold: {
    type: Number,
    default: 1000,
    min: 0
  },
  qtyOnHand: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  qtyReserved: {
    type: Number,
    default: 0,
    min: 0
  },
  qtyOrdered: {
    type: Number,
    default: 0,
    min: 0
  },
  qtyAvailable: {
    type: Number,
    default: function() {
      return this.qtyOnHand - this.qtyReserved;
    }
  },
  location: {
    warehouse: {
      type: String,
      default: 'Main Warehouse'
    },
    aisle: {
      type: String,
      default: ''
    },
    shelf: {
      type: String,
      default: ''
    }
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isHazardous: {
    type: Boolean,
    default: false
  },
  hazardInfo: {
    type: String,
    default: ''
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [{
    type: String,
    trim: true
  }],
  images: [{
    url: String,
    caption: String
  }],
  reorderPoint: {
    type: Number,
    default: function() {
      return this.minThreshold;
    }
  },
  leadTime: {
    type: Number, // in days
    default: 7
  }
}, {
  timestamps: true
});

// Virtual for low stock status
inventorySchema.virtual('isLowStock').get(function() {
  return this.qtyOnHand <= this.minThreshold;
});

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  if (this.qtyOnHand === 0) return 'Out of Stock';
  if (this.qtyOnHand <= this.minThreshold) return 'Low Stock';
  if (this.qtyOnHand >= this.maxThreshold) return 'Overstock';
  return 'In Stock';
});

// Middleware to update qtyAvailable before save
inventorySchema.pre('save', function(next) {
  this.qtyAvailable = this.qtyOnHand - this.qtyReserved;
  this.lastUpdated = new Date();
  next();
});

// Indexes for better performance
inventorySchema.index({ sku: 1 });
inventorySchema.index({ name: 1 });
inventorySchema.index({ type: 1 });
inventorySchema.index({ category: 1 });
inventorySchema.index({ qtyOnHand: 1 });
inventorySchema.index({ isActive: 1 });
inventorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Inventory', inventorySchema);
