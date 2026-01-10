import { db } from "../db/index";
import { projectTemplates, phaseTemplates, taskTemplates } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedDefaultTemplate() {
  // Check if template already exists
  const existing = await db.select().from(projectTemplates).where(eq(projectTemplates.name, "General Renovation"));
  if (existing.length > 0) {
    console.log("Default template already exists, skipping seed");
    return existing[0];
  }

  console.log("Creating default 'General Renovation' template...");

  // Create the template
  const [template] = await db.insert(projectTemplates).values({
    name: "General Renovation",
    description: "A comprehensive template for tile renovation projects including consultation, design, ordering, installation, and completion phases.",
    is_active: "yes",
  }).returning();

  // Phase 1: Initial Consultation
  const [phase1] = await db.insert(phaseTemplates).values({
    project_template_id: template.id,
    name: "Initial Consultation",
    description: "Meet with client to understand project requirements and scope",
    display_order: 1,
    client_visible: "yes",
    requires_approval: "no",
  }).returning();

  await db.insert(taskTemplates).values([
    { phase_template_id: phase1.id, name: "Site visit", description: "Visit the project site to assess conditions", display_order: 1, client_visible: "yes", requires_approval: "no" },
    { phase_template_id: phase1.id, name: "Take measurements", description: "Document all relevant measurements", display_order: 2, client_visible: "yes", requires_approval: "no" },
    { phase_template_id: phase1.id, name: "Prepare quote", description: "Create detailed cost estimate for client", display_order: 3, client_visible: "yes", requires_approval: "no" },
  ]);

  // Phase 2: Design & Selection
  const [phase2] = await db.insert(phaseTemplates).values({
    project_template_id: template.id,
    name: "Design & Selection",
    description: "Work with client to finalize design and material selections",
    display_order: 2,
    client_visible: "yes",
    requires_approval: "yes",
  }).returning();

  await db.insert(taskTemplates).values([
    { phase_template_id: phase2.id, name: "Material selection", description: "Help client choose tiles, grout, and accessories", display_order: 1, client_visible: "yes", requires_approval: "no" },
    { phase_template_id: phase2.id, name: "Design review", description: "Review layout and design with client", display_order: 2, client_visible: "yes", requires_approval: "no" },
    { phase_template_id: phase2.id, name: "Client approval", description: "Get final sign-off on design and materials", display_order: 3, client_visible: "yes", requires_approval: "yes" },
  ]);

  // Phase 3: Ordering
  const [phase3] = await db.insert(phaseTemplates).values({
    project_template_id: template.id,
    name: "Ordering",
    description: "Order materials and coordinate deliveries",
    display_order: 3,
    client_visible: "yes",
    requires_approval: "no",
  }).returning();

  await db.insert(taskTemplates).values([
    { phase_template_id: phase3.id, name: "Place orders", description: "Submit orders for all materials", display_order: 1, client_visible: "yes", requires_approval: "no" },
    { phase_template_id: phase3.id, name: "Track shipments", description: "Monitor delivery status of all orders", display_order: 2, client_visible: "yes", requires_approval: "no" },
    { phase_template_id: phase3.id, name: "Confirm delivery", description: "Verify all materials received and inspect for damage", display_order: 3, client_visible: "yes", requires_approval: "no" },
  ]);

  // Phase 4: Installation
  const [phase4] = await db.insert(phaseTemplates).values({
    project_template_id: template.id,
    name: "Installation",
    description: "Execute the tile installation work",
    display_order: 4,
    client_visible: "yes",
    requires_approval: "no",
  }).returning();

  await db.insert(taskTemplates).values([
    { phase_template_id: phase4.id, name: "Prep work", description: "Prepare surfaces and work area", display_order: 1, client_visible: "yes", requires_approval: "no" },
    { phase_template_id: phase4.id, name: "Tile installation", description: "Install tiles according to design", display_order: 2, client_visible: "yes", requires_approval: "no" },
    { phase_template_id: phase4.id, name: "Grouting", description: "Apply grout and sealant", display_order: 3, client_visible: "yes", requires_approval: "no" },
    { phase_template_id: phase4.id, name: "Quality check", description: "Inspect work for any issues", display_order: 4, client_visible: "no", requires_approval: "no" },
  ]);

  // Phase 5: Completion
  const [phase5] = await db.insert(phaseTemplates).values({
    project_template_id: template.id,
    name: "Completion",
    description: "Final inspection and project handoff",
    display_order: 5,
    client_visible: "yes",
    requires_approval: "yes",
  }).returning();

  await db.insert(taskTemplates).values([
    { phase_template_id: phase5.id, name: "Final cleanup", description: "Clean work area and remove debris", display_order: 1, client_visible: "yes", requires_approval: "no" },
    { phase_template_id: phase5.id, name: "Final walkthrough", description: "Walk through completed work with client", display_order: 2, client_visible: "yes", requires_approval: "no" },
    { phase_template_id: phase5.id, name: "Client sign-off", description: "Get final approval and project acceptance", display_order: 3, client_visible: "yes", requires_approval: "yes" },
  ]);

  console.log(`Created template "${template.name}" with 5 phases`);
  return template;
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedDefaultTemplate()
    .then(() => {
      console.log("Seed completed");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
