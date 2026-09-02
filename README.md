# 🎓 College Timetable & Assignment Tracker

https://college-timetable-z4v0.onrender.com/

> A modern, minimalist, and fast-loading web app for students and branch administrators to track class schedules, assignment deadlines, and sync tasks directly with Notion. Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **MongoDB**.

---

## ✨ Features

- **Live Timetable Viewer**: Browse any department, year, or section schedule with zero login required. Features automatic "Live Now" class detection with real-time timers.
- **Personalized Student Workspace**: On login, your dashboard personalizes to your branch and section, tracking completed tasks, urgent deadlines, and personal to-do items.
- **Notion 2-Way Task Sync**: 1-click sync to push assignments and personal to-dos directly into your Notion database with auto-mapped properties (Title, Subject, Due Date, Priority, Status). Includes an instant 1-click demo mode.
- **Branch & Super Admin Center**: Dedicated branch admins can add timetable entries and publish assignments. Super admins can manage all departments and promote student roles.
- **Automated Alerts**: Real-time notifications for schedule adjustments and newly posted homework.
- **Blazing Fast & Zero Bloat**: Minimalist Swiss/Linear design with pure Tailwind CSS and sub-second page loads.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB (via Mongoose with connection pooling)
- **Styling**: Tailwind CSS
- **Authentication**: JWT (`jose`) + `bcryptjs`
- **Validation**: Zod
- **Icons**: Lucide React
- **Integration**: Notion REST API

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/oliverpetrovsky/clg-timetable.git
cd clg-timetable
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your variables in `.env.local`:
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/college-timetable?retryWrites=true&w=majority
JWT_SECRET=your-random-secret-key
ALLOWED_EMAIL_DOMAIN=*
NEXT_PUBLIC_APP_NAME=College Timetable Tracker
```

### 3. Seed Initial Demo Data (Optional)
```bash
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏛️ Academic Structure & Section Distribution

- **Section A**: **CSE** (B.Tech & 5-year iMTech)
- **Section B**: **ECE** (B.Tech & 5-year iMTech) + **AI&DS** (B.Tech) — *grouped together for shared foundational & interdisciplinary curriculum*
- **Years 1–3**: All programmes (B.Tech & iMTech)
- **Years 4 & 5**: **iMTech ONLY** (CSE & ECE; B.Tech was launched later and does not have 4th/5th years)

---

## 🔑 Demo Accounts (IIIT-B)

| Role | Email | Password | Batch / Section | Access |
|------|-------|----------|-----------------|--------|
| 🔴 **Super Admin (CR)** | `classreps@iiitb.ac.in` | `tbsm-naamsujal-vichaar-Vy0m` | All Batches | Full system control & user promotion |
| 🟠 **CSE Admin** | `cse.admin@iiitb.ac.in` | `branch123` | CSE Department | Manage CSE timetables & assignments |
| 🟠 **ECE Admin** | `ece.admin@iiitb.ac.in` | `branch123` | ECE Department | Manage ECE timetables & assignments |
| 🟠 **AI&DS Admin** | `aids.admin@iiitb.ac.in` | `branch123` | AI&DS Department | Manage AI&DS timetables & assignments |
| 🟢 **CSE Student** | `student.cse@iiitb.ac.in` | `student123` | **Year 1 — Section A** | Personal dashboard & Notion sync |
| 🟢 **ECE Student** | `student.ece@iiitb.ac.in` | `student123` | **Year 1 — Section B** | Personal dashboard & Notion sync |
| 🟢 **AI&DS Student** | `student.aids@iiitb.ac.in` | `student123` | **Year 1 — Section B** | Personal dashboard & Notion sync |
| 🟣 **iMTech CSE Senior** | `imtech.cse@iiitb.ac.in` | `student123` | **Year 4 — Section A** | iMTech Senior Dashboard |
| 🟣 **iMTech ECE Senior** | `imtech.ece@iiitb.ac.in` | `student123` | **Year 4 — Section B** | iMTech Senior Dashboard |

---

## 🌐 Deploy to Render

This repository includes a [`render.yaml`](./render.yaml) blueprint for 1-click deployment:

1. Create a free database on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Connect this repository on [Render Dashboard](https://dashboard.render.com) → **New + → Blueprint**.
3. Supply your `MONGODB_URI` connection string when prompted.
4. Render will automatically build, deploy, and keep your application live.

---

## 📄 License
MIT License. Built for students, by students.
