# SmileCart: Enterprise Retail ERP & POS System 🛒

Welcome to **SmileCart**, a comprehensive Enterprise Retail Enterprise Resource Planning (ERP) and Point-of-Sale (POS) system built with the MERN-stack equivalent (React + Node.js/Express + SQLite). This system is designed to handle multiple branches, dynamic inventory, employee shifting, loyalty programs, multi-variant products, and advanced analytics.

## ✨ Features

- **Multi-Branch Inventory Management**: Track inventory, product variants, and stock across multiple store locations independently.
- **Robust POS Terminal**: Allows cashiers to easily scan items (QR/Barcode support), process discounts, apply taxes, and checkout items quickly. Hold and retrieve saved carts dynamically.
- **Employee Management & Shifts**: Cashiers clock in and out, tracking their start and end times, as well as tracking their starting and ending till cash. 
- **CRM & Loyalty Program**: Maintain customer profiles, total spend tracking, and loyalty point accumulation to increase customer retention.
- **Comprehensive Dashboard**: Beautiful charts and analytics (via Recharts) displaying sales trends and inventory counts.
- **Admin Control Panel**: Advanced functionality to create new products, manage users, set promo codes, and onboard suppliers.
- **Receipts & Invoicing**: PDF generation of receipts using `jspdf` and thermal-printer ready capabilities.
- **Secure Authentication**: Role-based access control leveraging JWT (JSON Web Tokens) and bcrypt for password hashing.

## 🛠️ Technologies Used

### Frontend
- **React 18** (via Create React App)
- **React Router Dom** for client-side routing
- **Axios** for API requests
- **Recharts** for beautiful dashboard analytics
- **html5-qrcode** for Barcode/QR Scanning functionality
- **jsPDF & html2canvas** for generating downloadable PDF receipts
- **React Icons** for clean, scalable iconography

### Backend
- **Node.js & Express.js** for the REST API
- **SQLite3** for lightweight, portable relation database management
- **Bcrypt & JWT** for robust, secure authentication
- **Multer** for local image and file upload handling
- **Nodemailer** for automated email capabilities
- **Stripe** for payment processing integration
- **CORS** for secure cross-origin requests

---

## 🚀 Getting Started

Follow the instructions below to get a local copy of this project up and running.

### 1. Prerequisites
- **Node.js** (v14 or higher is recommended)
- **npm** or **yarn** package manager
- **Git**

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/smilecart-pos.git
cd smilecart-pos
```

### 3. Backend Setup
The backend runs an Express API connected to an SQLite database (`pos.db`).
```bash
cd backend

# Install all backend dependencies
npm install

# (Optional) Create a .env file if necessary for secret management
# e.g., JWT_SECRET=yoursecretkey STRIPE_SECRET=yourstripesecret

# Start the development server
npm run dev
# Server should now be running on port 5000: http://localhost:5000
```
*Note: An initial migration script, or `database.js` connection will auto-initialize the SQLite schema (`pos.db`) out-of-the-box upon the first run.*

### 4. Frontend Setup
Open a new terminal window / tab, and navigate to the frontend directory:
```bash
# Return to root directory if you are in the backend folder
cd ../frontend

# Install all React dependencies
npm install

# Start the frontend React app
npm start
# The application will open in your browser at http://localhost:3000
```

## 📂 Project Structure

```text
smilecart-pos/
├── backend/
│   ├── database.js     # SQLite schema definitions & connection
│   ├── server.js       # Express routing, middleware, & endpoints
│   ├── uploads/        # Locally uploaded product imagery
│   └── package.json    # Backend dependencies
├── frontend/
│   ├── public/         # Static assets (index.html)
│   ├── src/            # React application source code
│   │   ├── components/ # Reusable React components (Navbar, Cart, etc.)
│   │   ├── pages/      # Top-level Page components (Dashboard, POS, Admin)
│   │   ├── App.js      # Main React Router configuration
│   │   └── index.css   # Global application styling
│   └── package.json    # Frontend dependencies
└── README.md
```

## ⚙️ How it works
1. **The Database:** Upon running the server `node server.js` for the first time, `database.js` runs a `CREATE TABLE IF NOT EXISTS` schema check ensuring tables like `users`, `products`, `orders`, and `branch_inventory` are immediately available.
2. **Authentication:** The frontend will require users to login. Upon successful login, the Express server will issue a JWT that the React client will store in `localStorage` and pass as a Bearer token in subsequent `Axios` requests.
3. **Point of Sale Flow:** Cashiers add `product_variants` to a cart state in React. When the transaction validates, the frontend submits the payload via a POST request to `/api/orders`. The backend deducts respective stock from `branch_inventory`, calculates CRM loyalty rewards for `customers`, verifies `promocodes`, and records the final sale in `orders`.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.

## 📄 License
This project is licensed under the MIT License.
