// e2e/fixtures/data.js — deterministic fixtures mirroring the real
// backend response shapes (see backend inventory: admin/product/order/
// inventory/homepage modules). Envelope = {success, message, data, meta}.
const ADMIN_USER = { id: 'a1', name: 'Test Admin', email: 'admin@advika.test', role: 'admin' };

const PRODUCT_1 = {
  id: '507f1f77bcf86cd799439011',
  name: 'Advika LED Fog Lamp 72W',
  category: ['Lights'],
  brand: 'Advika',
  price: 2499,
  stock: 25,
  images: ['/admin-logo.png'],
  description: 'High-output 72W LED fog lamp.',
  voltage: '24V',
  isNewArrival: false,
  isBestSeller: true,
  createdAt: new Date().toISOString(),
};

const PRODUCT_LOW_STOCK = {
  id: '507f1f77bcf86cd799439013',
  name: 'Advika 12V Wiring Harness',
  category: ['Electrical & Wiring'],
  brand: 'Advika',
  price: 899,
  stock: 2,
  images: [],
  description: 'Complete 12V wiring harness kit.',
  voltage: '12V',
  createdAt: new Date().toISOString(),
};

const PRODUCTS = [PRODUCT_1, PRODUCT_LOW_STOCK];

const ORDER_1 = {
  id: '807f1f77bcf86cd799439021',
  userId: '607f1f77bcf86cd799439099',
  status: 'confirmed',
  paymentStatus: 'paid',
  total: 2499,
  subtotal: 2499,
  deliveryCharge: 0,
  addressId: '707f1f77bcf86cd799439001',
  orderItems: [{ productId: PRODUCT_1.id, quantity: 1, price: PRODUCT_1.price, product: PRODUCT_1 }],
  createdAt: new Date().toISOString(),
};

const CUSTOMER_1 = {
  id: '607f1f77bcf86cd799439099',
  name: 'Test Customer',
  email: 'customer@example.test',
  phone: '+919876543210',
  role: 'customer',
  createdAt: new Date().toISOString(),
};

function envelope(data, meta = {}) {
  return { success: true, message: 'ok', data, meta: { timestamp: new Date().toISOString(), ...meta } };
}
function errorEnvelope(message, errors = null) {
  return { success: false, message, errors };
}

module.exports = {
  ADMIN_USER,
  PRODUCT_1,
  PRODUCT_LOW_STOCK,
  PRODUCTS,
  ORDER_1,
  CUSTOMER_1,
  envelope,
  errorEnvelope,
};
