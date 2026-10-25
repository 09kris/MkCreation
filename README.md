# Poojapa Store - Node.js & MySQL Backend API

A complete, production-ready REST API for selling **Poojapa / Spiritual & Vedic Items** (Agarbatti, Pure Bhimseni Kapur, Brass Akhand Diyas, Sacred Idols, Rudraksha Malas, Daily Pooja Kits, and Hawan Samagri).

Built with **Node.js**, **Express**, and **MySQL** supporting **2 User Roles: Customer & Admin**.

---

## 🛕 Backend Architecture

```
backend/
├── src/
│   ├── config/
│   │   └── db.js              # MySQL connection pool with auto-reconnect & table migrations
│   ├── middleware/
│   │   └── auth.js            # Role-based JWT authentication (Customer vs Admin)
│   ├── controllers/
│   │   ├── authController.js     # Register, login, profile management
│   │   ├── categoryController.js # Category listing & admin CRUD
│   │   ├── productController.js  # Search, category filter, stock & admin CRUD
│   │   ├── orderController.js    # Atomic order placement with stock decrements
│   │   └── adminController.js    # Revenue, order metrics & low-stock alerts
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── productRoutes.js
│   │   ├── orderRoutes.js
│   │   └── adminRoutes.js
│   ├── scripts/
│   │   └── seed.js            # Database auto-migration & authentic seed catalog
│   └── server.js              # Express server entry point with health check
├── package.json
└── .env                       # Database credentials & JWT secret
```

---

## 👥 Two User Roles

| Role | Default Email | Default Password | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Store Admin** | `admin@poojapa.com` | `admin123` | • Business Analytics Dashboard (Revenue ₹, Total Orders, Customer Count)<br>• Inventory Management (Add, Edit, Delete, Low Stock Alerts)<br>• Order Fulfillment (Update status: Pending ➔ Confirmed ➔ Processing ➔ Shipped ➔ Delivered) |
| **Customer** | `customer@poojapa.com` | `user123` | • Browse sacred poojapa collection by categories & keyword search<br>• Product detail views with Vedic significance & stock status<br>• Place orders with delivery details & payment method (COD, UPI/QR, Cards)<br>• Live order history & tracking |

---

## 🗄️ MySQL Database Schema

The database `poojapa_db` includes the following relational tables:

1. **`users`**: `id`, `name`, `email`, `password` (bcrypt), `phone`, `role` (`'customer'`, `'admin'`), `address`, timestamps.
2. **`categories`**: `id`, `name`, `slug`, `description`, `image_url`, `icon_name`, `is_active`.
3. **`products`**: `id`, `category_id` (FK), `name`, `description`, `price`, `discount_price`, `stock_quantity`, `unit`, `image_url`, `is_featured`, `is_active`.
4. **`orders`**: `id`, `order_number`, `user_id` (FK), `total_amount`, `delivery_fee`, `final_amount`, `payment_method`, `payment_status`, `order_status`, shipping address fields.
5. **`order_items`**: `id`, `order_id` (FK), `product_id` (FK), `product_name`, `price`, `quantity`, `total_price`, `image_url`.

---

## 🚀 How to Run the Backend

### 1. Start MySQL Database
Ensure MySQL is running (e.g. via **XAMPP Control Panel**, **WampServer**, or native Windows MySQL service on port `3306`).
In `backend/.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=poojapa_db
DB_PORT=3306
```

### 2. Install & Start Server
```bash
cd backend
npm install
npm run seed      # Creates database, tables, and authentic pooja items
npm run dev       # Starts server on http://localhost:5000
```

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/register` - Register customer or admin
- `POST /api/auth/login` - Authenticate & receive JWT token
- `GET /api/auth/me` - Get current user profile

### Products & Categories
- `GET /api/categories` - List categories with product counts
- `GET /api/products` - Filterable & searchable products list
- `GET /api/products/featured` - Featured pooja items
- `POST /api/products` - *(Admin)* Add new product
- `PUT /api/products/:id` - *(Admin)* Update existing product
- `DELETE /api/products/:id` - *(Admin)* Delete product

### Orders
- `POST /api/orders` - Place new customer order (with atomic inventory decrement)
- `GET /api/orders/my-orders` - Customer's order history
- `GET /api/orders/admin/all` - *(Admin)* All customer orders with status filter
- `PUT /api/orders/admin/:id/status` - *(Admin)* Update fulfillment status

### Admin Analytics
- `GET /api/admin/dashboard` - Total revenue, orders count, low stock warnings
- `GET /api/health` - Server & database health status
