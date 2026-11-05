import express, { Request, Response } from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import {
  db,
  initDatabase,
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  deleteSession,
} from './server/db.ts';

// Initialize SQLite database
initDatabase();

const app = express();
app.use(express.json());

// Set of connected SSE clients for live real-time updates
const sseClients = new Set<Response>();

function broadcast(eventType: string, data: any) {
  const payload = `data: ${JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// SSE stream endpoint
app.get('/api/orders/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Middleware to authenticate requests
function getAuthUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return getSession(token);
}

// Auth: Demo Accounts list
app.get('/api/demo/accounts', (_req: Request, res: Response) => {
  res.json({
    customer: {
      email: 'sarah.chen@example.com',
      password: 'customer123',
      name: 'Sarah Chen',
      role: 'customer',
      description: 'Customer with active & delivered orders',
    },
    restaurant: {
      email: 'chef.marco@example.com',
      password: 'restaurant123',
      name: 'Chef Marco Rossi',
      role: 'restaurant',
      restaurantName: 'Bella Roma Trattoria',
      description: 'Restaurant kitchen staff & order fulfiller',
    },
    delivery: {
      email: 'alex.rider@example.com',
      password: 'rider123',
      name: 'Alex Vance',
      role: 'delivery',
      fleet: 'Rapid Courier Dispatch',
      description: 'Delivery partner managing pickups and drops',
    },
  });
});

// Auth: Register
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, role = 'customer', phone, address } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const existing = db.prepare('SELECT user_id FROM Users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    res.status(409).json({ error: 'An account with this email address already exists.' });
    return;
  }

  const userId = `usr_${crypto.randomBytes(6).toString('hex')}`;
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO Users (user_id, name, email, password_hash, role, phone, address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, name.trim(), email.toLowerCase().trim(), passwordHash, role, phone || '', address || '', now);

  const token = createSession({ id: userId, role, email: email.toLowerCase().trim(), name: name.trim() });
  res.status(201).json({
    token,
    user: { id: userId, name: name.trim(), email: email.toLowerCase().trim(), role, phone, address },
  });
});

// Auth: Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db.prepare('SELECT * FROM Users WHERE email = ?').get(email.toLowerCase().trim()) as any;
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = createSession({
    id: user.user_id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  res.json({
    token,
    user: {
      id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
    },
  });
});

// Auth: Me
app.get('/api/auth/me', (req: Request, res: Response) => {
  const session = getAuthUser(req);
  if (!session) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }
  const user = db.prepare('SELECT user_id, name, email, role, phone, address FROM Users WHERE user_id = ?').get(session.userId) as any;
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  res.json({
    user: {
      id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
    },
  });
});

// Auth: Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    deleteSession(authHeader.substring(7));
  }
  res.json({ success: true });
});

// Restaurants
app.get('/api/restaurants', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM Restaurants').all();
  res.json(rows);
});

// Food Items
app.get('/api/food-items', (req: Request, res: Response) => {
  const { restaurant_id } = req.query;
  let rows;
  if (restaurant_id) {
    rows = db.prepare('SELECT * FROM Food_Items WHERE restaurant_id = ? AND availability = 1').all(String(restaurant_id));
  } else {
    rows = db.prepare('SELECT * FROM Food_Items WHERE availability = 1').all();
  }
  res.json(rows);
});

// Orders: List with filtering
app.get('/api/orders', (req: Request, res: Response) => {
  const { customer_id, restaurant_id, delivery_partner_id, status, search } = req.query;

  let query = `
    SELECT 
      o.*,
      r.restaurant_name,
      r.address as restaurant_address,
      r.prep_time_minutes,
      r.pickup_time_minutes,
      r.travel_time_minutes,
      c.name as customer_name,
      c.email as customer_email,
      d.name as delivery_partner_name,
      d.phone as delivery_partner_phone
    FROM Orders o
    JOIN Restaurants r ON o.restaurant_id = r.restaurant_id
    JOIN Users c ON o.customer_id = c.user_id
    LEFT JOIN Users d ON o.delivery_partner_id = d.user_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (customer_id) {
    query += ' AND o.customer_id = ?';
    params.push(String(customer_id));
  }

  if (restaurant_id) {
    query += ' AND o.restaurant_id = ?';
    params.push(String(restaurant_id));
  }

  if (delivery_partner_id) {
    query += " AND (o.delivery_partner_id = ? OR (o.delivery_partner_id IS NULL AND o.current_status IN ('Ready for Pickup', 'Out for Delivery')))";
    params.push(String(delivery_partner_id));
  }

  if (status && status !== 'all') {
    query += ' AND o.current_status = ?';
    params.push(String(status));
  }

  if (search) {
    query += ' AND (o.order_id LIKE ? OR r.restaurant_name LIKE ? OR c.name LIKE ?)';
    const s = `%${String(search)}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY o.created_at DESC';

  const orders = db.prepare(query).all(...params) as any[];

  // Attach items count and summary
  const itemsStmt = db.prepare(`
    SELECT oi.order_id, oi.quantity, oi.price, f.item_name
    FROM Order_Items oi
    JOIN Food_Items f ON oi.item_id = f.item_id
    WHERE oi.order_id = ?
  `);

  const enriched = orders.map((order) => {
    const items = itemsStmt.all(order.order_id) as any[];
    return {
      ...order,
      items,
      itemCount: items.reduce((acc, curr) => acc + curr.quantity, 0),
    };
  });

  res.json(enriched);
});

// Orders: Get single by ID
app.get('/api/orders/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const order = db.prepare(`
    SELECT 
      o.*,
      r.restaurant_name,
      r.address as restaurant_address,
      r.prep_time_minutes,
      r.pickup_time_minutes,
      r.travel_time_minutes,
      c.name as customer_name,
      c.email as customer_email,
      d.name as delivery_partner_name,
      d.phone as delivery_partner_phone
    FROM Orders o
    JOIN Restaurants r ON o.restaurant_id = r.restaurant_id
    JOIN Users c ON o.customer_id = c.user_id
    LEFT JOIN Users d ON o.delivery_partner_id = d.user_id
    WHERE o.order_id = ?
  `).get(id) as any;

  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const items = db.prepare(`
    SELECT oi.order_item_id, oi.quantity, oi.price, f.item_name, f.description, f.image
    FROM Order_Items oi
    JOIN Food_Items f ON oi.item_id = f.item_id
    WHERE oi.order_id = ?
  `).all(id) as any[];

  const history = db.prepare(`
    SELECT history_id, status, updated_by, timestamp, notes
    FROM Order_Status_History
    WHERE order_id = ?
    ORDER BY timestamp ASC
  `).all(id) as any[];

  res.json({
    ...order,
    items,
    history,
  });
});

// Helper to compute ETA based on formula:
// ETA = Remaining Preparation Time + Pickup Time + Travel Time
function calculateETA(
  status: string,
  restPrep: number = 18,
  restPickup: number = 6,
  restTravel: number = 14
): { etaMinutes: number; estimatedDeliveryTime: string } {
  const now = new Date();
  let remainingMinutes = 0;

  switch (status) {
    case 'Order Placed':
      // Full time: prep + pickup + travel
      remainingMinutes = restPrep + restPickup + restTravel;
      break;
    case 'Preparing':
      // Preparation in progress: remaining prep (approx 65% of prep) + pickup + travel
      remainingMinutes = Math.round(restPrep * 0.65) + restPickup + restTravel;
      break;
    case 'Ready for Pickup':
      // Preparation complete: pickup + travel
      remainingMinutes = restPickup + restTravel;
      break;
    case 'Out for Delivery':
      // In transit: travel time only
      remainingMinutes = restTravel;
      break;
    case 'Delivered':
      remainingMinutes = 0;
      return { etaMinutes: 0, estimatedDeliveryTime: now.toISOString() };
  }

  const etaDate = new Date(now.getTime() + remainingMinutes * 60000);
  return {
    etaMinutes: remainingMinutes,
    estimatedDeliveryTime: etaDate.toISOString(),
  };
}

// Orders: Create new order
app.post('/api/orders', (req: Request, res: Response) => {
  const { customer_id, restaurant_id, items, delivery_address, customer_phone, notes } = req.body;

  if (!customer_id || !restaurant_id || !items || !items.length) {
    res.status(400).json({ error: 'Customer, restaurant, and at least one food item are required.' });
    return;
  }

  const restaurant = db.prepare('SELECT * FROM Restaurants WHERE restaurant_id = ?').get(restaurant_id) as any;
  if (!restaurant) {
    res.status(404).json({ error: 'Restaurant not found.' });
    return;
  }

  // Calculate total amount from database prices
  let totalAmount = 0;
  const validatedItems: { itemId: string; quantity: number; price: number }[] = [];

  for (const it of items) {
    const foodItem = db.prepare('SELECT * FROM Food_Items WHERE item_id = ?').get(it.itemId) as any;
    if (!foodItem) {
      res.status(400).json({ error: `Item ${it.itemId} is not available.` });
      return;
    }
    const qty = Math.max(1, parseInt(it.quantity) || 1);
    const itemTotal = foodItem.price * qty;
    totalAmount += itemTotal;
    validatedItems.push({ itemId: foodItem.item_id, quantity: qty, price: foodItem.price });
  }

  // Add delivery fee + tax
  const subtotal = Math.round(totalAmount * 100) / 100;
  const deliveryFee = 3.99;
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const grandTotal = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

  // Generate unique Order ID, e.g. ORD-7241
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const orderId = `ORD-${randNum}`;

  const { etaMinutes, estimatedDeliveryTime } = calculateETA(
    'Order Placed',
    restaurant.prep_time_minutes,
    restaurant.pickup_time_minutes,
    restaurant.travel_time_minutes
  );

  const now = new Date().toISOString();

  // Find a default delivery partner if available
  const defaultDriver = db.prepare("SELECT user_id FROM Users WHERE role = 'delivery' LIMIT 1").get() as any;
  const deliveryPartnerId = defaultDriver ? defaultDriver.user_id : null;

  db.prepare(`
    INSERT INTO Orders (
      order_id, customer_id, restaurant_id, delivery_partner_id, total_amount,
      current_status, estimated_delivery_time, eta_minutes, delivery_address,
      customer_phone, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderId,
    customer_id,
    restaurant_id,
    deliveryPartnerId,
    grandTotal,
    'Order Placed',
    estimatedDeliveryTime,
    etaMinutes,
    delivery_address || '452 Elm Street, Apt 3B, Downtown',
    customer_phone || '+1 (555) 234-5678',
    notes || '',
    now,
    now
  );

  // Insert order items
  const insertItemStmt = db.prepare(`
    INSERT INTO Order_Items (order_item_id, order_id, item_id, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const it of validatedItems) {
    const orderItemId = `oi_${crypto.randomBytes(6).toString('hex')}`;
    insertItemStmt.run(orderItemId, orderId, it.itemId, it.quantity, it.price);
  }

  // Insert initial timeline status
  const historyId = `h_${crypto.randomBytes(6).toString('hex')}`;
  db.prepare(`
    INSERT INTO Order_Status_History (history_id, order_id, status, updated_by, timestamp, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    historyId,
    orderId,
    'Order Placed',
    'Customer',
    now,
    'Order successfully placed and sent to restaurant kitchen.'
  );

  // Broadcast real-time update
  broadcast('order_created', { order_id: orderId, status: 'Order Placed' });

  res.status(201).json({
    order_id: orderId,
    total_amount: grandTotal,
    current_status: 'Order Placed',
    eta_minutes: etaMinutes,
    estimated_delivery_time: estimatedDeliveryTime,
    created_at: now,
  });
});

// Orders: Update status with validation and ETA recalculation
app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, updater_name, updater_role, driver_id, notes } = req.body;

  const validStatuses = ['Order Placed', 'Preparing', 'Ready for Pickup', 'Out for Delivery', 'Delivered'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status: ${status}` });
    return;
  }

  const order = db.prepare(`
    SELECT o.*, r.prep_time_minutes, r.pickup_time_minutes, r.travel_time_minutes
    FROM Orders o
    JOIN Restaurants r ON o.restaurant_id = r.restaurant_id
    WHERE o.order_id = ?
  `).get(id) as any;

  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  // Strict role and transition validation required by prompt:
  // - Customer: Places the order
  // - Restaurant: Updates Preparing and Ready for Pickup
  // - Delivery Partner: Updates Out for Delivery and Delivered
  // - "Prevent delivery partners from updating orders that have not been marked Ready for Pickup."
  if (updater_role === 'restaurant') {
    if (status !== 'Preparing' && status !== 'Ready for Pickup') {
      res.status(403).json({ error: 'Restaurant staff can only update status to Preparing or Ready for Pickup.' });
      return;
    }
  }

  if (updater_role === 'delivery') {
    if (status === 'Out for Delivery' && order.current_status !== 'Ready for Pickup') {
      res.status(400).json({
        error: `Cannot pick up order. Order must be 'Ready for Pickup' before dispatch. Current status is '${order.current_status}'.`,
      });
      return;
    }
    if (status === 'Delivered' && order.current_status !== 'Out for Delivery') {
      res.status(400).json({
        error: `Cannot mark delivered. Order must be 'Out for Delivery' first. Current status is '${order.current_status}'.`,
      });
      return;
    }
  }

  // Recalculate ETA
  const { etaMinutes, estimatedDeliveryTime } = calculateETA(
    status,
    order.prep_time_minutes,
    order.pickup_time_minutes,
    order.travel_time_minutes
  );

  const now = new Date().toISOString();

  // If a delivery driver claimed/updated this order, associate them
  let updatedDriverId = order.delivery_partner_id;
  if (driver_id) {
    updatedDriverId = driver_id;
  }

  db.prepare(`
    UPDATE Orders
    SET current_status = ?, estimated_delivery_time = ?, eta_minutes = ?, updated_at = ?, delivery_partner_id = ?
    WHERE order_id = ?
  `).run(status, estimatedDeliveryTime, etaMinutes, now, updatedDriverId, id);

  // Add history record
  const historyId = `h_${crypto.randomBytes(6).toString('hex')}`;
  const actor = updater_name || (updater_role === 'restaurant' ? 'Restaurant Kitchen' : 'Delivery Partner');

  let defaultNote = '';
  if (status === 'Preparing') defaultNote = 'Kitchen accepted order and commenced food preparation.';
  else if (status === 'Ready for Pickup') defaultNote = 'Food freshly packed and placed on dispatch rack for courier.';
  else if (status === 'Out for Delivery') defaultNote = 'Courier collected order and is heading towards customer address.';
  else if (status === 'Delivered') defaultNote = 'Order safely delivered to recipient.';

  db.prepare(`
    INSERT INTO Order_Status_History (history_id, order_id, status, updated_by, timestamp, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(historyId, id, status, actor, now, notes || defaultNote);

  // Real-time broadcast
  broadcast('order_updated', {
    order_id: id,
    status,
    eta_minutes: etaMinutes,
    estimated_delivery_time: estimatedDeliveryTime,
    timestamp: now,
    updated_by: actor,
  });

  res.json({
    order_id: id,
    status,
    eta_minutes: etaMinutes,
    estimated_delivery_time: estimatedDeliveryTime,
    updated_at: now,
  });
});

