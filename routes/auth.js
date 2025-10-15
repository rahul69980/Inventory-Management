const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Show login form
router.get('/login', (req, res) => {
  const successMessage = req.query.success || null;
  res.render('login', { success: successMessage });
});

// Handle login POST
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', { error: 'Invalid email or password.' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render('login', { error: 'Invalid email or password.' });
    }
    // Success: set session and redirect to home
    req.session.user = {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username
    };
    res.redirect('/home');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'An error occurred. Please try again.' });
  }
});

// Show signup form
router.get('/signup', (req, res) => {
  res.render('signup_updated');
});

// Handle signup POST
router.post('/signup', async (req, res) => {
  try {
    const { firstName, middleName, lastName, email, phone, address, pincode, username, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.render('signup_updated', { 
        error: 'User with this email or username already exists.',
        formData: req.body
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      middleName: middleName || '', // Handle optional field
      lastName,
      email,
      phone,
      address,
      pincode,
      username,
      password: hashedPassword
    });
    
    await user.save();
    console.log('✅ New user registered:', email);
    res.redirect('/auth/login?success=Registration successful! Please login.');
  } catch (err) {
    console.error('❌ Signup error:', err);
    let errorMessage = 'Registration failed. Please try again.';
    
    if (err.code === 11000) {
      errorMessage = 'User with this email or username already exists.';
    }
    
    res.render('signup_updated', { 
      error: errorMessage,
      formData: req.body
    });
  }
});

module.exports = router;