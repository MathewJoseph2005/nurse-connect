/**
 * export-credentials-pdf.mjs
 *
 * Generates a beautifully formatted HTML file of all system credentials
 * (Admins, Head Nurses, Nurses) which can be opened in any browser and
 * printed / saved as a PDF with Ctrl+P → Save as PDF.
 *
 * Run with:
 *   node scripts/export-credentials-pdf.mjs
 *
 * Output:  backend/credentials-report.html
 *
 * Passwords shown use the known seed defaults:
 *   Admin      → admin@123456
 *   Head Nurse → headnurse@123456
 *   Nurse      → nurse@123456
 * (Real hashes are never exposed.)
 */

import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Connection ────────────────────────────────────────────────────────────────
const preferDirect = process.env.MONGODB_PREFER_DIRECT === "true";
const MONGO_URI =
  (preferDirect && process.env.MONGODB_URI_DIRECT) || process.env.MONGODB_URI;
if (!MONGO_URI) throw new Error("No MONGODB_URI in backend/.env");

// ── Schemas ───────────────────────────────────────────────────────────────────
const opts = { strict: false };
const User       = mongoose.model("User",       new mongoose.Schema({ email: String, role: String, name: String, username: String }, opts), "users");
const Admin      = mongoose.model("Admin",      new mongoose.Schema({ user_id: mongoose.Schema.Types.ObjectId, name: String, username: String }, opts), "admins");
const HeadNurse  = mongoose.model("HeadNurse",  new mongoose.Schema({ user_id: mongoose.Schema.Types.ObjectId, name: String, username: String, department_id: mongoose.Schema.Types.ObjectId }, opts), "head_nurses");
const Nurse      = mongoose.model("Nurse",      new mongoose.Schema({ user_id: mongoose.Schema.Types.ObjectId, name: String, phone: String, current_department_id: mongoose.Schema.Types.ObjectId, division_id: mongoose.Schema.Types.ObjectId, experience_years: Number, exam_score_percentage: Number, is_active: Boolean }, opts), "nurses");
const Department = mongoose.model("Department", new mongoose.Schema({ name: String }, opts), "departments");
const Division   = mongoose.model("Division",   new mongoose.Schema({ name: String, acuity_level: Number }, opts), "divisions");

// ── HTML helpers ──────────────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function badge(text, color) {
  return `<span class="badge badge-${color}">${esc(text)}</span>`;
}

function sectionHeader(title, icon, count, color) {
  return `
  <div class="section-header section-${color}">
    <div class="section-icon">${icon}</div>
    <div>
      <h2>${esc(title)}</h2>
      <p>${count} record${count !== 1 ? "s" : ""}</p>
    </div>
  </div>`;
}

