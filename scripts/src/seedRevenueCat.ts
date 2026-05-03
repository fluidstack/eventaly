import {
  attachProductsToEntitlement,
  attachProductsToPackage,
  createApp,
  createEntitlement,
  createOffering,
  createPackages,
  createProduct,
  listAppPublicApiKeys,
  listApps,
  listEntitlements,
  listOfferings,
  listPackages,
  listProducts,
  listProjects,
  updateOffering,
  type App,
  type CreateProductData,
  type Entitlement,
  type Offering,
  type Package,
  type Product,
  type Project,
} from "@replit/revenuecat-sdk";

import { getUncachableRevenueCatClient } from "./revenueCatClient";

const PROJECT_NAME = "Invitely";
const APP_STORE_APP_NAME = "Invitely iOS";
const APP_STORE_BUNDLE_ID = "app.invitely.ios";
const PLAY_STORE_APP_NAME = "Invitely Android";
const PLAY_STORE_PACKAGE_NAME = "app.invitely.android";

type Duration = "P1W" | "P1M" | "P2M" | "P3M" | "P6M" | "P1Y";

type Plan = {
  productId: string;
  playStoreProductId: string;
  displayName: string;
  title: string;
  duration: Duration;
  entitlement: string;
  packageIdentifier: string;
  packageDisplayName: string;
};

const ENTITLEMENT_HOST_PLUS = "host_plus";
const ENTITLEMENT_EVENT_PRO = "event_pro";

const PLANS: Plan[] = [
  {
    productId: "invitely_event_pro",
    playStoreProductId: "invitely_event_pro:monthly",
    displayName: "Event Pro",
    title: "Event Pro",
    duration: "P1M",
    entitlement: ENTITLEMENT_EVENT_PRO,
    packageIdentifier: "event_pro",
    packageDisplayName: "Event Pro — one event",
  },
  {
    productId: "invitely_host_plus_monthly",
    playStoreProductId: "invitely_host_plus_monthly:monthly",
    displayName: "Host Plus Monthly",
    title: "Host Plus Monthly",
    duration: "P1M",
    entitlement: ENTITLEMENT_HOST_PLUS,
    packageIdentifier: "$rc_monthly",
    packageDisplayName: "Host Plus — Monthly",
  },
  {
    productId: "invitely_host_plus_yearly",
    playStoreProductId: "invitely_host_plus_yearly:yearly",
    displayName: "Host Plus Yearly",
    title: "Host Plus Yearly",
    duration: "P1Y",
    entitlement: ENTITLEMENT_HOST_PLUS,
    packageIdentifier: "$rc_annual",
    packageDisplayName: "Host Plus — Yearly",
  },
];

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Invitely Plans";

async function ensureProject(client: Awaited<ReturnType<typeof getUncachableRevenueCatClient>>): Promise<Project> {
  const { data, error } = await listProjects({ client, query: { limit: 50 } });
  if (error) throw new Error("Failed to list projects: " + JSON.stringify(error));
  if (!data?.items?.length) throw new Error("No project provisioned by connector");
  console.log("Using project:", data.items[0].id);
  return data.items[0];
}

async function ensureApps(
  client: Awaited<ReturnType<typeof getUncachableRevenueCatClient>>,
  projectId: string,
): Promise<{ appStoreApp: App; playStoreApp: App }> {
  const { data, error } = await listApps({
    client,
    path: { project_id: projectId },
    query: { limit: 50 },
  });
  if (error || !data) throw new Error("Failed to list apps");

  let appStoreApp = data.items.find((a) => a.type === "app_store");
  if (!appStoreApp) {
    const { data: created, error: cErr } = await createApp({
      client,
      path: { project_id: projectId },
      body: {
        name: APP_STORE_APP_NAME,
        type: "app_store",
        app_store: { bundle_id: APP_STORE_BUNDLE_ID },
      },
    });
    if (cErr || !created) throw new Error("Failed to create App Store app: " + JSON.stringify(cErr));
    appStoreApp = created;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app:", appStoreApp.id);
  }

  let playStoreApp = data.items.find((a) => a.type === "play_store");
  if (!playStoreApp) {
    const { data: created, error: cErr } = await createApp({
      client,
      path: { project_id: projectId },
      body: {
        name: PLAY_STORE_APP_NAME,
        type: "play_store",
        play_store: { package_name: PLAY_STORE_PACKAGE_NAME },
      },
    });
    if (cErr || !created) throw new Error("Failed to create Play Store app: " + JSON.stringify(cErr));
    playStoreApp = created;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app:", playStoreApp.id);
  }

  return { appStoreApp, playStoreApp };
}

