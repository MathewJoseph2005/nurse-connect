# NurseFlow Connect Backend (Node + Express + MongoDB)

## 1. Configure environment

Copy `.env.example` to `.env` in this folder and fill values:

- `PORT`
- `MONGODB_URI`
- `MONGODB_URI_DIRECT` (optional fallback)
- `MONGODB_PREFER_DIRECT` (optional)
- `JWT_SECRET`
- `CORS_ORIGIN`

### MongoDB Atlas checklist

Before running the backend, create these in Atlas:

1. Database user: username + password
2. Cluster host (from "Connect" > "Drivers")
3. Database name (for this app, e.g. `nurseflow_connect`)
4. Network Access allowlist (your current IP, or `0.0.0.0/0` for testing)

Put them into `.env` as:

```env
MONGODB_URI=mongodb+srv://<db_username>:<db_password>@<cluster-host>/<db_name>?retryWrites=true&w=majority&appName=nurseflow-connect
```

If you get `querySrv ECONNREFUSED` on startup, your network/DNS is likely blocking SRV lookups.
In that case, use Atlas "Standard connection string" and set:

```env
MONGODB_URI_DIRECT=mongodb://<db_username>:<db_password>@<host1>:27017,<host2>:27017,<host3>:27017/<db_name>?replicaSet=<replica-set>&ssl=true&authSource=admin
```

To avoid SRV DNS errors on startup in restricted networks, set:

```env
MONGODB_PREFER_DIRECT=true
```

When `MONGODB_PREFER_DIRECT=true`, backend tries `MONGODB_URI_DIRECT` first.
Otherwise it tries `MONGODB_URI` first.

## 2. Install dependencies

From repository root:

```bash
npm run backend:install
```

## 3. Start backend

From repository root:

```bash
npm run backend:dev
```

## 4. Bootstrap first admin (one-time)

Send a POST request to:

`POST /api/auth/bootstrap-admin`

Body:

```json
{
  "email": "admin@admin.local",
  "password": "StrongPassword123",
  "name": "System Admin",
  "username": "admin"
}
```

After the first admin exists, this endpoint is disabled.
