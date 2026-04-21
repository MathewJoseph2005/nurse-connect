# Nurse Connect - Complete Project Analysis

## 📋 Project Overview
**Nurse Connect** is a comprehensive nurse scheduling and management system built for Caritas Hospital. It's a full-stack application with:
- **Frontend**: React/TypeScript with Vite, Shadcn UI components, Supabase integration
- **Backend**: Node.js/Express with MongoDB database
- **Authentication**: Supabase Auth with JWT tokens
- **Real-time**: Supabase real-time subscriptions
- **Three User Roles**: Nurse, Head Nurse, Admin

---

## 🏗️ Frontend Architecture

### **Pages & Routes**

#### 1. **WelcomePage** (`/`)
- **Purpose**: Public landing page with hospital information
- **Components**:
  - Header with logo and navigation
  - Mobile-responsive hamburger menu
  - Hero carousel (auto-rotating every 5 seconds) showing hospital slides
  - Emergency contact banner (24x7)
  - About, Departments, Location, Accreditations sections
- **Clickable Elements**:
  - [Nurse Portal] → `/nurse-login`
  - [Head Nurse] → `/headnurse-login`
  - [Admin] → `/admin-login`
  - Navigation links (About, Departments, Location, Accreditations)
  - Emergency phone link (tel:9496555200)

#### 2. **NurseLogin** (`/nurse-login`)
- **Dual Mode**: Registration & Login
- **Registration Process**:
  - Full Name input
  - Phone Number input (required to pre-exist in system)
  - Password (min 8 chars)
  - Confirm Password
  - Check via RPC: phone must exist in nurses table with user_id=null
  - Creates Supabase auth user and links to nurse profile
  
- **Login Process**:
  - Phone Number → converts to email format (e.g., "9496555200" → "9496555200@nurse.local")
  - Password
  - Supabase Auth sign-in

- **Clickable Elements**:
  - [Register] button
  - [Sign In] button
  - Toggle between modes
  - [Back to Home] link

#### 3. **RoleLogin** (`/headnurse-login`, `/admin-login`)
- **Purpose**: Login for Head Nurses and Admins
- Same structure as Nurse Login but for different roles

#### 4. **NurseDashboard** (`/nurse-dashboard`)
- **Protected Route**: Only accessible to nurses
- **Tabs**:
  - **Schedule Tab**: View weekly duty schedule
  - **Swap Tab**: Request shift swaps with other nurses
  - **Notifications Tab**: View and manage notifications
  - **Profile Tab**: View personal information
  
- **Key Features**:
  - Sidebar (collapsible on mobile)
  - Workload indicator (Low/Medium/High based on shifts in next 7 days)
  - Push notification banner with [Enable] and [Dismiss] buttons
  - Sign Out button
  
- **Clickable Elements**:
  - Tab buttons (Schedule, Swap, Notifications, Profile)
  - Week/Month navigation buttons
  - Shift swap request buttons
  - Notification read/unread toggle
  - Sign Out button
  - Mobile menu toggle

#### 5. **HeadNurseDashboard** (`/headnurse-dashboard`)
- **Protected Route**: Only accessible to head nurses
- **Tabs**:
  - **Weekly Schedule**: Generate and view schedules for department
  - **Swap Requests**: Approve/Reject nurse swap requests
  - **Performance**: View nurse performance evaluations
  - **Manage Nurses**: Add/remove nurses from department

- **Clickable Elements**:
  - Tab navigation buttons
  - [Generate Schedule] button
  - [Force Assign Remaining] checkbox
  - Approve/Reject swap request buttons
  - Search nurses input
  - Trash icon to remove nurses
  - Sign Out button
  - Mobile menu toggle

#### 6. **AdminDashboard** (`/admin-dashboard`)
- **Protected Route**: Only accessible to admins
- **Tabs**:
  - **Overview**: Dashboard statistics (nurses, shifts, pending swaps, departments)
  - **All Nurses**: Browse/manage all nurses
  - **Head Nurses**: Create and manage head nurse accounts
  - **Admins**: Create and manage admin accounts
  - **Schedules**: View all schedules system-wide
  - **Swap Requests**: Review all swap requests
  - **Activity Logs**: Audit trail of system actions

