# Unified Login System - Setup & Usage Guide

## 🎯 Overview

The Nurse Connect application now has a **single unified login system** for all user roles:
- **Nurse**
- **Head Nurse**
- **Admin**

This replaces the previous multi-page login system with a streamlined, role-based login experience.

---

## 📋 Setup Instructions

### Step 1: Create Test Users

Run this command in the backend directory to create test users for all roles:

```bash
cd backend
npm run create-test-users
```

This will create:
- **1 Admin account**
- **2 Head Nurse accounts**
- **3 Nurse accounts**

### Step 2: Start the Application

**Terminal 1 - Backend (Port 4000):**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend (Port 8080):**
```bash
cd .
npm run dev
```

### Step 3: Access the Application

1. Go to `http://localhost:8080`
2. Click **"Staff Login"** button
3. Select your role and enter credentials

---

## 🔐 Test User Credentials

### Admin Login
```
Role: Administrator
Username: admin_demo
Password: admin@123456
Email: admin_demo@admin.local
```

### Head Nurse Logins
```
Head Nurse 1:
- Username: headnurse_1
- Password: headnurse@123456
- Phone: 9496555201

Head Nurse 2:
- Username: headnurse_2
- Password: headnurse@123456
- Phone: 9496555202
```

### Nurse Logins
```
Nurse 1:
- Phone: 9496555300
- Password: nurse@123456

Nurse 2:
- Phone: 9496555301
- Password: nurse@123456

Nurse 3:
- Phone: 9496555302
- Password: nurse@123456
```

---

## 🎨 Unified Login Flow

### 1. Role Selection
When visiting `/login`, users first select their role:
- Nurse
- Head Nurse
- Administrator

### 2. Credential Entry
Based on the selected role:

**Nurse Role:**
- Prompts for: **Phone Number** + **Password**

**Head Nurse Role:**
- Prompts for: **Username** + **Password**

**Admin Role:**
- Prompts for: **Username/Email** + **Password**

### 3. Automatic Redirect
After successful login, users are automatically redirected to their role-specific dashboard:
- **Nurse** → `/nurse-dashboard`
- **Head Nurse** → `/headnurse-dashboard`
- **Admin** → `/admin-dashboard`

---

## 📱 Pages Modified

### Frontend Changes

**New File:**
- `src/pages/UnifiedLogin.tsx` - Single login page for all roles

**Updated Files:**
- `src/App.tsx` - Routes updated to use `/login` instead of individual login pages
- `src/pages/WelcomePage.tsx` - Navigation links updated to point to unified login

**Removed Imports** (but files still exist for reference):
- `NurseLogin` from `src/pages/NurseLogin.tsx`
- `HeadNurseLogin`, `AdminLogin` from `src/pages/RoleLogin.tsx`

---

## 🔄 Navigation Changes

### Old Routes (Deprecated)
```
/nurse-login → ❌ No longer used
/headnurse-login → ❌ No longer used
/admin-login → ❌ No longer used
```

### New Routes
```
/login → ✅ Single login page for all roles
/admin-bootstrap → ✅ Still available for first-time admin setup
```

---

## 💾 Backend Script Details

### `create-test-users.mjs`

This script:
1. Connects to MongoDB
2. Clears existing test users (same email domains)
3. Creates test admin account
4. Creates 2 test head nurse accounts
5. Creates 3 test nurse accounts with pre-registered phones
6. Displays all credentials for easy reference

**To run:**
```bash
npm run create-test-users
```

---

## 🎯 Features of the Unified Login

✅ **Single Entry Point** - No confusion about which login page to use
✅ **Role-Based UI** - Dynamic form fields based on selected role
✅ **Smart Instructions** - Helpful tips for each role
✅ **Auto Redirect** - Goes to appropriate dashboard after login
✅ **Error Handling** - Clear error messages for invalid credentials
✅ **Mobile Responsive** - Works on mobile, tablet, and desktop
✅ **Beautiful UI** - Consistent design with hospital branding

---

## 🚀 Testing Checklist

- [ ] Successfully view the login page at `/login`
- [ ] Can select admin role and login with provided credentials
- [ ] Can select head nurse role and login with provided credentials
- [ ] Can select nurse role and login with provided credentials
- [ ] Gets redirected to correct dashboard after login
- [ ] Welcome page buttons point to `/login`
- [ ] Can still use `/admin-bootstrap` for first-time admin setup
- [ ] Phone field shows for nurses only
- [ ] Username field shows for head nurse and admin roles
- [ ] Error messages appear for invalid credentials

---

## 📝 Important Notes

1. **Nurse Authentication**: Uses phone number (not email) as primary identifier
   - Email format: `nurse_<PHONE>@nurseconnect.local`
   - Phone must be pre-registered in the system

2. **Head Nurse Authentication**: Uses username as primary identifier
   - Email format: `<USERNAME>@headnurse.local`

3. **Admin Authentication**: Uses username or email
   - Email format: `<USERNAME>@admin.local`

4. **First-Time Admin**: Use `/admin-bootstrap` to create the first admin account when no admins exist

5. **Database**: All test users are created in MongoDB with proper relationships

---

## 🔄 Resetting Test Users

To clear test users and re-create them:

```bash
npm run create-test-users
```

This will automatically delete old test users and create fresh ones.

---

## 🆘 Troubleshooting

**Login fails with "Invalid credentials"**
- Verify you're using correct credentials from the guide above
- Check that backend is running on port 4000
- Check MongoDB connection in `.env`

**Role dropdown is empty**
- Make sure all UI imports are present in UnifiedLogin.tsx
- Check browser console for JS errors

**Redirects to wrong dashboard**
- Check that the role is correctly assigned in your database
- Verify JWT token contains correct role claim

---

## 📞 Quick Reference

| User Type | Username/Phone | Password | Access |
|-----------|-----|----------|--------|
| Admin | admin_demo | admin@123456 | Admin dashboard |
| Head Nurse 1 | headnurse_1 | headnurse@123456 | Head Nurse dashboard |
| Head Nurse 2 | headnurse_2 | headnurse@123456 | Head Nurse dashboard |
| Nurse 1 | 9496555300 | nurse@123456 | Nurse dashboard |
| Nurse 2 | 9496555301 | nurse@123456 | Nurse dashboard |
| Nurse 3 | 9496555302 | nurse@123456 | Nurse dashboard |

---

**Last Updated:** April 2026
**Version:** 2.0 - Unified Login System
