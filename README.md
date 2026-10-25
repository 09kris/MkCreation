# Poojapa Store - Flutter App & Backend API

The Flutter storefront and admin app use the backend API for accounts, categories, products, orders, and dashboard data. The backend supports Supabase PostgreSQL or local MySQL.

Built with **Flutter**, **Node.js**, and **Express**, with customer and admin roles.

---

## 🛕 Backend Architecture

```
backend/
├── src/
│   ├── config/
│   │   └── db.js              # Supabase PostgreSQL and MySQL adapters with schema setup
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
│   └── server.js              # Express server entry point with health check
├── package.json
└── .env                       # Database credentials & JWT secret
```

---

## Database

Set `DB_TYPE=supabase` and provide `DATABASE_URL` for Supabase PostgreSQL, or set `DB_TYPE=mysql` to use a local MySQL database. The backend initializes the required schema at startup; it does not create demo users, products, or orders.

## Run the Backend

```bash
cd backend
npm install
npm run dev       # Starts server on http://localhost:5000
```

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/register` - Register a customer account
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