- **Key Features**:
  - Division distribution chart
  - Recent activity logs
  - Search functionality
  - Batch operations
  
- **Clickable Elements**:
  - Tab buttons
  - [Create User] button
  - Search inputs
  - Status filtering (Active/Inactive)
  - Approve/Reject buttons
  - Delete buttons
  - Export/Report buttons
  - Sign Out button

#### 7. **NotFound** (`*` catch-all)
- 404 error page

---

## 🎮 UI Components & Clickable Elements

### **Global Components**

#### **NavLink**
- Navigation link wrapper with active state styling

#### **ProtectedRoute**
- Wrapper component checking:
  - User authentication status
  - Role-based access control (allowedRoles)
  - Shows loader while checking
  - Redirects to home if unauthorized

#### **Shadcn UI Library** (30+ components used)
- `Button` - All clickable buttons
- `Input` - Text, password, search inputs
- `Label` - Form labels
- `Select` - Dropdown selectors
- `Dialog` - Modal dialogs
- `Sheet` - Sidebar drawer
- `Toast` - Notifications
- `Badge` - Status badges
- `Card` - Content containers
- `Accordion` - Collapsible content
- `Tabs` - Tab navigation
- `AlertDialog` - Confirmation dialogs
- `Checkbox`, `Radio`, `Switch` - Form controls
- `Calendar` - Date pickers
- `Popover` - Context menus
- `Avatar` - User profile pictures
- And more...

### **Icons** (Lucide React)
- Menu, X (hamburger menu)
- Calendar, Clock (scheduling)
- ArrowLeftRight (shift swap)
- Bell, BellRing (notifications)
- User, LogOut (profile/auth)
- Activity, Building2 (admin features)
- Search, ChevronRight, Loader2, Plus, Check, XCircle, Trash2, Wand2, Star, Shield, etc.

---

## 🔐 Backend Routes & Endpoints

### **Base URL**: `http://localhost:4000` (or configured PORT)

### **1. Health Check**
```
GET /health
Returns: { ok: true }
```

### **2. Authentication Routes** (`/api/auth`)

#### **Sign Up** (Nurse Registration)
```
POST /api/auth/signup
Body: {
  email: string,
  password: string (min 8 chars),
  confirmPassword: string,
  name: string,
  phone: string
}
Returns: {
  session: { access_token: string, user: { id, email } },
  user: { id, email }
}
```

#### **Login**
```
POST /api/auth/login
Body: { email, password }
Returns: {
  session: { access_token, user },
  user: { id, email },
  role: string ("nurse" | "head_nurse" | "admin")
}
```

#### **Bootstrap Admin** (First Admin Creation)
```
POST /api/auth/bootstrap-admin
Body: { email, password, name, username }
Returns: { session, user }
Note: Only works if no admin exists
```

#### **Get Current User**
```
GET /api/auth/me
Headers: Authorization: Bearer {token}
Returns: { user: { id, email }, role: string }
```

### **3. Database Query Routes** (`/api/db`)

#### **Generic Query** (PostgREST-like interface)
```
POST /api/db/query
Body: {
  table: string (see modelMap below),
  action: "select" | "insert" | "update" | "delete" | "upsert",
  filters: Array<{ field, op, value }>,
  orders: Array<{ field, ascending? }>,
  limit: number,
  payload: object | array,
  options: { head?, count?, single?, maybeSingle? }
}
```

**Supported Tables**:
- `user_roles`
- `divisions`
- `departments`
- `nurses`
- `head_nurses`
- `admins`
- `schedules`
- `shift_swap_requests`
- `notifications`
- `performance_evaluations`
- `nurse_removals`
- `activity_logs`
- `nurse_leaves`
- `push_subscriptions`

