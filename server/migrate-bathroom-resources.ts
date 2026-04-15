import { pool } from "../db/index";

export async function migrateBathroomResources() {
  const client = await pool.connect();
  try {
    console.log("[migration] Checking for bathroom remodel resources...");

    // Check if resources already exist to avoid duplicates
    const existing = await client.query(
      `SELECT title FROM team_resources WHERE title LIKE 'Bathroom%' OR title LIKE 'Contractor Scope%'`
    );

    if (existing.rows.length >= 4) {
      console.log("[migration] Bathroom resources already exist, skipping.");
      return;
    }

    const resources = [
      {
        title: "Bathroom Remodel Checklist - Guilford CT",
        category: "sop",
        description:
          "Tailored project checklist for full gut renovation covering permits, planning, demolition, rough-in, finishing, and final inspection. Guilford, CT specific.",
        file_name: "bathroom-remodel-checklist.pdf",
        file_url: "/resources/bathroom-remodel-checklist.pdf",
        uploaded_by_user_name: "Ed Bermudez",
      },
      {
        title: "Contractor Scope of Work - Bathroom Gut Renovation",
        category: "sop",
        description:
          "Formal scope of work for bathroom gut renovation — demolition, plumbing, electrical, waterproofing, tile, fixtures, and all finish work. Guilford, CT.",
        file_name: "bathroom-scope-of-work.pdf",
        file_url: "/resources/bathroom-scope-of-work.pdf",
        uploaded_by_user_name: "Ed Bermudez",
      },
      {
        title: "Bathroom Remodel Instructions",
        category: "sop",
        description:
          "Internal instructions covering site assessment, measurements, trade scheduling, design selections, showroom appointments, and contract workflow.",
        file_name: "bathroom-remodel-instructions.pdf",
        file_url: "/resources/bathroom-remodel-instructions.pdf",
        uploaded_by_user_name: "Ed Bermudez",
      },
      {
        title: "Bathroom Remodel Permit Checklist - Guilford CT",
        category: "sop",
        description:
          "Guilford, CT permit checklist — required permits, application submission, inspections, and project completion requirements. Building Department contact info included.",
        file_name: "bathroom-permit-checklist.pdf",
        file_url: "/resources/bathroom-permit-checklist.pdf",
        uploaded_by_user_name: "Ed Bermudez",
      },
    ];

    for (const r of resources) {
      // Check if this specific resource already exists
      const check = await client.query(
        `SELECT id FROM team_resources WHERE title = $1`,
        [r.title]
      );
      if (check.rows.length > 0) {
        console.log(`[migration] Resource "${r.title}" already exists, skipping.`);
        continue;
      }

      await client.query(
        `INSERT INTO team_resources (title, category, description, file_name, file_url, uploaded_by_user_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [r.title, r.category, r.description, r.file_name, r.file_url, r.uploaded_by_user_name]
      );
      console.log(`[migration] Added resource: "${r.title}"`);
    }

    console.log("[migration] Bathroom resources migration complete.");
  } catch (err) {
    console.error("[migration] Error migrating bathroom resources:", err);
  } finally {
    client.release();
  }
}
