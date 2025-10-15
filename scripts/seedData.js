const mongoose = require('mongoose');

// Models
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventorydb';
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed data
const seedData = async () => {
  try {
    console.log('🌱 Starting to seed data...');

    // Clear existing data (optional - remove in production)
    await Category.deleteMany({});
    await Supplier.deleteMany({});
    await Inventory.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create default admin user if doesn't exist
    let adminUser = await User.findOne({ email: 'admin@inventory.com' });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      adminUser = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@inventory.com',
        phone: '+919876543210',
        address: '123 Admin Street, City',
        pincode: '123456',
        username: 'admin',
        password: hashedPassword
      });
      await adminUser.save();
      console.log('👤 Created admin user (email: admin@inventory.com, password: admin123)');
    }

    // Create categories
    const categories = [
      { name: 'Electronics', code: 'ELEC', description: 'Electronic components and devices' },
      { name: 'Raw Materials', code: 'RAW', description: 'Basic materials for production' },
      { name: 'Office Supplies', code: 'OFFICE', description: 'Office equipment and supplies' },
      { name: 'Machinery', code: 'MACH', description: 'Industrial machinery and equipment' },
      { name: 'Chemicals', code: 'CHEM', description: 'Chemical substances and compounds' },
      { name: 'Textiles', code: 'TEXT', description: 'Fabric and textile materials' },
      { name: 'Food & Beverages', code: 'F&B', description: 'Food items and beverages' },
      { name: 'Packaging', code: 'PACK', description: 'Packaging materials and containers' }
    ];

    const createdCategories = [];
    for (const categoryData of categories) {
      const category = new Category({ ...categoryData, createdBy: adminUser._id });
      await category.save();
      createdCategories.push(category);
    }
    console.log(`📦 Created ${createdCategories.length} categories`);

    // Create suppliers
    const suppliers = [
      {
        name: 'TechCorp Solutions',
        code: 'TECH001',
        contactPerson: 'John Smith',
        email: 'contact@techcorp.com',
        phone: '+919876543211',
        address: {
          street: '123 Tech Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          country: 'India'
        },
        paymentTerms: 'Net 30',
        leadTime: 7,
        rating: 4
      },
      {
        name: 'Industrial Materials Ltd',
        code: 'IND001',
        contactPerson: 'Sarah Johnson',
        email: 'sales@indmaterials.com',
        phone: '+919876543212',
        address: {
          street: '456 Industrial Park',
          city: 'Chennai',
          state: 'Tamil Nadu',
          zipCode: '600001',
          country: 'India'
        },
        paymentTerms: 'Net 45',
        leadTime: 14,
        rating: 5
      },
      {
        name: 'Global Suppliers Inc',
        code: 'GLOB001',
        contactPerson: 'Mike Chen',
        email: 'orders@globalsup.com',
        phone: '+919876543213',
        address: {
          street: '789 Global Street',
          city: 'Delhi',
          state: 'Delhi',
          zipCode: '110001',
          country: 'India'
        },
        paymentTerms: 'Net 15',
        leadTime: 5,
        rating: 4
      },
      {
        name: 'Chemical Works Private Ltd',
        code: 'CHEM001',
        contactPerson: 'Dr. Priya Sharma',
        email: 'info@chemworks.co.in',
        phone: '+919876543214',
        address: {
          street: '321 Chemical Complex',
          city: 'Pune',
          state: 'Maharashtra',
          zipCode: '411001',
          country: 'India'
        },
        paymentTerms: 'Net 60',
        leadTime: 21,
        rating: 5
      }
    ];

    const createdSuppliers = [];
    for (const supplierData of suppliers) {
      const supplier = new Supplier({ ...supplierData, createdBy: adminUser._id });
      await supplier.save();
      createdSuppliers.push(supplier);
    }
    console.log(`🏭 Created ${createdSuppliers.length} suppliers`);

    // Create sample inventory items
    const inventoryItems = [
      {
        sku: 'LAPTOP001',
        name: 'Dell Laptop Computer',
        description: 'High-performance business laptop',
        category: createdCategories.find(c => c.code === 'ELEC')._id,
        type: 'Finished Product',
        unit: 'piece',
        unitCost: 45000,
        sellingPrice: 55000,
        minThreshold: 5,
        maxThreshold: 50,
        qtyOnHand: 25,
        qtyReserved: 3,
        qtyOrdered: 10,
        location: {
          warehouse: 'Main Warehouse',
          aisle: 'A',
          shelf: '1'
        },
        supplier: createdSuppliers.find(s => s.code === 'TECH001')._id,
        isActive: true,
        isHazardous: false,
        tags: ['electronics', 'laptop', 'business'],
        leadTime: 7
      },
      {
        sku: 'STEEL001',
        name: 'Steel Rod 10mm',
        description: 'High-grade steel rods for construction',
        category: createdCategories.find(c => c.code === 'RAW')._id,
        type: 'Raw Material',
        unit: 'kg',
        unitCost: 45,
        sellingPrice: 55,
        minThreshold: 1000,
        maxThreshold: 10000,
        qtyOnHand: 500,
        qtyReserved: 100,
        qtyOrdered: 2000,
        location: {
          warehouse: 'Warehouse B',
          aisle: 'B',
          shelf: '3'
        },
        supplier: createdSuppliers.find(s => s.code === 'IND001')._id,
        isActive: true,
        isHazardous: false,
        tags: ['steel', 'construction', 'raw-material'],
        leadTime: 14
      },
      {
        sku: 'PAPER001',
        name: 'A4 Printing Paper',
        description: 'Premium quality A4 paper for office use',
        category: createdCategories.find(c => c.code === 'OFFICE')._id,
        type: 'Consumable',
        unit: 'ream',
        unitCost: 250,
        sellingPrice: 300,
        minThreshold: 20,
        maxThreshold: 200,
        qtyOnHand: 15,
        qtyReserved: 5,
        qtyOrdered: 50,
        location: {
          warehouse: 'Main Warehouse',
          aisle: 'C',
          shelf: '2'
        },
        supplier: createdSuppliers.find(s => s.code === 'GLOB001')._id,
        isActive: true,
        isHazardous: false,
        tags: ['paper', 'office', 'printing'],
        leadTime: 5
      },
      {
        sku: 'ACID001',
        name: 'Hydrochloric Acid',
        description: 'Industrial grade hydrochloric acid',
        category: createdCategories.find(c => c.code === 'CHEM')._id,
        type: 'Raw Material',
        unit: 'liter',
        unitCost: 150,
        sellingPrice: 200,
        minThreshold: 100,
        maxThreshold: 500,
        qtyOnHand: 250,
        qtyReserved: 50,
        qtyOrdered: 100,
        location: {
          warehouse: 'Chemical Storage',
          aisle: 'H',
          shelf: '1'
        },
        supplier: createdSuppliers.find(s => s.code === 'CHEM001')._id,
        isActive: true,
        isHazardous: true,
        hazardInfo: 'Corrosive chemical. Handle with protective equipment.',
        tags: ['chemical', 'acid', 'hazardous'],
        leadTime: 21
      },
      {
        sku: 'FABRIC001',
        name: 'Cotton Fabric Roll',
        description: 'High-quality cotton fabric for garments',
        category: createdCategories.find(c => c.code === 'TEXT')._id,
        type: 'Raw Material',
        unit: 'meter',
        unitCost: 120,
        sellingPrice: 150,
        minThreshold: 500,
        maxThreshold: 5000,
        qtyOnHand: 2500,
        qtyReserved: 200,
        qtyOrdered: 1000,
        location: {
          warehouse: 'Textile Storage',
          aisle: 'T',
          shelf: '1'
        },
        supplier: createdSuppliers.find(s => s.code === 'IND001')._id,
        isActive: true,
        isHazardous: false,
        tags: ['textile', 'cotton', 'fabric'],
        leadTime: 10
      },
      {
        sku: 'BOX001',
        name: 'Cardboard Boxes (Medium)',
        description: 'Medium-sized cardboard boxes for packaging',
        category: createdCategories.find(c => c.code === 'PACK')._id,
        type: 'Consumable',
        unit: 'piece',
        unitCost: 25,
        sellingPrice: 35,
        minThreshold: 100,
        maxThreshold: 1000,
        qtyOnHand: 75,
        qtyReserved: 25,
        qtyOrdered: 200,
        location: {
          warehouse: 'Main Warehouse',
          aisle: 'P',
          shelf: '1'
        },
        supplier: createdSuppliers.find(s => s.code === 'GLOB001')._id,
        isActive: true,
        isHazardous: false,
        tags: ['packaging', 'cardboard', 'boxes'],
        leadTime: 3
      }
    ];

    const createdInventory = [];
    for (const itemData of inventoryItems) {
      const item = new Inventory({ 
        ...itemData, 
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      });
      await item.save();
      createdInventory.push(item);
    }
    console.log(`📋 Created ${createdInventory.length} inventory items`);

    console.log('✅ Seed data creation completed!');
    console.log('\n📊 Summary:');
    console.log(`   - Categories: ${createdCategories.length}`);
    console.log(`   - Suppliers: ${createdSuppliers.length}`);
    console.log(`   - Inventory Items: ${createdInventory.length}`);
    console.log('\n👤 Admin Login Credentials:');
    console.log('   Email: admin@inventory.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run seed script
const runSeed = async () => {
  await connectDB();
  await seedData();
};

// Check if script is being run directly
if (require.main === module) {
  runSeed();
}

module.exports = { seedData, connectDB };