function credRow(cells) {
  return `<tr>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Load lookup maps
  const depts   = await Department.find().lean();
  const deptMap = Object.fromEntries(depts.map(d => [String(d._id), d.name]));

  const divs   = await Division.find().lean();
  const divMap = Object.fromEntries(divs.map(d => [String(d._id), d.name]));

  const users   = await User.find().lean();
  const userMap = Object.fromEntries(users.map(u => [String(u._id), u]));

  // ── Admins ────────────────────────────────────────────────────────────────
  const admins = await Admin.find().lean();
  const adminRows = admins.map(a => {
    const u = userMap[String(a.user_id)] || {};
    return credRow([
      `<strong>${esc(a.name)}</strong>`,
      esc(u.username || a.username || "—"),
      esc(u.email || "—"),
      `<code>admin@123456</code>`,
      badge("Admin", "red"),
    ]);
  });

  // ── Head Nurses ───────────────────────────────────────────────────────────
  const headNurses = await HeadNurse.find().lean();
  const hnRows = headNurses.map(hn => {
    const u    = userMap[String(hn.user_id)] || {};
    const dept = deptMap[String(hn.department_id)] || "Unassigned";
    return credRow([
      `<strong>${esc(hn.name)}</strong>`,
      esc(u.username || hn.username || "—"),
      esc(u.email || "—"),
      `<code>headnurse@123456</code>`,
      esc(dept),
    ]);
  });

  // ── Nurses ────────────────────────────────────────────────────────────────
  const nurses = await Nurse.find({ is_active: true }).sort({ name: 1 }).lean();
  const nurseRows = nurses.map(n => {
    const u    = n.user_id ? (userMap[String(n.user_id)] || {}) : {};
    const dept = deptMap[String(n.current_department_id)] || "Unassigned";
    const div  = divMap[String(n.division_id)] || "—";
    const email = u.email || "(no login)";
    const password = u.email ? `<code>nurse@123456</code>` : `<span class="muted">no account</span>`;
    return credRow([
      `<strong>${esc(n.name)}</strong>`,
      esc(n.phone || "—"),
      esc(email),
      password,
      esc(dept),
      badge(div, div.includes("1") ? "green" : div.includes("2") ? "blue" : div.includes("3") ? "amber" : div.includes("4") ? "red" : "gray"),
      esc(n.experience_years ?? 0) + " yr",
    ]);
  });

  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  // ── HTML template ─────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Caritas Hospital — Staff Credentials Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --primary:   #6d28d9;
      --primary-l: #ede9fe;
      --red:       #dc2626;
      --red-l:     #fee2e2;
      --blue:      #2563eb;
      --blue-l:    #dbeafe;
      --green:     #16a34a;
      --green-l:   #dcfce7;
      --amber:     #d97706;
      --amber-l:   #fef3c7;
      --gray:      #64748b;
      --gray-l:    #f1f5f9;
      --border:    #e2e8f0;
      --text:      #0f172a;
      --muted:     #64748b;
    }

    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #f8fafc;
      color: var(--text);
      font-size: 13px;
      line-height: 1.5;
    }

    /* ── Cover header ── */
    .cover {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
      color: white;
      padding: 48px 40px 40px;
      margin-bottom: 32px;
    }
    .cover-logo {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .cover-logo-icon {
      width: 56px; height: 56px;
      background: rgba(255,255,255,0.15);
      border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px;
    }
    .cover h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .cover .subtitle { font-size: 14px; opacity: 0.75; margin-top: 4px; }
    .cover-meta {
      display: flex; gap: 32px; flex-wrap: wrap;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid rgba(255,255,255,0.15);
    }
    .cover-stat { text-align: center; }
    .cover-stat .num { font-size: 32px; font-weight: 700; }
    .cover-stat .lbl { font-size: 11px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; }
    .cover-ts { margin-top: 16px; font-size: 11px; opacity: 0.55; }

    /* ── Warning banner ── */
    .warning {
      margin: 0 32px 24px;
      background: #fef3c7;
      border: 1px solid #fbbf24;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
      color: #92400e;
    }

    /* ── Sections ── */
    .section { margin: 0 32px 36px; }

    .section-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border-radius: 12px 12px 0 0;
      color: white;
    }
    .section-red   { background: linear-gradient(90deg, #dc2626, #b91c1c); }
    .section-indigo { background: linear-gradient(90deg, #6d28d9, #5b21b6); }
    .section-teal  { background: linear-gradient(90deg, #0d9488, #0f766e); }

    .section-icon { font-size: 28px; }
    .section-header h2 { font-size: 18px; font-weight: 700; }
    .section-header p  { font-size: 12px; opacity: 0.8; }

    /* ── Tables ── */
    .table-wrap {
      border-radius: 0 0 12px 12px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }
    thead tr { background: #f8fafc; }
    thead th {
      padding: 10px 14px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
    }
    tbody tr:nth-child(even) { background: #fafafa; }
    tbody tr:hover { background: #f0f4ff; }
    td {
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: var(--text);
      vertical-align: middle;
    }
    tbody tr:last-child td { border-bottom: none; }

    code {
      font-family: 'JetBrains Mono', monospace;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 11.5px;
      color: #7c3aed;
    }

    .muted { color: var(--muted); font-style: italic; }

    /* ── Badges ── */
    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }
    .badge-red    { background: var(--red-l);   color: var(--red); }
    .badge-blue   { background: var(--blue-l);  color: var(--blue); }
    .badge-green  { background: var(--green-l); color: var(--green); }
    .badge-amber  { background: var(--amber-l); color: var(--amber); }
    .badge-gray   { background: var(--gray-l);  color: var(--gray); }

    /* ── Footer ── */
    .footer {
      text-align: center;
      color: var(--muted);
      font-size: 11px;
      padding: 24px 32px 40px;
      border-top: 1px solid var(--border);
      margin-top: 16px;
    }

    /* ── Print ── */
    @media print {
      body { background: white; font-size: 11px; }
      .cover { padding: 24px 20px; margin-bottom: 16px; }
      .section { margin: 0 0 20px; page-break-inside: avoid; }
      .warning { margin: 0 0 12px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <!-- Cover -->
  <div class="cover">
    <div class="cover-logo">
      <div class="cover-logo-icon">🏥</div>
      <div>
        <h1>Caritas Hospital</h1>
        <p class="subtitle">NurseConnect — Staff Credentials Report</p>
      </div>
    </div>
    <div class="cover-meta">
      <div class="cover-stat">
        <div class="num">${admins.length}</div>
        <div class="lbl">Admins</div>
      </div>
      <div class="cover-stat">
        <div class="num">${headNurses.length}</div>
        <div class="lbl">Head Nurses</div>
      </div>
      <div class="cover-stat">
        <div class="num">${nurses.length}</div>
        <div class="lbl">Active Nurses</div>
      </div>
      <div class="cover-stat">
        <div class="num">${depts.length}</div>
        <div class="lbl">Departments</div>
      </div>
    </div>
    <p class="cover-ts">Generated: ${now} IST</p>
  </div>

  <!-- Warning -->
  <div class="warning no-print">
    ⚠️ <strong>Confidential</strong> — This document contains login credentials. Do not share or leave unattended. Print and store securely, or save as PDF and password-protect the file.
  </div>

  <!-- Print button -->
  <div style="text-align:right; margin: 0 32px 20px;" class="no-print">
    <button onclick="window.print()" style="
      background: #6d28d9; color: white; border: none;
      padding: 10px 24px; border-radius: 8px; font-size: 14px;
      font-weight: 600; cursor: pointer; font-family: inherit;
    ">🖨 Print / Save as PDF</button>
  </div>

  <!-- ── Admins ── -->
  <div class="section">
    ${sectionHeader("Administrators", "🛡️", admins.length, "red")}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Password</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          ${adminRows.length > 0 ? adminRows.join("\n") : `<tr><td colspan="5" class="muted" style="text-align:center;padding:24px">No admins found</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── Head Nurses ── -->
  <div class="section">
    ${sectionHeader("Head Nurses", "👩‍⚕️", headNurses.length, "indigo")}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Password</th>
            <th>Department</th>
          </tr>
        </thead>
        <tbody>
          ${hnRows.length > 0 ? hnRows.join("\n") : `<tr><td colspan="5" class="muted" style="text-align:center;padding:24px">No head nurses found</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── Nurses ── -->
  <div class="section">
    ${sectionHeader("Active Nurses", "💊", nurses.length, "teal")}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Password</th>
            <th>Department</th>
            <th>Acuity</th>
            <th>Exp</th>
          </tr>
        </thead>
        <tbody>
          ${nurseRows.length > 0 ? nurseRows.join("\n") : `<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">No active nurses found</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    Caritas Hospital · NurseConnect System · Generated ${now} IST<br/>
    <strong>Default passwords:</strong> &nbsp;Admin → <code>admin@123456</code> &nbsp;|&nbsp; Head Nurse → <code>headnurse@123456</code> &nbsp;|&nbsp; Nurse → <code>nurse@123456</code><br/>
    Staff should be advised to change their passwords on first login.
  </div>

</body>
</html>`;

  const outPath = path.resolve(__dirname, "../credentials-report.html");
  fs.writeFileSync(outPath, html, "utf-8");
  console.log(`\n✅ Report written to: ${outPath}`);
  console.log("   Open it in your browser, then press Ctrl+P → Save as PDF.\n");

  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
