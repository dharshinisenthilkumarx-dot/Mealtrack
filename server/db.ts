import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = path.resolve(process.cwd(), 'orders.db');
export const db = new DatabaseSync(DB_PATH);

// Helper for secure password hashing with salt and PBKDF2 / scrypt
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

// Generate simple secure session tokens
const SESSIONS = new Map<string, { userId: string; role: string; email: string; name: string }>();

export function createSession(user: { id: string; role: string; email: string; name: string }): string {
  const token = crypto.randomBytes(32).toString('hex');
  SESSIONS.set(token, { userId: user.id, role: user.role, email: user.email, name: user.name });
  return token;
}

export function getSession(token: string) {
  return SESSIONS.get(token) || null;
}

export function deleteSession(token: string) {
  SESSIONS.delete(token);
}

// Initialize tables
export function initDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS Users (
      user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('customer', 'restaurant', 'delivery')),
      phone TEXT,
      address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Restaurants (
      restaurant_id TEXT PRIMARY KEY,
      restaurant_name TEXT NOT NULL,
      address TEXT NOT NULL,
      cuisine TEXT NOT NULL,
      rating REAL DEFAULT 4.8,
      prep_time_minutes INTEGER DEFAULT 18,
      pickup_time_minutes INTEGER DEFAULT 6,
      travel_time_minutes INTEGER DEFAULT 14,
      image TEXT NOT NULL,
      tagline TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Food_Items (
      item_id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES Restaurants(restaurant_id),
      item_name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      image TEXT NOT NULL,
      availability INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS Orders (
      order_id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES Users(user_id),
      restaurant_id TEXT NOT NULL REFERENCES Restaurants(restaurant_id),
      delivery_partner_id TEXT REFERENCES Users(user_id),
      total_amount REAL NOT NULL,
      current_status TEXT NOT NULL CHECK(current_status IN ('Order Placed', 'Preparing', 'Ready for Pickup', 'Out for Delivery', 'Delivered')),
      estimated_delivery_time TEXT NOT NULL,
      eta_minutes INTEGER NOT NULL,
      delivery_address TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Order_Items (
      order_item_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES Orders(order_id) ON DELETE CASCADE,
      item_id TEXT NOT NULL REFERENCES Food_Items(item_id),
      quantity INTEGER NOT NULL,
      price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Order_Status_History (
      history_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES Orders(order_id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      notes TEXT
    );
  `);

  // Check if seeded
  const userCountRow = db.prepare('SELECT COUNT(*) as count FROM Users').get() as { count: number };
  if (userCountRow.count === 0) {
    seedInitialData();
  }
}

function seedInitialData() {
  const insertUser = db.prepare(`
    INSERT INTO Users (user_id, name, email, password_hash, role, phone, address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const dateStr = (offsetMinutes = 0) => new Date(now.getTime() - offsetMinutes * 60000).toISOString();

  // Users: Customer, Restaurant Manager, Delivery Driver
  const customerPassword = hashPassword('customer123');
  const restaurantPassword = hashPassword('restaurant123');
  const deliveryPassword = hashPassword('rider123');

  insertUser.run(
    'usr_cust_1',
    'Sarah Chen',
    'sarah.chen@example.com',
    customerPassword,
    'customer',
    '+1 (555) 234-5678',
    '452 Elm Street, Apt 3B, Downtown',
    dateStr(120)
  );

  insertUser.run(
    'usr_cust_2',
    'David Miller',
    'david.miller@example.com',
    customerPassword,
    'customer',
    '+1 (555) 345-6789',
    '810 Pine Boulevard, Suite 12, Midtown',
    dateStr(240)
  );

  insertUser.run(
    'usr_rest_1',
    'Marco Rossi (Head Chef)',
    'chef.marco@example.com',
    restaurantPassword,
    'restaurant',
    '+1 (555) 987-6543',
    '78 Artisan Way, Little Italy',
    dateStr(300)
  );

  insertUser.run(
    'usr_rest_2',
    'Liam Vance (Bistro Kitchen)',
    'liam.vance@example.com',
    restaurantPassword,
    'restaurant',
    '+1 (555) 765-4321',
    '142 Gourmet Ave, Downtown',
    dateStr(300)
  );

  insertUser.run(
    'usr_del_1',
    'Alex Vance (Rapid Rider)',
    'alex.rider@example.com',
    deliveryPassword,
    'delivery',
    '+1 (555) 432-1098',
    'Express Dispatch Center #4',
    dateStr(300)
  );

  insertUser.run(
    'usr_del_2',
    'Maya Lin (Eco Fleet)',
    'maya.rider@example.com',
    deliveryPassword,
    'delivery',
    '+1 (555) 543-2109',
    'Express Dispatch Center #2',
    dateStr(300)
  );

  // Restaurants
  const insertRestaurant = db.prepare(`
    INSERT INTO Restaurants (restaurant_id, restaurant_name, address, cuisine, rating, prep_time_minutes, pickup_time_minutes, travel_time_minutes, image, tagline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRestaurant.run(
    'rest_1',
    'The Burger Bistro',
    '142 Gourmet Ave, Downtown',
    'Handcrafted Burgers & Fries',
    4.9,
    15,
    5,
    12,
    '/src/assets/images/burger_artisan_deluxe_1793862712575.jpg',
    'Prime Angus smashed beef, toasted potato buns, and house secret truffle sauces'
  );

  insertRestaurant.run(
    'rest_2',
    'Bella Roma Trattoria',
    '78 Artisan Way, Little Italy',
    'Wood-Fired Neapolitan Pizza & Pasta',
    4.8,
    20,
    6,
    15,
    '/src/assets/images/pizza_margherita_woodfired_1793862713896.jpg',
    'Authentic stone oven pizzas with San Marzano tomatoes and imported fresh burrata'
  );

  insertRestaurant.run(
    'rest_3',
    'Tokyo Ramen & Sushi Co.',
    '204 Sakura St, Midtown',
    'Authentic Japanese Ramen & Handrolls',
    4.9,
    18,
    5,
    10,
    '/src/assets/images/ramen_tonkotsu_bowl_1793862713363.jpg',
    'Slow-simmered 24-hour tonkotsu broth, handcrafted noodles, and premium sashimi'
  );

  // Food Items (18 items total, 6 per restaurant)
  const insertItem = db.prepare(`
    INSERT INTO Food_Items (item_id, restaurant_id, item_name, description, price, category, image, availability)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Restaurant 1: Burgers
  insertItem.run(
    'item_101',
    'rest_1',
    'Double Bacon Smash Burger',
    'Two 4oz Angus beef patties, thick-cut smoked bacon, aged cheddar, caramelized shallots, garlic aioli.',
    16.99,
    'Burgers',
    '/src/assets/images/burger_artisan_deluxe_1793862712575.jpg',
    1
  );
  insertItem.run(
    'item_102',
    'rest_1',
    'Truffle Mushroom Swiss Burger',
    'Seared Angus beef, wild sautéed cremini mushrooms, melted Swiss gruyère, black truffle mayo.',
    17.50,
    'Burgers',
    '/src/assets/images/burger_artisan_deluxe_1793862712575.jpg',
    1
  );
  insertItem.run(
    'item_103',
    'rest_1',
    'Spicy Crispy Buttermilk Chicken',
    'Nashville hot dipped fried chicken thigh, sweet bread-and-butter pickles, creamy coleslaw on brioche.',
    15.50,
    'Chicken',
    '/src/assets/images/burger_artisan_deluxe_1793862712575.jpg',
    1
  );
  insertItem.run(
    'item_104',
    'rest_1',
    'Rosemary Parmesan Truffle Fries',
    'Hand-cut Idaho russet potatoes tossed with fresh chopped rosemary, Parmigiano-Reggiano, truffle oil.',
    7.99,
    'Sides',
    '/src/assets/images/food_delivery_hero_1793862712129.jpg',
    1
  );
  insertItem.run(
    'item_105',
    'rest_1',
    'Smoked Gouda Mac & Cheese Bites',
    'Crispy panko-breaded sharp smoked cheddar and gouda macaroni bites with house chipotle ranch.',
    8.50,
    'Sides',
    '/src/assets/images/food_delivery_hero_1793862712129.jpg',
    1
  );
  insertItem.run(
    'item_106',
    'rest_1',
    'Craft Salted Caramel Milkshake',
    'Rich vanilla bean custard blended with sea salt caramel drizzle and whipped cream.',
    6.50,
    'Beverages',
    '/src/assets/images/food_delivery_hero_1793862712129.jpg',
    1
  );

  // Restaurant 2: Bella Roma
  insertItem.run(
    'item_201',
    'rest_2',
    'Classic Margherita D.O.P.',
    'San Marzano tomato sauce, fresh buffalo mozzarella, fresh basil, extra virgin olive oil.',
    18.00,
    'Pizzas',
    '/src/assets/images/pizza_margherita_woodfired_1793862713896.jpg',
    1
  );
  insertItem.run(
    'item_202',
    'rest_2',
    'Diavola Spicy Soppressata',
    'Spicy Calabrian soppressata, chili-infused hot honey, fior di latte mozzarella, crushed chili.',
    20.50,
    'Pizzas',
    '/src/assets/images/pizza_margherita_woodfired_1793862713896.jpg',
    1
  );
  insertItem.run(
    'item_203',
    'rest_2',
    'Prosciutto e Funghi',
    'Thinly sliced 24-month Prosciutto di Parma, roasted wild mushrooms, thyme, fresh mozzarella.',
    21.00,
    'Pizzas',
    '/src/assets/images/pizza_margherita_woodfired_1793862713896.jpg',
    1
  );
  insertItem.run(
    'item_204',
    'rest_2',
    'Handmade Truffle Tagliatelle',
    'Fresh ribbon egg pasta, cultured Normandy butter, shaved summer truffles, Parmigiano wheel.',
    22.50,
    'Pasta',
    '/src/assets/images/pizza_margherita_woodfired_1793862713896.jpg',
    1
  );
  insertItem.run(
    'item_205',
    'rest_2',
    'Burrata Caprese Rustica',
    'Whole creamy pugliese burrata, heirloom cherry tomatoes, aged Modena balsamic glaze.',
    14.00,
    'Appetizers',
    '/src/assets/images/pizza_margherita_woodfired_1793862713896.jpg',
    1
  );
  insertItem.run(
    'item_206',
    'rest_2',
    'Espresso Mascarpone Tiramisu',
    'Traditional savoiardi ladyfingers soaked in dark espresso and marsala, rich mascarpone cream.',
    8.99,
    'Desserts',
    '/src/assets/images/pizza_margherita_woodfired_1793862713896.jpg',
    1
  );

  // Restaurant 3: Tokyo Ramen & Sushi
  insertItem.run(
    'item_301',
    'rest_3',
    'Signature Tonkotsu Ramen',
    '24-hour rich pork bone broth, braised chashu pork belly, marinated ajitsuke egg, nori, scallions.',
    17.50,
    'Ramen',
    '/src/assets/images/ramen_tonkotsu_bowl_1793862713363.jpg',
    1
  );
  insertItem.run(
    'item_302',
    'rest_3',
    'Spicy Miso Ramen with Wagyu Mince',
    'Hokkaido red miso broth, spiced spicy wagyu beef crumble, charred corn, sesame, black garlic oil.',
    19.00,
    'Ramen',
    '/src/assets/images/ramen_tonkotsu_bowl_1793862713363.jpg',
    1
  );
  insertItem.run(
    'item_303',
    'rest_3',
    'Spicy Salmon Crunch Roll (8 pcs)',
    'Fresh Atlantic salmon, cucumber, sriracha aioli, topped with tempura crisps and tobiko.',
    15.00,
    'Sushi',
    '/src/assets/images/food_delivery_hero_1793862712129.jpg',
    1
  );
  insertItem.run(
    'item_304',
    'rest_3',
    'Dragon Eel Avocado Roll (8 pcs)',
    'BBQ freshwater unagi eel, crisp cucumber inside, layered avocado on top with sweet kabayaki tare.',
    16.50,
    'Sushi',
    '/src/assets/images/food_delivery_hero_1793862712129.jpg',
    1
  );
  insertItem.run(
    'item_305',
    'rest_3',
    'Pan-Seared Pork Gyoza (6 pcs)',
    'Handmade Japanese dumplings with minced kurobuta pork, cabbage, ginger, scallion ponzu dip.',
    8.50,
    'Appetizers',
    '/src/assets/images/food_delivery_hero_1793862712129.jpg',
    1
  );
  insertItem.run(
    'item_306',
    'rest_3',
    'Iced Matcha Yuzu Green Tea',
    'Ceremonial grade Uji green matcha shaken with cold Japanese yuzu citrus and light honey.',
    5.50,
    'Beverages',
    '/src/assets/images/food_delivery_hero_1793862712129.jpg',
    1
  );

  // Orders: Seed sample realistic orders in different statuses for immediate testability!
  const insertOrder = db.prepare(`
    INSERT INTO Orders (
      order_id, customer_id, restaurant_id, delivery_partner_id, total_amount,
      current_status, estimated_delivery_time, eta_minutes, delivery_address,
      customer_phone, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO Order_Items (order_item_id, order_id, item_id, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO Order_Status_History (history_id, order_id, status, updated_by, timestamp, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Order 1: Status = "Preparing" (Tokyo Ramen)
  const ord1CreatedAt = dateStr(15);
  const ord1UpdatedAt = dateStr(5);
  const ord1EtaDate = new Date(now.getTime() + 18 * 60000).toISOString();
  insertOrder.run(
    'ORD-8491',
    'usr_cust_1',
    'rest_3',
    'usr_del_1',
    41.50,
    'Preparing',
    ord1EtaDate,
    18,
    '452 Elm Street, Apt 3B, Downtown',
    '+1 (555) 234-5678',
    'Please pack chili oil on the side.',
    ord1CreatedAt,
    ord1UpdatedAt
  );
  insertOrderItem.run('oi_1', 'ORD-8491', 'item_301', 1, 17.50);
  insertOrderItem.run('oi_2', 'ORD-8491', 'item_303', 1, 15.00);
  insertOrderItem.run('oi_3', 'ORD-8491', 'item_306', 1, 5.50);
  insertHistory.run('h_1_1', 'ORD-8491', 'Order Placed', 'Sarah Chen (Customer)', ord1CreatedAt, 'Order received and payment confirmed.');
  insertHistory.run('h_1_2', 'ORD-8491', 'Preparing', 'Marco Rossi (Tokyo Kitchen)', ord1UpdatedAt, 'Chef started simmering broth and handcrafting noodles.');

  // Order 2: Status = "Ready for Pickup" (The Burger Bistro)
  const ord2CreatedAt = dateStr(25);
  const ord2PrepAt = dateStr(20);
  const ord2ReadyAt = dateStr(6);
  const ord2EtaDate = new Date(now.getTime() + 14 * 60000).toISOString();
  insertOrder.run(
    'ORD-6120',
    'usr_cust_1',
    'rest_1',
    'usr_del_1',
    31.48,
    'Ready for Pickup',
    ord2EtaDate,
    14,
    '452 Elm Street, Apt 3B, Downtown',
    '+1 (555) 234-5678',
    'Extra napkins please.',
    ord2CreatedAt,
    ord2ReadyAt
  );
  insertOrderItem.run('oi_4', 'ORD-6120', 'item_101', 1, 16.99);
  insertOrderItem.run('oi_5', 'ORD-6120', 'item_104', 1, 7.99);
  insertOrderItem.run('oi_6', 'ORD-6120', 'item_106', 1, 6.50);
  insertHistory.run('h_2_1', 'ORD-6120', 'Order Placed', 'Sarah Chen (Customer)', ord2CreatedAt, 'Order submitted via website.');
  insertHistory.run('h_2_2', 'ORD-6120', 'Preparing', 'Liam Vance (Burger Station)', ord2PrepAt, 'Patties searing on griddle.');
  insertHistory.run('h_2_3', 'ORD-6120', 'Ready for Pickup', 'Liam Vance (Burger Station)', ord2ReadyAt, 'Packed in insulated thermal bag at restaurant dispatch counter.');

  // Order 3: Status = "Out for Delivery" (Bella Roma)
  const ord3CreatedAt = dateStr(35);
  const ord3PrepAt = dateStr(30);
  const ord3ReadyAt = dateStr(18);
  const ord3OutAt = dateStr(8);
  const ord3EtaDate = new Date(now.getTime() + 7 * 60000).toISOString();
  insertOrder.run(
    'ORD-3942',
    'usr_cust_2',
    'rest_2',
    'usr_del_1',
    47.50,
    'Out for Delivery',
    ord3EtaDate,
    7,
    '810 Pine Boulevard, Suite 12, Midtown',
    '+1 (555) 345-6789',
    'Ring doorbell twice upon arrival.',
    ord3CreatedAt,
    ord3OutAt
  );
  insertOrderItem.run('oi_7', 'ORD-3942', 'item_201', 1, 18.00);
  insertOrderItem.run('oi_8', 'ORD-3942', 'item_204', 1, 22.50);
  insertOrderItem.run('oi_9', 'ORD-3942', 'item_206', 1, 8.99);
  insertHistory.run('h_3_1', 'ORD-3942', 'Order Placed', 'David Miller (Customer)', ord3CreatedAt, 'Order registered.');
  insertHistory.run('h_3_2', 'ORD-3942', 'Preparing', 'Chef Marco (Bella Roma)', ord3PrepAt, 'Pizza in wood-fired oven.');
  insertHistory.run('h_3_3', 'ORD-3942', 'Ready for Pickup', 'Chef Marco (Bella Roma)', ord3ReadyAt, 'Boxed hot and sealed with tamper-evident tape.');
  insertHistory.run('h_3_4', 'ORD-3942', 'Out for Delivery', 'Alex Vance (Delivery Partner)', ord3OutAt, 'Courier picked up order and is en route via bike.');

  // Order 4: Status = "Delivered" (The Burger Bistro)
  const ord4CreatedAt = dateStr(90);
  const ord4PrepAt = dateStr(80);
  const ord4ReadyAt = dateStr(65);
  const ord4OutAt = dateStr(50);
  const ord4DeliveredAt = dateStr(35);
  insertOrder.run(
    'ORD-1088',
    'usr_cust_1',
    'rest_1',
    'usr_del_2',
    34.49,
    'Delivered',
    ord4DeliveredAt,
    0,
    '452 Elm Street, Apt 3B, Downtown',
    '+1 (555) 234-5678',
    'Left at door as requested.',
    ord4CreatedAt,
    ord4DeliveredAt
  );
  insertOrderItem.run('oi_10', 'ORD-1088', 'item_102', 1, 17.50);
  insertOrderItem.run('oi_11', 'ORD-1088', 'item_105', 1, 8.50);
  insertOrderItem.run('oi_12', 'ORD-1088', 'item_106', 1, 6.50);
  insertHistory.run('h_4_1', 'ORD-1088', 'Order Placed', 'Sarah Chen (Customer)', ord4CreatedAt, 'Order placed.');
  insertHistory.run('h_4_2', 'ORD-1088', 'Preparing', 'Kitchen Staff', ord4PrepAt, 'Burger grilled.');
  insertHistory.run('h_4_3', 'ORD-1088', 'Ready for Pickup', 'Kitchen Staff', ord4ReadyAt, 'Order ready.');
  insertHistory.run('h_4_4', 'ORD-1088', 'Out for Delivery', 'Maya Lin (Courier)', ord4OutAt, 'Courier picked up order.');
  insertHistory.run('h_4_5', 'ORD-1088', 'Delivered', 'Maya Lin (Courier)', ord4DeliveredAt, 'Delivered successfully to customer doorstep.');
}