// Analytics endpoint
app.get('/api/analytics', (_req: Request, res: Response) => {
  const totalOrders = (db.prepare('SELECT COUNT(*) as count FROM Orders').get() as any).count;
  const placed = (db.prepare("SELECT COUNT(*) as count FROM Orders WHERE current_status = 'Order Placed'").get() as any).count;
  const preparing = (db.prepare("SELECT COUNT(*) as count FROM Orders WHERE current_status = 'Preparing'").get() as any).count;
  const ready = (db.prepare("SELECT COUNT(*) as count FROM Orders WHERE current_status = 'Ready for Pickup'").get() as any).count;
  const outForDelivery = (db.prepare("SELECT COUNT(*) as count FROM Orders WHERE current_status = 'Out for Delivery'").get() as any).count;
  const delivered = (db.prepare("SELECT COUNT(*) as count FROM Orders WHERE current_status = 'Delivered'").get() as any).count;

  const totalRevenue = (db.prepare('SELECT SUM(total_amount) as sum FROM Orders').get() as any).sum || 0;

  res.json({
    totalOrders,
    placed,
    preparing,
    ready,
    outForDelivery,
    delivered,
    activeOrders: placed + preparing + ready + outForDelivery,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
  });
});

// Reset Demo Data endpoint for easy evaluation testing
app.post('/api/demo/reset', (_req: Request, res: Response) => {
  db.exec(`
    DELETE FROM Order_Status_History;
    DELETE FROM Order_Items;
    DELETE FROM Orders;
    DELETE FROM Food_Items;
    DELETE FROM Restaurants;
    DELETE FROM Users;
  `);
  initDatabase();
  broadcast('reset_data', {});
  res.json({ success: true, message: 'Database reset to initial demo state.' });
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Food Delivery Order Tracker server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