async function ensureProduct(
  client: Awaited<ReturnType<typeof getUncachableRevenueCatClient>>,
  projectId: string,
  app: App,
  storeId: string,
  plan: Plan,
  existing: Product[],
): Promise<Product> {
  const found = existing.find(
    (p) => p.store_identifier === storeId && p.app_id === app.id,
  );
  if (found) {
    console.log(`Product ${storeId} on ${app.type} exists:`, found.id);
    return found;
  }
  const body: CreateProductData["body"] = {
    store_identifier: storeId,
    app_id: app.id,
    type: "subscription",
    display_name: plan.displayName,
  };
  const { data, error } = await createProduct({
    client,
    path: { project_id: projectId },
    body,
  });
  if (error || !data) {
    throw new Error(`Failed to create product ${storeId} on ${app.type}: ${JSON.stringify(error)}`);
  }
  console.log(`Created product ${storeId} on ${app.type}:`, data.id);
  return data;
}

async function ensureEntitlement(
  client: Awaited<ReturnType<typeof getUncachableRevenueCatClient>>,
  projectId: string,
  lookupKey: string,
  displayName: string,
  existing: Entitlement[],
): Promise<Entitlement> {
  const found = existing.find((e) => e.lookup_key === lookupKey);
  if (found) {
    console.log(`Entitlement ${lookupKey} exists:`, found.id);
    return found;
  }
  const { data, error } = await createEntitlement({
    client,
    path: { project_id: projectId },
    body: { lookup_key: lookupKey, display_name: displayName },
  });
  if (error || !data) throw new Error(`Failed to create entitlement ${lookupKey}: ` + JSON.stringify(error));
  console.log(`Created entitlement ${lookupKey}:`, data.id);
  return data;
}

async function attachProducts(
  client: Awaited<ReturnType<typeof getUncachableRevenueCatClient>>,
  projectId: string,
  entitlementId: string,
  productIds: string[],
) {
  if (!productIds.length) return;
  const { error } = await attachProductsToEntitlement({
    client,
    path: { project_id: projectId, entitlement_id: entitlementId },
    body: { product_ids: productIds },
  });
  if (error) {
    console.log("attachProducts warning:", JSON.stringify(error));
  }
}

