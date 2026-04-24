# Nurse Connect - Authentication Fixes & Setup Guide

## Problems Fixed

### 1. **401 Unauthorized on `/api/db/query` ❌ → ✅**
**Root Cause**: `AuthContext` was trying to fetch user role from Supabase tables that don't exist. Your backend uses MongoDB, not Supabase.

**Fix**: Updated `AuthContext.tsx` to call backend's `/api/auth/me` endpoint instead of querying `user_roles` table from Supabase.

**Changed in**: `src/contexts/AuthContext.tsx`
- Method `fetchRole(userId)` → `fetchRole(token)`
- Calls `/api/auth/me` with Bearer token
- Receives `{ user, role }` and extracts role

### 2. **400 Bad Request on `/api/auth/login` - Missing confirmPassword ❌ → ✅**
**Root Cause**: Frontend's custom client's `signUp` method wasn't including `confirmPassword` field, but backend requires it.

**Fix**: Updated custom Supabase client to include `confirmPassword` in signup request.

**Changed in**: `src/integrations/supabase/client.ts`
- Added `confirmPassword: args.password` to signup payload
- Removed unused `role` field from signup payload

### 3. **No Bootstrap Admin UI ❌ → ✅**
**Root Cause**: Backend has `/api/auth/bootstrap-admin` endpoint but frontend had no way to access it.

**Fix**: Created new `BootstrapAdmin` page with full form to create the first admin account.

**Created**: `src/pages/BootstrapAdmin.tsx`
- Form to create first admin with email, username, password, name
- Calls backend `/api/auth/bootstrap-admin` endpoint
- Stores JWT token on success
- Redirects to admin login page

### 4. **Updated Routes & Navigation**
**Changed in**: `src/App.tsx`
- Added new route: `GET /admin-bootstrap` → `<BootstrapAdmin />`

**Changed in**: `src/pages/WelcomePage.tsx`
- Added "Create Admin" button in desktop and mobile navigation

**Changed in**: `src/pages/RoleLogin.tsx`
- Added helpful hint on admin login page with link to bootstrap for first-time setup

---

## How to Use Now

### **First Time Setup**

1. **Start Backend** (if not running)
   ```bash
   npm --prefix backend run dev
   # Or: npm run backend:dev
   ```

2. **Start Frontend** (if not running)
   ```bash
   npm run dev
   # Opens http://localhost:8080
   ```

3. **Create First Admin** (if no admin exists yet)
   - Visit http://localhost:8080
   - Click "Create Admin" button (in top nav or mobile menu)
   - Or directly: http://localhost:8080/admin-bootstrap
   - Fill in form:
     - Full Name: Your name
     - Username: admin, superuser, etc.
     - Email: admin@hospital.local (or any valid email)
     - Password: Min 8 characters
     - Confirm Password: Must match password
   - Click "Create Admin Account"
   - You'll be redirected to admin login

4. **Admin Login**
   - Visit http://localhost:8080/admin-login
   - Username: Can use your username or full email
   - Password: The password you created
   - Click "Sign In"

5. **Nurse Registration**
   - You must first add nurses to the system via admin panel
   - Visit http://localhost:8080/nurse-login
   - Click "Create an account" to register
   - Your phone number must exist in the system (added by admin)
   - Phone number: Used as identifier
   - Password: Min 8 characters

### **Admin Dashboard Features**
Once logged in as admin, you can:
- **Manage Nurses**: Add/remove nurses, set divisions, departments
- **Create Head Nurses**: Assign to departments
- **Create Other Admins**: Add more admin accounts
- **Generate Schedules**: Auto-schedule nurses for the week
- **Review Swaps**: Approve/reject nurse shift swap requests
- **View Activity Logs**: Audit trail of all system actions

### **Head Nurse Dashboard**
Head nurses can:
- Generate schedules for their department
- Review and approve/reject swap requests from nurses
- View performance evaluations
- Manage nurses in their department

### **Nurse Dashboard**
Nurses can:
- View their weekly schedule
- Request shift swaps
- View notifications
- Check their profile

---

## Architecture Overview

