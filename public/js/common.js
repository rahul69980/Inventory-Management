// Common JavaScript utilities and functions
class InventoryApp {
  constructor() {
    this.socket = io();
    this.init();
  }

  init() {
    this.setupSocketEvents();
    this.setupGlobalEventListeners();
    this.setupNotifications();
  }

  // Socket.IO setup for real-time updates
  setupSocketEvents() {
    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      this.socket.emit('join-room', 'inventory');
    });

    this.socket.on('inventory-updated', (data) => {
      this.handleInventoryUpdate(data);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
    });
  }

  // Handle real-time inventory updates
  handleInventoryUpdate(data) {
    const { type, item } = data;
    
    switch (type) {
      case 'created':
        this.showNotification('success', `New item "${item.name}" added to inventory`);
        break;
      case 'updated':
        this.showNotification('info', `Item "${item.name}" updated`);
        break;
      case 'deleted':
        this.showNotification('warning', `Item "${item.name}" removed from inventory`);
        break;
    }

    // Refresh current page data if needed
    if (typeof window.refreshData === 'function') {
      window.refreshData();
    }
  }

  // Setup global event listeners
  setupGlobalEventListeners() {
    // Handle all forms with loading states
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.tagName === 'FORM') {
        this.handleFormSubmit(form);
      }
    });

    // Handle escape key for modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    // Handle clicks outside modals
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal(e.target);
      }
    });
  }

  // Setup notification system
  setupNotifications() {
    if (!document.getElementById('notification-container')) {
      const container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      container.innerHTML = `
        <style>
          .notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
          }
          
          .notification {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(15px);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 0.5rem;
            border-left: 4px solid;
            color: white;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            animation: slideInRight 0.3s ease-out;
            position: relative;
            cursor: pointer;
          }
          
          .notification.success {
            border-left-color: #4facfe;
          }
          
          .notification.error {
            border-left-color: #fa709a;
          }
          
          .notification.warning {
            border-left-color: #fad961;
          }
          
          .notification.info {
            border-left-color: #667eea;
          }
          
          .notification .close-btn {
            position: absolute;
            top: 0.5rem;
            right: 0.8rem;
            background: none;
            border: none;
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s;
          }
          
          .notification .close-btn:hover {
            opacity: 1;
          }
          
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          
          @keyframes slideOutRight {
            to { transform: translateX(100%); opacity: 0; }
          }
        </style>
      `;
      document.body.appendChild(container);
    }
  }

  // Show notification
  showNotification(type, message, duration = 5000) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div>${message}</div>
      <button class="close-btn">&times;</button>
    `;

    const closeBtn = notification.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
      this.hideNotification(notification);
    });

    notification.addEventListener('click', () => {
      this.hideNotification(notification);
    });

    container.appendChild(notification);

    // Auto hide after duration
    setTimeout(() => {
      if (notification.parentElement) {
        this.hideNotification(notification);
      }
    }, duration);
  }

  // Hide notification
  hideNotification(notification) {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 300);
  }

  // Handle form submissions with loading states
  handleFormSubmit(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      submitBtn.textContent = 'Loading...';

      // Reset after 10 seconds as fallback
      setTimeout(() => {
        if (submitBtn.disabled) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('loading');
          submitBtn.textContent = originalText;
        }
      }, 10000);
    }
  }

  // API utility functions with HTTP-only detection
  getBaseUrl() {
    // Always use HTTP for current setup
    if (typeof window !== 'undefined') {
      return `http://${window.location.host}`;
    }
    // Fallback for server-side environments
    return 'http://localhost:3000';
  }

  async apiCall(endpoint, options = {}) {
    try {
      const baseUrl = this.getBaseUrl();
      const url = `${baseUrl}/api${endpoint}`;
      
      console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...options.headers
        },
        credentials: 'same-origin', // Important for session management
        ...options
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API call failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      this.showNotification('error', error.message);
      throw error;
    }
  }

  // Get inventory items
  async getInventory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return await this.apiCall(`/inventory?${queryString}`);
  }

  // Create inventory item
  async createInventoryItem(itemData) {
    return await this.apiCall('/inventory', {
      method: 'POST',
      body: JSON.stringify(itemData)
    });
  }

  // Update inventory item
  async updateInventoryItem(id, itemData) {
    return await this.apiCall(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData)
    });
  }

  // Delete inventory item
  async deleteInventoryItem(id) {
    return await this.apiCall(`/inventory/${id}`, {
      method: 'DELETE'
    });
  }

  // Get transactions
  async getTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return await this.apiCall(`/transactions?${queryString}`);
  }

  // Get alerts
  async getAlerts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return await this.apiCall(`/alerts?${queryString}`);
  }

  // Resolve alert
  async resolveAlert(alertId, resolution = {}) {
    return await this.apiCall(`/alerts/${alertId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify(resolution)
    });
  }

  // Get categories
  async getCategories() {
    return await this.apiCall('/categories');
  }

  // Get suppliers
  async getSuppliers() {
    return await this.apiCall('/suppliers');
  }

  // Get dashboard stats
  async getDashboardStats() {
    return await this.apiCall('/dashboard/stats');
  }

  // Modal functions
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      modal.style.animation = 'fadeIn 0.3s ease-out';
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal(modal) {
    if (typeof modal === 'string') {
      modal = document.getElementById(modal);
    }
    if (modal) {
      modal.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
      }, 300);
    }
  }

  closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => this.closeModal(modal));
  }

  // Utility functions
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  formatDate(date) {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  formatNumber(number) {
    return new Intl.NumberFormat('en-IN').format(number);
  }

  // Status badge helper
  getStatusBadge(status, quantity, minThreshold) {
    if (quantity === 0) {
      return '<span class="badge badge-danger">Out of Stock</span>';
    } else if (quantity <= minThreshold) {
      return '<span class="badge badge-warning">Low Stock</span>';
    } else {
      return '<span class="badge badge-success">In Stock</span>';
    }
  }

  // Debounce function for search
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Local storage helpers
  setLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  getLocalStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  }

  // Form validation helpers
  validateForm(form) {
    const errors = [];
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    
    inputs.forEach(input => {
      if (!input.value.trim()) {
        errors.push(`${input.name || input.id} is required`);
        input.classList.add('error');
      } else {
        input.classList.remove('error');
      }
    });

    // Email validation
    const emailInputs = form.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
      if (input.value && !this.isValidEmail(input.value)) {
        errors.push('Please enter a valid email address');
        input.classList.add('error');
      }
    });

    // Number validation
    const numberInputs = form.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
      if (input.value && isNaN(input.value)) {
        errors.push(`${input.name || input.id} must be a valid number`);
        input.classList.add('error');
      }
    });

    return errors;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Animation helpers
  animateNumber(element, start, end, duration = 1000) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = Math.floor(progress * (end - start) + start);
      element.textContent = this.formatNumber(current);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }

  // Error handling
  handleError(error, context = '') {
    console.error(`Error ${context}:`, error);
    this.showNotification('error', error.message || 'An unexpected error occurred');
  }
}

// Initialize the app
const app = new InventoryApp();

// Make app globally available
window.app = app;

// Export for modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InventoryApp;
}
