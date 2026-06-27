<img width="960" height="475" alt="image" src="https://github.com/user-attachments/assets/1ec506bf-2bc2-487e-961c-e9adeeabd1a1" />




# ☕ CafeSys — Premium Cafe QR Ordering System

A production-grade QR-based ordering system for cafes and restaurants. Customers scan a QR code on their table, browse the menu, place orders, and track status in real-time. Cafe admins manage dishes, tables, orders, billing, and analytics from a premium dashboard.

Built to feel like a top-tier SaaS product — not a generic CRUD app.

---

## ✨ Features

### 📱 Customer Experience
- **QR Scan & Go** — Scan permanent table QR, no app install needed
- **Digital Menu** — Beautiful menu with categories, images, veg/non-veg badges
- **Smart Cart** — Add items with extras, special instructions, quantity controls
- **Live Order Tracking** — Real-time status updates with timeline visualization
- **Service Requests** — Call waiter, request water, ask for bill
- **Order History** — Past orders with re-order capability
- **Dark Mode** — Automatic and manual toggle

### 👨‍💼 Admin Dashboard
- **Real-time Dashboard** — Today's sales, orders, table occupancy, popular items
- **Order Management** — Full lifecycle: confirm → prepare → ready → serve → bill → paid
- **Menu Management** — Categories, dishes, extras with image uploads
- **Table Management** — Auto-generated QR codes, download individually or all
- **Analytics** — Revenue trends, peak hours, popular dishes, payment breakdown
- **Notifications** — Real-time alerts for new orders and requests
- **Billing** — Generate invoices, mark paid, reset tables

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Animations | Framer Motion |
| Icons | Lucide Icons |
| Backend | Supabase (Auth, DB, Realtime, Storage) |
| Deployment | Vercel / Netlify |

**No backend server. 100% Supabase.**

---

## 🎨 Design System

**Warm Minimalism with Culinary Soul**

Inspired by Apple, Stripe, Linear, Aesop, and Sweetgreen.

- Warm cream + espresso color palette
- Serif headings (Lora) + clean body text (Inter)
- Generous white space and rounded corners
- Spring-based micro-animations
- Glass morphism on overlays
- Skeleton loading states

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/cafesys.git
cd cafesys

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run development server
npm run dev
