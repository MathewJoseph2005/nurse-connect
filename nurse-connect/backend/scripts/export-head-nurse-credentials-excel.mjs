import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const headNurseData = [
  { department: "Dermatology & Cosmetology", name: "Head Nurse 1", email: "headnurse1@caritas.local" },
  { department: "Caritas Heart Institute", name: "Head Nurse 2", email: "headnurse2@caritas.local" },
  { department: "Caritas Cancer Institute", name: "Head Nurse - Caritas Cancer Institute", email: "hn_caritascancerinstitute@caritas.local" },
  { department: "Critical Care Medicine", name: "Head Nurse - Critical Care Medicine", email: "hn_criticalcaremedicine@caritas.local" },
  { department: "Obstetrics & Gynaecology", name: "Head Nurse - Obstetrics & Gynaecology", email: "hn_obstetricsgynaecology@caritas.local" },
  { department: "Rheumatology", name: "Head Nurse - Rheumatology", email: "hn_rheumatology@caritas.local" },
  { department: "Emergency Medicine & Trauma Care", name: "Head Nurse - Emergency Medicine & Trauma Care", email: "hn_emergencymedicinetraumacare@caritas.local" },
  { department: "Orthopaedics & Joint Replacement", name: "Head Nurse - Orthopaedics & Joint Replacement", email: "hn_orthopaedicsjointreplacement@caritas.local" },
  { department: "General Medicine", name: "Head Nurse - General Medicine", email: "hn_generalmedicine@caritas.local" },
  { department: "Nephrology & Renal Transplant", name: "Head Nurse - Nephrology & Renal Transplant", email: "hn_nephrologyrenaltransplant@caritas.local" },
  { department: "Caritas Neuro Sciences", name: "Head Nurse - Caritas Neuro Sciences", email: "hn_caritasneurosciences@caritas.local" },
  { department: "Paediatrics & Paediatric Surgery", name: "Head Nurse - Paediatrics & Paediatric Surgery", email: "hn_paediatricspaediatricsurgery@caritas.local" },
  { department: "Gastro Sciences", name: "Head Nurse - Gastro Sciences", email: "hn_gastrosciences@caritas.local" },
  { department: "Physical Medicine & Rehabilitation", name: "Head Nurse - Physical Medicine & Rehabilitation", email: "hn_physicalmedicinerehabilitation@caritas.local" },
  { department: "General Surgery", name: "Head Nurse - General Surgery", email: "hn_generalsurgery@caritas.local" },
  { department: "Urology", name: "Head Nurse - Urology", email: "hn_urology@caritas.local" },
];

async function exportHeadNurseCredentials() {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Head Nurses");

    // Add headers
    worksheet.columns = [
      { header: "Department", key: "department", width: 35 },
      { header: "Name", key: "name", width: 45 },
      { header: "Login Email", key: "email", width: 40 },
      { header: "Password", key: "password", width: 20 },
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" },
    };
    worksheet.getRow(1).alignment = { horizontal: "center", vertical: "center" };

    // Add data rows
    headNurseData.forEach((hn) => {
      worksheet.addRow({
        department: hn.department,
        name: hn.name,
        email: hn.email,
        password: "headnurse@123456",
      });
    });

    // Center align email and password columns
    for (let i = 2; i <= headNurseData.length + 1; i++) {
      worksheet.getRow(i).getCell("D").alignment = { horizontal: "center" };
    }

    // Add a note sheet
    const noteSheet = workbook.addWorksheet("Notes");
    noteSheet.columns = [{ header: "Information", key: "info", width: 100 }];
    noteSheet.addRow({
      info: "All Head Nurse accounts use the default password: headnurse@123456",
    });
    noteSheet.addRow({
      info: "Email format: headnurse[number]@caritas.local or hn_[department]@caritas.local",
    });
    noteSheet.addRow({
      info: "For support, contact the administrator",
    });

    // Save file
    const outputPath = path.resolve(__dirname, "../../head-nurse-credentials.xlsx");
    await workbook.xlsx.writeFile(outputPath);
    console.log(`✅ Head Nurse credentials exported to: ${outputPath}`);
  } catch (error) {
    console.error("❌ Error exporting credentials:", error.message);
    process.exit(1);
  }
}

exportHeadNurseCredentials();