**Filter Operations**:
- `eq` - equals
- `neq` - not equals
- `gte` - greater than or equal
- `in` - in array
- `not with is null` - not null

#### **Check Nurse Phone Exists** (RPC)
```
POST /api/db/rpc/check_nurse_phone_exists
Body: { phone_number: string }
Returns: { data: boolean }
```

#### **Get Nurse Workload** (RPC)
```
POST /api/db/rpc/get_nurse_workload
Headers: Authorization: Bearer {token}
Body: { nurse_uuid: string }
Returns: { data: "low" | "medium" | "high" }
Calculation: Based on schedules in next 7 days
  - >= 5 shifts = high
  - >= 3 shifts = medium
  - < 3 shifts = low
```

### **4. Functions Routes** (`/api/functions`)

#### **Create User** (Admin/Head Nurse Creation)
```
POST /api/functions/create-user
Headers: Authorization: Bearer {token}, Role required: admin
Body: {
  email: string,
  password: string (min 8 chars),
  confirmPassword: string,
  role: "head_nurse" | "admin",
  name: string,
  username: string,
  department_id: string (for head nurses)
}
Returns: { success: true, user_id: string }
```

#### **Generate Schedule**
```
POST /api/functions/generate-schedule
Headers: Authorization: Bearer {token}
Body: {
  week_number: number (1-52),
  year: number,
  department_id: string (optional, required for manual entry),
  force_assign_remaining: boolean
}
Access: Admin or Head Nurse (own department only)
Returns: { success: true, entries: array, insufficiencies: array }
Logic:
  - Deletes existing schedules for that week
  - Assigns nurses to all shifts (morning, evening, night)
  - Balances division coverage
  - Respects department assignments
```

### **5. Notifications Routes** (`/api/notifications`)

#### **Get Notifications**
```
GET /api/notifications
Headers: Authorization: Bearer {token}
Query: {
  unread_only?: boolean,
  limit?: number (default 50),
  offset?: number (default 0)
}
Returns: {
  notifications: array,
  total: number,
  unreadCount: number,
  limit, offset
}
```

#### **Get Unread Count**
```
GET /api/notifications/unread-count
Headers: Authorization: Bearer {token}
Returns: { unreadCount: number }
```

#### **Update Notification**
```
PATCH /api/notifications/:notification_id
Headers: Authorization: Bearer {token}
Body: { is_read: boolean }
Returns: { success: true, notification: object }
```

#### **Bulk Update Notifications**
```
PATCH /api/notifications
Headers: Authorization: Bearer {token}
Body: {
  notification_ids: string[],
  is_read: boolean
}
Returns: { success: true, modifiedCount: number }
```

#### **Delete Notification**
```
DELETE /api/notifications/:notification_id
Headers: Authorization: Bearer {token}
Returns: { success: true }
Also: Creates activity log entry
```

#### **Bulk Delete Notifications**
```
DELETE /api/notifications
Headers: Authorization: Bearer {token}
Body: { notification_ids: string[] }
Returns: { success: true, deletedCount: number }
```

### **6. Storage Routes** (`/api/storage`)

#### **Upload File**
```
POST /api/storage/:bucket/upload
Headers: Authorization: Bearer {token}
Body: multipart/form-data
  - file: File object
  - path: string (optional, custom path)
Returns: {
  path: string (relative path),
  publicUrl: string (access URL)
}
```

#### **Get Public File**
```
GET /api/storage/public/:bucket/*
No auth required
Downloads file from uploads directory
```

---

## 💾 Database Models

### **User**
```
{
  _id: ObjectId,
  email: string (unique, lowercase),
  passwordHash: string,
  role: "admin" | "head_nurse" | "nurse",
  name: string,
  username: string,
  phone: string,
  createdAt: Date,
  updatedAt: Date
}
```

