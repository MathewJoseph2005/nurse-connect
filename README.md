# Nurse Connect 🏥

Nurse Connect is a premium, high-fidelity staff management and scheduling platform designed specifically for modern healthcare environments like **Caritas Hospital**. It streamlines the complex workflows of nurse scheduling, shift swaps, and departmental oversight through a beautiful, intuitive interface.

## 🌟 Key Features

### 👨‍💼 Role-Based Dashboards
*   **Administrator**: Complete oversight of all staff, departments, and system-wide schedules.
*   **Head Nurse**: Manage specific departmental teams, approve/reject shift swap requests, and generate automated schedules.
*   **Nurse**: View personal schedules, request shift swaps with eligible peers, and manage professional profiles.

### 📅 Smart Scheduling & Acuity
*   **Acuity-Based Logic**: Schedules are generated considering the Acuity (Division) of nurses to ensure balanced skill distribution across shifts.
*   **Departmental Grouping**: Automated organization of staff by department for clearer administrative visibility.

### 🔄 Intelligent Shift Swaps
*   **Peer-to-Peer Requests**: Nurses can request swaps directly with eligible colleagues (same department and acuity).
*   **Approval Workflow**: Seamless transition from nurse acceptance to Head Nurse final approval.

### 🔔 Robust Notification System
*   **Real-time Alerts**: Instant notifications for schedule publications and swap status updates.
*   **Duty Reminders**: Smart reminders triggered at exactly 12 hours, 3 hours, and at the start of a shift.
*   **Interactive Inbox**: Directly navigate to relevant actions from the notification center.

---

## 🚀 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [MongoDB](https://www.mongodb.com/) (Local or Atlas instance)
*   [Supabase Account](https://supabase.com/) (For Authentication and Storage)

### ⚙️ Environment Configuration

Create a `.env` file in the **root** directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:4000/api
```

Create a `.env` file in the **backend** directory:
```env
MONGODB_URI_DIRECT=your_mongodb_connection_string
PORT=4000
JWT_SECRET=your_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
```

### 🛠️ Installation & Running

1.  **Clone the repository**
    ```sh
    git clone https://github.com/MathewJoseph2005/nurse-connect.git
    cd nurse-connect
    ```

2.  **Install Dependencies**
    ```sh
    npm install
    npm run backend:install
    ```

3.  **Start Development Servers**
    *   **Frontend**: `npm run dev` (Runs on http://localhost:8080)
    *   **Backend**: `npm run backend:dev` (Runs on http://localhost:4000)

---

## 🛠️ Technology Stack

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI, Lucide Icons.
*   **Backend**: Node.js, Express, Mongoose.
*   **Database**: MongoDB (Primary Data), Supabase (Auth, Storage & Data Shim).
*   **State Management**: React Query (TanStack Query).

## 📂 Project Structure

*   `src/`: React frontend source code, including components, pages, and hooks.
*   `backend/`: Node.js Express server, Mongoose models, and business logic.
*   `supabase/`: Database migrations and configuration.

---

Designed with ❤️ for **Caritas Hospital**.
