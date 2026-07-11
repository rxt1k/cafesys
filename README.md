# ☕ CafeSys — Premium Cafe QR Ordering System

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-badge-id/deploy-status)](https://cafepanels.netlify.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38b2ac.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2.0-3ecf8e.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A production-grade QR-based ordering system for cafes and restaurants. Customers scan a QR code on their table, browse the menu, place orders, and track status in real-time. Cafe admins manage dishes, tables, orders, billing, and analytics from a premium dashboard.

**Built to feel like a top-tier SaaS product — not a generic CRUD app.**

🌐 **Live Demo:** [https://cafepanels.netlify.app](https://cafepanels.netlify.app)

---

## 📸 Screenshots

<p align="center">
  <img src="https://via.placeholder.com/800x400/1a1a1a/ffffff?text=Admin+Dashboard" alt="Admin Dashboard" width="800" />
  <br/>
  <em>Admin Dashboard — Real-time analytics and order management</em>
</p>

<p align="center">
  <img src="https://via.placeholder.com/800x400/1a1a1a/ffffff?text=Customer+Menu" alt="Customer Menu" width="800" />
  <br/>
  <em>Customer Menu — Beautiful digital menu with dark mode</em>
</p>

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
|-------|------------|
| **Frontend** | React 19, Vite, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui |
| **Animations** | Framer Motion |
| **Icons** | Lucide Icons |
| **Backend** | Supabase (Auth, DB, Realtime, Storage) |
| **Deployment** | Vercel / Netlify |

**No backend server. 100% Supabase.**

---

## 🎨 Design System

**Warm Minimalism with Culinary Soul**

Inspired by Apple, Stripe, Linear, Aesop, and Sweetgreen.

- 🎨 Warm cream + espresso color palette
- ✍️ Serif headings (Lora) + clean body text (Inter)
- 📐 Generous white space and rounded corners
- 🌊 Spring-based micro-animations
- 💎 Glass morphism on overlays
- ⏳ Skeleton loading states

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/rxt1k/cafesys.git
cd cafesys

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run development server
npm run dev