### **Nurse**
```
{
  _id: ObjectId,
  user_id: ObjectId | null (ref: User),
  name: string,
  age: number,
  phone: string (unique),
  gender: "male" | "female" | "other",
  division_id: ObjectId (ref: Division),
  current_department_id: ObjectId (ref: Department),
  previous_departments: [ObjectId],
  exam_score_percentage: number,
  experience_years: number,
  is_active: boolean,
  photo_url: string,
  created_at: Date,
  updated_at: Date
}
```

### **Schedule**
```
{
  _id: ObjectId,
  nurse_id: ObjectId (ref: Nurse),
  department_id: ObjectId (ref: Department),
  shift_type: "morning" | "evening" | "night",
  duty_date: string (YYYY-MM-DD),
  week_number: number (1-52),
  year: number,
  created_by: ObjectId (ref: User),
  created_at: Date,
  updated_at: Date
}
Unique Index: nurse_id + duty_date
```

### **ShiftSwapRequest**
```
{
  _id: ObjectId,
  requester_nurse_id: ObjectId (ref: Nurse),
  target_nurse_id: ObjectId (ref: Nurse),
  requester_schedule_id: ObjectId (ref: Schedule),
  target_schedule_id: ObjectId (ref: Schedule),
  reason: string,
  status: "pending" | "approved" | "rejected",
  created_at: Date,
  updated_at: Date
}
```

### **HeadNurse**
```
{
  _id: ObjectId,
  user_id: ObjectId (ref: User),
  name: string,
  username: string,
  department_id: ObjectId (ref: Department),
  created_at: Date,
  updated_at: Date
}
```

### **Admin**
```
{
  _id: ObjectId,
  user_id: ObjectId (ref: User),
  name: string,
  username: string,
  created_at: Date,
  updated_at: Date
}
```

### **Division**
```
{
  _id: ObjectId,
  name: string (e.g., "ICU", "Maternity", "Cardiology"),
  created_at: Date,
  updated_at: Date
}
```

### **Department**
```
{
  _id: ObjectId,
  name: string,
  location: string,
  created_at: Date,
  updated_at: Date
}
```

### **Notification**
```
{
  _id: ObjectId,
  user_id: ObjectId (ref: User),
  title: string,
  message: string,
  type: string (e.g., "schedule", "swap", "system"),
  is_read: boolean,
  entity_type: string,
  entity_id: ObjectId,
  created_at: Date,
  updated_at: Date
}
```

### **ActivityLog**
```
{
  _id: ObjectId,
  user_id: ObjectId (ref: User),
  action: string (e.g., "schedule_created", "nurse_removed"),
  entity_type: string,
  entity_id: ObjectId,
  description: string,
  metadata: object,
  created_at: Date,
  updated_at: Date
}
```

### **PerformanceEvaluation**
```
{
  _id: ObjectId,
  nurse_id: ObjectId (ref: Nurse),
  evaluated_by: ObjectId (ref: User),
  rating: number (1-5),
  comments: string,
  created_at: Date,
  updated_at: Date
}
```

### **NurseLeave**
```
{
  _id: ObjectId,
  nurse_id: ObjectId (ref: Nurse),
  leave_type: string (e.g., "sick", "personal", "annual"),
  start_date: string (YYYY-MM-DD),
  end_date: string (YYYY-MM-DD),
  status: "pending" | "approved" | "rejected",
  reason: string,
  created_at: Date,
  updated_at: Date
}
```

### **NurseRemoval**
```
{
  _id: ObjectId,
  nurse_id: ObjectId (ref: Nurse),
  removed_by: ObjectId (ref: User),
  reason: string,
  removed_at: Date,
  created_at: Date,
  updated_at: Date
}
```

### **PushSubscription**
```
{
  _id: ObjectId,
  user_id: ObjectId (ref: User),
  endpoint: string (unique per user+endpoint),
  auth: string,
  p256dh: string,
  created_at: Date,
  updated_at: Date
}
```

### **UserRole**
```
{
  _id: ObjectId,
  user_id: ObjectId (ref: User),
  role: "admin" | "head_nurse" | "nurse",
  created_at: Date,
  updated_at: Date
}
```

