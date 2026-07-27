<div align="center">

# 🛍️ RetailIQ AI

**Intelligent Demand Forecasting & Retail Operations Platform**

[![Status: Production Ready](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)]()
[![Powered by Gemini](https://img.shields.io/badge/Powered_by-Google_Gemini-blue?style=for-the-badge&logo=google)]()
[![Stack: React & FastAPI](https://img.shields.io/badge/Stack-React%20%7C%20FastAPI-black?style=for-the-badge)]()

*Transform raw transactional data into actionable retail intelligence.*

</div>

---

## 🚨 The Problem

Modern retail businesses sit on mountains of transactional data but often lack the specialized engineering resources to extract real value from it. 

Inventory managers rely on outdated spreadsheets, gut feelings, or highly expensive enterprise software to predict demand. This leads to two massive problems that kill profit margins:
1. **Stockouts**: Running out of popular items, resulting in lost revenue and angry customers.
2. **Overstocking**: Tying up capital in dead inventory that sits in warehouses collecting dust.

## 💡 The Solution

**RetailIQ AI** is an intelligent, automated platform built for non-technical operations managers. 

It automatically ingests raw sales data, trains predictive machine learning models, and translates complex analytics into plain-English executive summaries using Generative AI. 

No SQL required. No spreadsheets. Just answers.

---

## ✨ Key Features

### 📈 Automated Demand Forecasting
Upload a standard CSV of your past sales, and RetailIQ automatically trains time-series models (XGBoost/Prophet) to project product demand 30, 60, or 90 days into the future. 

### ⚠️ Smart Inventory Alerts
Stop reacting to stockouts. RetailIQ calculates dynamic safety stock levels based on your specific lead times and flags products that are at risk of running out *before* it happens.

### 🧠 Generative AI Business Insights
Don't have time to stare at charts? Our AI Engine (powered by Google Gemini) reads your entire dashboard and writes a daily executive summary explaining *why* sales are moving and *what* actions you need to take today.

### 📦 ABC Classification & Slow-Mover Detection
Automatically categorize your catalog. Know exactly which products drive 80% of your revenue (Class A) and automatically flag "slow-movers" that are tying up capital so you can liquidate or discount them.

---

## 🔄 How It Works

RetailIQ is designed to be frictionless. The entire workflow takes less than a minute.

1. **Upload Dataset**: Drop in your standard transactional log (Invoice No, Stock Code, Quantity, Price, Date).
2. **Data Pipeline**: The system cleanses the data, imputes missing values, and engineers temporal features.
3. **Machine Learning**: Demand models are trained and RMSE bounds are evaluated in the background.
4. **Insights Generation**: View beautifully rendered charts, inventory alerts, and AI-generated executive summaries.

---

## 📸 Platform Preview

> **Dashboard & KPIs**
> Track Net Revenue, Average Order Value, Return Rates, and top-selling products in real-time.

> **Inventory Operations**
> View dynamic reorder points, current stock levels, and safety stock recommendations per product.

> **AI Analyst**
> Ask natural language questions like *"Why did revenue drop last week?"* or *"Which products should I reorder today?"* and get data-driven answers.

---

## 🚀 Getting Started (For Developers)

While the platform is built for business users, setting it up requires a brief technical deployment.

**Requirements**: Node.js (v18+), Python (3.10+), and a Google Gemini API Key.

1. **Clone & Install Backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Configure Environment**:
   Rename `backend/.env.example` to `backend/.env` and insert your Gemini API Key.
3. **Run Backend**:
   ```bash
   uvicorn app.main:app --reload
   ```
4. **Run Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

*(Includes a one-click `Demo Mode` to instantly populate the platform with sample data for evaluation!)*

---

<div align="center">
<i>Built to make enterprise-grade retail analytics accessible to everyone.</i>
</div>
