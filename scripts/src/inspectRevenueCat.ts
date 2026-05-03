import { listApps, listProjects } from "@replit/revenuecat-sdk";
import { getUncachableRevenueCatClient } from "./revenueCatClient";

const client = await getUncachableRevenueCatClient();
const { data: projects } = await listProjects({ client, query: { limit: 50 } });
console.log("PROJECTS:", JSON.stringify(projects, null, 2));
for (const p of projects?.items ?? []) {
  const { data: apps } = await listApps({
    client,
    path: { project_id: p.id },
    query: { limit: 50 },
  });
  console.log(`APPS for ${p.id}:`, JSON.stringify(apps, null, 2));
}