---

## 🔐 Authentication & Authorization Flow

### **Sign-Up Flow (Nurse)**
1. Nurse enters phone, password, name
2. Frontend validates password confirmation
3. Frontend checks if phone exists in system via `POST /api/db/rpc/check_nurse_phone_exists`
4. If phone exists → Create Supabase auth user with email = `{phone}@nurse.local`
5. Database trigger (Supabase) automatically:
   - Creates User document in MongoDB
   - Creates UserRole entry with role="nurse"
   - Links Nurse profile to User via user_id
6. JWT token returned
7. Frontend redirects to `/nurse-dashboard`

### **Login Flow**
1. User enters email/phone + password
2. Frontend converts phone to email if needed
3. Supabase Auth sign-in
4. JWT token issued
5. Frontend calls `GET /api/auth/me` to fetch role
6. Role-based redirect (dashboard based on role)

### **Authorization Middleware**
```javascript
// requireAuth middleware - checks JWT
const token = req.headers.authorization?.split(" ")[1]
Verifies JWT using process.env.JWT_SECRET
Attaches req.authUser = { id, role }

// requireRole middleware - checks role after auth
requireRole("admin", "head_nurse")
Checks if req.authUser.role matches allowed roles
```

### **Role-Based Access Control**
- **Nurse**: Can view own schedule, request swaps, view notifications
- **Head Nurse**: Can generate schedules for own department, approve swaps, manage nurses
- **Admin**: Full system access - manage all schedules, users, roles, view logs

---

## 📊 Key Functionalities

### **1. Schedule Generation**
- **Algorithm**: Balanced assignment trying to maintain division coverage
- **Trigger**: Head Nurse or Admin calls `POST /api/functions/generate-schedule`
- **Process**:
  - Fetch all nurses in department
  - For each day in week & each shift (morning, evening, night)
  - Assign nurses ensuring no duplicate assignments
  - Track division distribution
  - If insufficient nurses → return insufficiencies
- **Output**: Creates Schedule documents in MongoDB

### **2. Shift Swap Requests**
- **Process**:
  - Nurse selects their schedule to swap
  - Searches for another nurse's schedule to swap with
  - Requests swap
  - Head Nurse reviews and approves/rejects
  - If approved, schedules are updated
- **Status**: pending → approved/rejected

### **3. Push Notifications**
- **Frontend**: Supabase banner on nurse dashboard asking permission
- **Implementation**: Service Worker (sw.js) handles push notifications
- **Database**: PushSubscription stores endpoint/auth/p256dh
- **Real-time**: Supabase realtime channel listens for new notifications

### **4. Notification System**
- **Types**: Schedule notifications, swap request updates, system alerts
- **Storage**: Notification documents with user_id, title, message
- **Real-time**: Supabase postgres_changes trigger on INSERT
- **Frontend**: Toast notifications + notification bell with unread count

### **5. Performance Evaluation**
- **Head Nurse**: Can rate and comment on nurse performance
- **Data**: PerformanceEvaluation documents stored
- **Display**: Visible in Head Nurse dashboard

### **6. Activity Logging**
- **Tracking**: All significant actions logged (user creation, schedule generation, swaps, etc.)
- **Fields**: user_id, action, entity_type, description, metadata
- **Admin View**: Activity logs tab shows recent system actions

### **7. Workload Calculation**
- **Logic**: Count shifts in next 7 days
  - 0-2 shifts = Low workload
  - 3-4 shifts = Medium workload
  - ≥5 shifts = High workload
- **Purpose**: Visual indicator for nurses and head nurses

---

## 🔄 Data Flow Diagram

```
User → Frontend (React/Vite) → Supabase Auth
                ↓
         Backend (Express) ← MongoDB
                ↓
         JWT Verification
                ↓
         Role-based authorization
                ↓
         DB Operations / Files
                ↓
         Response back to Frontend
                ↓
         Real-time updates via Supabase
```