async function ensureOffering(
  client: Awaited<ReturnType<typeof getUncachableRevenueCatClient>>,
  projectId: string,
): Promise<Offering> {
  const { data, error } = await listOfferings({
    client,
    path: { project_id: projectId },
    query: { limit: 50 },
  });
  if (error) throw new Error("Failed to list offerings");
  let offering = data.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (!offering) {
    const { data: created, error: cErr } = await createOffering({
      client,
      path: { project_id: projectId },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (cErr || !created) throw new Error("Failed to create offering: " + JSON.stringify(cErr));
    console.log("Created offering:", created.id);
    offering = created;
  } else {
    console.log("Offering exists:", offering.id);
  }
  if (!offering.is_current) {
    const { error: uErr } = await updateOffering({
      client,
      path: { project_id: projectId, offering_id: offering.id },
      body: { is_current: true },
    });
    if (uErr) console.log("Could not mark current:", JSON.stringify(uErr));
    else console.log("Marked offering current");
  }
  return offering;
}

async function ensurePackage(
  client: Awaited<ReturnType<typeof getUncachableRevenueCatClient>>,
  projectId: string,
  offeringId: string,
  plan: Plan,
  existing: Package[],
): Promise<Package> {
  const found = existing.find((p) => p.lookup_key === plan.packageIdentifier);
  if (found) {
    console.log(`Package ${plan.packageIdentifier} exists:`, found.id);
    return found;
  }
  const { data, error } = await createPackages({
    client,
    path: { project_id: projectId, offering_id: offeringId },
    body: {
      lookup_key: plan.packageIdentifier,
      display_name: plan.packageDisplayName,
    },
  });
  if (error || !data) throw new Error(`Failed to create package ${plan.packageIdentifier}: ` + JSON.stringify(error));
  console.log(`Created package ${plan.packageIdentifier}:`, data.id);
  return data;
}

async function attachToPackage(
  client: Awaited<ReturnType<typeof getUncachableRevenueCatClient>>,
  projectId: string,
  packageId: string,
  productIds: string[],
) {
  if (!productIds.length) return;
  const { error } = await attachProductsToPackage({
    client,
    path: { project_id: projectId, package_id: packageId },
    body: {
      products: productIds.map((id) => ({
        product_id: id,
        eligibility_criteria: "all",
      })),
    },
  });
  if (error) {
    console.log("attachToPackage warning:", JSON.stringify(error));
  }
}

async function seed() {
  const client = await getUncachableRevenueCatClient();
  const project = await ensureProject(client);
  const { appStoreApp, playStoreApp } = await ensureApps(client, project.id);

  const { data: existingProducts } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 200 },
  });
  const { data: existingEntitlements } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 50 },
  });

  const entitlementToProductIds: Record<string, string[]> = {
    [ENTITLEMENT_EVENT_PRO]: [],
    [ENTITLEMENT_HOST_PLUS]: [],
  };
  const planAppleProductIds: Record<string, string> = {};

  for (const plan of PLANS) {
    const aProd = await ensureProduct(
      client,
      project.id,
      appStoreApp,
      plan.productId,
      plan,
      existingProducts?.items ?? [],
    );
    const pProd = await ensureProduct(
      client,
      project.id,
      playStoreApp,
      plan.playStoreProductId,
      plan,
      existingProducts?.items ?? [],
    );
    planAppleProductIds[plan.packageIdentifier] = aProd.id;
    entitlementToProductIds[plan.entitlement].push(aProd.id, pProd.id);
    if (plan.entitlement === ENTITLEMENT_HOST_PLUS) {
      entitlementToProductIds[ENTITLEMENT_EVENT_PRO].push(aProd.id, pProd.id);
    }
  }

  const eventProEnt = await ensureEntitlement(
    client,
    project.id,
    ENTITLEMENT_EVENT_PRO,
    "Event Pro Access",
    existingEntitlements?.items ?? [],
  );
  const hostPlusEnt = await ensureEntitlement(
    client,
    project.id,
    ENTITLEMENT_HOST_PLUS,
    "Host Plus Access",
    existingEntitlements?.items ?? [],
  );

  await attachProducts(client, project.id, eventProEnt.id, entitlementToProductIds[ENTITLEMENT_EVENT_PRO]);
  await attachProducts(client, project.id, hostPlusEnt.id, entitlementToProductIds[ENTITLEMENT_HOST_PLUS]);

  const offering = await ensureOffering(client, project.id);
  const { data: existingPackages } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 50 },
  });
  for (const plan of PLANS) {
    const pkg = await ensurePackage(
      client,
      project.id,
      offering.id,
      plan,
      existingPackages?.items ?? [],
    );
    const aProdId = planAppleProductIds[plan.packageIdentifier];
    if (aProdId) {
      await attachToPackage(client, project.id, pkg.id, [aProdId]);
    }
  }

  const [{ data: appKeys }, { data: playKeys }] = await Promise.all([
    listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: appStoreApp.id } }),
    listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: playStoreApp.id } }),
  ]);

  console.log("\n========================================");
  console.log("RevenueCat seed complete!");
  console.log("REVENUECAT_PROJECT_ID =", project.id);
  console.log("REVENUECAT_APPLE_APP_STORE_APP_ID =", appStoreApp.id);
  console.log("REVENUECAT_GOOGLE_PLAY_STORE_APP_ID =", playStoreApp.id);
  console.log(
    "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY =",
    appKeys?.items.map((k) => k.key).join(", ") ?? "N/A",
  );
  console.log(
    "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY =",
    playKeys?.items.map((k) => k.key).join(", ") ?? "N/A",
  );
  console.log("========================================\n");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