```
Frontend (React/TypeScript/Vite)
    ↓ HTTP + JWT Token
Backend (Express.js)
    ↓ Mongoose
MongoDB Atlas
```

### **Authentication Flow**

1. **Signup** (Nurse)
   ```
   Nurse enters phone + password
   → Frontend calls /api/auth/signup
   → Backend creates User + Nurse records
   → Returns JWT token
   → Frontend stores token in localStorage
   ```

2. **Login**
   ```
   User enters email/username + password
   → Frontend calls /api/auth/login
   → Backend verifies credentials
   → Returns JWT token
   → Frontend stores token
   → Frontend calls /api/auth/me with token
   → Backend returns user role
   → Frontend redirects to dashboard
   ```

3. **Protected Routes**
   ```
   Frontend makes API call
   → Includes "Authorization: Bearer {token}" header
   → Backend middleware (requireAuth) verifies token
   → If valid: attaches authUser to request
   → If invalid: returns 401 Unauthorized
   ```

### **Key Differences from Standard Supabase Setup**

- **NOT using Supabase Auth** on backend (no Supabase project needed)
- **Custom JWT tokens** issued by Express backend
- **MongoDB is source of truth** (not Postgres/Supabase)
- **Custom PostgREST-like API** in `src/integrations/supabase/client.ts` (mocks Supabase API for frontend)

---

## Troubleshooting

### **"Port 4000 already in use"**
- Kill existing process or use different port
- On Windows: `netstat -ano | findstr :4000` then `taskkill /PID {pid}`
- Edit `backend/.env`: Change `PORT=4001`

### **"MongoDB connection failed"**
- Verify `MONGODB_URI` in `backend/.env` is correct
- Check MongoDB Atlas IP whitelist includes your IP
- Try `MONGODB_PREFER_DIRECT=true` if SRV DNS issues
- Check network connectivity to MongoDB

### **"Cannot find module" errors**
- Reinstall dependencies:
  ```bash
  npm i
  npm --prefix backend i
  ```

### **Login returns 400 Bad Request**
- Check password is at least 8 characters
- Verify email format is valid
- Ensure user exists in database
- Check browser console for detailed error message

### **Blank admin dashboard**
- Wait for data to load (check Network tab in DevTools)
- Verify you're logged in as admin (check /api/auth/me returns admin role)
- Check backend logs for errors

### **Push notifications not working**
- Requires browser permission prompt (allow notifications)
- Dismiss banner if you said "No" - revisit later
- Some environments don't support service workers - use HTTPS in production

---

## Environment Variables

### **Frontend** (`.env`)
```
VITE_API_BASE_URL=http://localhost:4000/api  # Optional, defaults to this
```

### **Backend** (`.env`)
```
PORT=4000
MONGODB_URI=mongodb+srv://...
MONGODB_URI_DIRECT=mongodb://...  # Optional fallback
MONGODB_PREFER_DIRECT=true  # Try direct URI first
JWT_SECRET=your-long-random-secret
CORS_ORIGIN=http://localhost:8080
```

**Important**: Never commit `.env` files with real credentials!

---

## API Summary

### **Auth Endpoints** (No auth required)
- `POST /api/auth/signup` - Nurse registration
- `POST /api/auth/login` - User login
- `POST /api/auth/bootstrap-admin` - Create first admin (only when none exist)

### **Protected Endpoints** (Requires valid JWT token)
- `GET /api/auth/me` - Get current user info and role
- `POST /api/db/query` - Generic database queries
- `POST /api/functions/create-user` - Create admin/head nurse (admin only)
- `POST /api/functions/generate-schedule` - Generate weekly schedule (admin/head nurse)
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/:id` - Mark notification as read
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/storage/:bucket/upload` - Upload file

---

## Next Steps

1. ✅ Start backend: `npm --prefix backend run dev`
2. ✅ Start frontend: `npm run dev`
3. ✅ Create first admin via `/admin-bootstrap`
4. ✅ Login as admin and explore features
5. Add nurses and test full workflow
6. Generate schedules and test notifications
7. Deploy to production when ready

**Questions?** Check the PROJECT_ANALYSIS.md for complete endpoint and model documentation.