### **Nurse Registration Flow**
```
NurseLogin (Phone) 
  → Check phone exists (RPC) 
  → Supabase Auth signup 
  → Create User/UserRole/link Nurse 
  → Redirect to dashboard
```

### **Schedule Generation Flow**
```
HeadNurse/Admin → Request generate-schedule
  → Validate permissions (own dept for HN)
  → Fetch active nurses in dept
  → Algorithm: assign shifts, ensure balance
  → Create Schedule documents
  → Create Notification for each nurse
  → Create ActivityLog entry
  → Return success
```

### **Shift Swap Flow**
```
Nurse → Request swap
  → Create ShiftSwapRequest (pending)
  → Notification sent to target nurse
  → Head Nurse reviews
  → Approve/Reject
  → If approved: Update schedules
  → Create ActivityLog
  → Notify both nurses
```

---

## 📱 Responsive Design

- **Mobile First**: All dashboards collapse navigation to hamburger menu
- **Breakpoints**: Tailwind's md: breakpoint (768px)
- **Components**: Radix UI ensures accessibility and responsiveness
- **Touch Friendly**: Large tap targets, mobile-optimized forms

---

## 🔌 API Integration Points

### **Frontend ↔ Backend**
- Uses custom fetch wrapper (likely in utils)
- Base URL: `/api` (Vite proxy to backend)
- Authentication: JWT in Authorization header
- Content-Type: `application/json`

### **Frontend ↔ Supabase**
- Real-time subscriptions for notifications
- Database queries (nurses, schedules, etc.)
- Auth state management
- File storage (profile photos, documents)

### **Backend ↔ MongoDB**
- Mongoose ORM for data persistence
- Transactions for atomic operations (unused currently)
- Indices on frequently queried fields (nurse_id + duty_date)
- Population/references for relationships

---

## 🛠️ Development Setup

### **Commands**
```bash
# Frontend
npm run dev           # Start Vite dev server
npm run build         # Production build
npm run test          # Run tests
npm run test:watch    # Watch tests

# Backend
npm --prefix backend install
npm --prefix backend run dev      # Watch mode
npm --prefix backend run start    # Production

# Both
npm run backend:dev   # From root
```

### **Environment Variables**
**Backend** (backend/.env):
- `PORT` - Server port (default 4000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT signing
- `CORS_ORIGIN` - Allowed CORS origins
- `MONGODB_PREFER_DIRECT` - Use direct connection if true

---

## 🐛 Known Features & Edge Cases

1. **Nurse Registration**: Nurse must be pre-entered in system with valid phone
2. **Head Nurse Constraints**: Only one head nurse per department
3. **Bootstrap Admin**: Only works on first admin creation
4. **Schedule Uniqueness**: No duplicate nurse assignments per day
5. **Division Coverage**: Schedule generation tries but may insufficiently cover divisions
6. **Push Notifications**: Requires browser permission and service worker support

---

## 📈 Scalability Considerations

- **Database Scaling**: MongoDB indexing on nurse_id, duty_date
- **API Rate Limiting**: Not currently implemented
- **Caching**: No caching layer (could benefit from Redis)
- **File Storage**: Local disk (could migrate to S3)
- **Real-time**: Limited by Supabase free tier connections
- **Load Balancing**: Single backend instance (could scale horizontally)

---

## 📝 Summary Table

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend Framework | React 18 + TypeScript | UI Layer |
| Bundler | Vite | Fast development |
| UI Library | Shadcn UI + Radix UI | Components |
| Icons | Lucide React | SVG Icons |
| Backend | Express.js | API Server |
| Database | MongoDB | Data Persistence |
| Authentication | Supabase Auth | User Auth |
| Real-time | Supabase Realtime | Live Updates |
| Form Handling | React Hook Form | Form State |
| HTTP Client | React Query | Data Fetching |
| Testing | Vitest | Unit Testing |
| Styling | Tailwind CSS | CSS Framework |

---

**Analysis completed**: All pages, components, buttons, clickable elements, backend routes, database models, and functionality have been documented.
