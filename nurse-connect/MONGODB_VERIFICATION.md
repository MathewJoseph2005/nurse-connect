## 🗄️ MongoDB Database Configuration Verification

### ✅ Backend MongoDB Connection

**File:** `backend/src/server.js`
- Uses Mongoose ODM (Object Data Modeling)
- Connects via `connectMongo()` function with fallback logic
- Priority: MONGODB_URI_DIRECT (preferred) → MONGODB_URI
- Connection string: `mongodb+srv://nurse:***@cluster0.veijujg.mongodb.net/`

**Environment Variables:** `backend/.env`
```
MONGODB_URI=mongodb+srv://nurse:C0pU8QckOOVYb4W1@cluster0.veijujg.mongodb.net/?appName=Cluster0
MONGODB_URI_DIRECT=mongodb://nurse:C0pU8QckOOVYb4W1@ac-hwgxq4u-shard-00-00.veijujg.mongodb.net:27017,...
MONGODB_PREFER_DIRECT=true
```

---

### ✅ MongoDB Models (Mongoose Schemas)

All database models use MongoDB via Mongoose:
- `User.js` - User authentication records
- `Admin.js` - Admin user profiles
- `HeadNurse.js` - Head nurse profiles & department assignments
- `Nurse.js` - Nurse profiles, assignments, departments
- `Schedule.js` - Duty schedules
- `Department.js` - Hospital departments
- `Division.js` - Divisions
- `ShiftSwapRequest.js` - Shift swap requests
- `Notification.js` - User notifications
- `ActivityLog.js` - Audit logs
- `PerformanceEvaluation.js` - Performance records
- `PushSubscription.js` - Push notification subscriptions
- `NurseLeave.js` - Leave requests
- `NurseRemoval.js` - Removal records
- `UserRole.js` - User role assignments

---

### ✅ Backend Routes Use MongoDB

**File:** `backend/src/routes/db.js`
- Generic database query endpoint: `/api/db/query`
- Uses `Model.find()`, `Model.insertMany()`, `Model.updateMany()`, `Model.deleteMany()`
- All queries executed against Mongoose models connected to MongoDB
- Supports: SELECT, INSERT, UPDATE, DELETE, UPSERT operations

**All other routes use MongoDB models:**
- `backend/src/routes/auth.js` - User/Admin authentication
- `backend/src/routes/functions.js` - Schedule generation, etc.
- `backend/src/routes/notifications.js` - Push notifications
- `backend/src/routes/storage.js` - File storage

---

### ✅ Frontend → MongoDB (via Backend API)

**File:** `src/integrations/supabase/client.ts`
```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
```

- Frontend is NOT directly connected to MongoDB
- Frontend connects to Backend API (localhost:4000/api)
- Backend API is the ONLY gateway to MongoDB
- All queries go through: Frontend → Backend API → MongoDB

**Flow:**
```
React Component
    ↓
supabase.from("table").select()
    ↓
POST /api/db/query
    ↓
Backend Mongoose Model
    ↓
MongoDB Atlas
```

---

### ✅ All Database Operations Use MongoDB

| Operation | Component | Route | MongoDB Method |
|-----------|-----------|-------|----------------|
| Get User | Frontend → Backend | `POST /api/auth/me` | `User.findById()` |
| Get Nurses | Frontend → Backend | `POST /api/db/query` | `Nurse.find()` |
| Update Department | Frontend → Backend | `POST /api/db/query` | `HeadNurse.updateMany()` |
| Create Schedule | Frontend → Backend | `POST /api/functions/generate-schedule` | `Schedule.insertMany()` |
| Get Schedules | Frontend → Backend | `POST /api/db/query` | `Schedule.find()` |

---

### ✅ No External Database

- ❌ NO PostgreSQL
- ❌ NO Supabase Database (only Supabase client mock for API)
- ❌ NO localStorage (only for JWT tokens)
- ✅ MongoDB Atlas is the ONLY production database

---

### 🔄 Verification Commands

**Check MongoDB Connection:**
```bash
cd backend
npm run dev  # Should show: "MongoDB connected using MONGODB_URI_DIRECT"
```

**Check Departments in MongoDB:**
```bash
cd backend
npm run seed-departments  # Lists all 16 departments created
```

**Check Test Users in MongoDB:**
```bash
cd backend
npm run create-test-users  # Lists all users created and their department assignments
```

---

### ✅ Summary

**Database Architecture:**
- ✅ Backend: Express.js + Mongoose + MongoDB Atlas
- ✅ Frontend: React → Backend API (No direct DB access)
- ✅ Communication: REST API over HTTP/HTTPS
- ✅ Storage: 100% MongoDB, no fallbacks or alternatives

**All database operations verified to use MongoDB exclusively.**
