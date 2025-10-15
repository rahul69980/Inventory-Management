const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'TXN' + Date.now() + Math.floor(Math.random() * 1000);
    }
  },
  inventory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  type: {
    type: String,
    enum: ['IN', 'OUT', 'ADJUST', 'TRANSFER', 'RESERVE', 'UNRESERVE'],
    required: true
  },
  subType: {
    type: String,
    enum: [
      'PURCHASE', 'RETURN', 'PRODUCTION',  // IN types
      'SALE', 'CONSUMPTION', 'WASTE', 'DAMAGED',  // OUT types
      'COUNT_ADJUST', 'LOSS_ADJUST',  // ADJUST types
      'WAREHOUSE_TRANSFER',  // TRANSFER types
      'ORDER_RESERVE', 'PRODUCTION_RESERVE',  // RESERVE types
      'ORDER_RELEASE', 'PRODUCTION_RELEASE'  // UNRESERVE types
    ]
  },
  quantity: {
    type: Number,
    required: true
  },
  unitCost: {
    type: Number,
    default: 0
  },
  totalValue: {
    type: Number,
    default: function() {
      return this.quantity * this.unitCost;
    }
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  availableAfter: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  reference: {
    type: String, // PO number, SO number, etc.
    default: ''
  },
  fromLocation: {
    warehouse: String,
    aisle: String,
    shelf: String
  },
  toLocation: {
    warehouse: String,
    aisle: String,
    shelf: String
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED'],
    default: 'COMPLETED'
  },
  notes: {
    type: String,
    default: ''
  },
  batchNumber: {
    type: String,
    default: ''
  },
  expiryDate: {
    type: Date
  },
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Virtual for formatted transaction ID
transactionSchema.virtual('formattedId').get(function() {
  return this.transactionId.toUpperCase();
});

// Virtual for transaction direction
transactionSchema.virtual('direction').get(function() {
  return ['IN', 'ADJUST'].includes(this.type) && this.quantity > 0 ? 'INBOUND' : 'OUTBOUND';
});

// Index for better performance
transactionSchema.index({ inventory: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ createdBy: 1 });

// Static method to get inventory transactions
transactionSchema.statics.getInventoryTransactions = function(inventoryId, limit = 50) {
  return this.find({ inventory: inventoryId })
    .populate('createdBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get recent transactions
transactionSchema.statics.getRecentTransactions = function(limit = 100) {
  return this.find()
    .populate('inventory', 'sku name')
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Transaction', transactionSchema);
