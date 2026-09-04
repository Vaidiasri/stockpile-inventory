/**
 * Idempotent seed: safe to re-run. Run with `npm run db:seed` after
 * `npm run db:migrate`.
 */
import { count } from "drizzle-orm";

import { db } from "./index";
import { categories, inventoryTransactions, products, users } from "./schema";
import { hashPassword } from "@/lib/password";

const CATEGORIES = [
  { name: "Electronics", description: "Devices, components and accessories" },
  { name: "Office Supplies", description: "Stationery and desk essentials" },
  { name: "Furniture", description: "Desks, chairs and storage" },
  { name: "Packaging", description: "Boxes, tape and protective material" },
];

type SeedProduct = {
  name: string;
  sku: string;
  category: string;
  description: string;
  quantity: number;
  unitPrice: string;
  supplierName: string;
  lowStockThreshold?: number;
};

// Quantities deliberately straddle the thresholds so the dashboard shows all
// three stock states without anyone having to edit data first.
const PRODUCTS: SeedProduct[] = [
  { name: "Mechanical Keyboard TKL", sku: "ELEC-KB-001", category: "Electronics", description: "Tenkeyless hot-swap keyboard, brown switches", quantity: 42, unitPrice: "4499.00", supplierName: "Nimbus Peripherals" },
  { name: "27\" 4K IPS Monitor", sku: "ELEC-MON-002", category: "Electronics", description: "27-inch 3840x2160 display, 60Hz, USB-C", quantity: 8, unitPrice: "28999.00", supplierName: "Vertex Displays", lowStockThreshold: 10 },
  { name: "USB-C Docking Station", sku: "ELEC-DOCK-003", category: "Electronics", description: "11-in-1 dock with dual HDMI and PD passthrough", quantity: 0, unitPrice: "7250.50", supplierName: "Vertex Displays" },
  { name: "Wireless Mouse Ergo", sku: "ELEC-MSE-004", category: "Electronics", description: "Vertical ergonomic mouse, 2.4GHz + Bluetooth", quantity: 65, unitPrice: "2199.00", supplierName: "Nimbus Peripherals" },
  { name: "A4 Copier Paper (500 sheets)", sku: "OFF-PAP-001", category: "Office Supplies", description: "80gsm white multipurpose paper", quantity: 320, unitPrice: "289.00", supplierName: "Meridian Stationers", lowStockThreshold: 50 },
  { name: "Gel Pen Pack of 10", sku: "OFF-PEN-002", category: "Office Supplies", description: "0.7mm blue gel pens", quantity: 14, unitPrice: "159.00", supplierName: "Meridian Stationers", lowStockThreshold: 20 },
  { name: "Whiteboard Marker Set", sku: "OFF-MRK-003", category: "Office Supplies", description: "Four assorted colours, chisel tip", quantity: 3, unitPrice: "249.00", supplierName: "Meridian Stationers" },
  { name: "Height-Adjustable Desk", sku: "FURN-DSK-001", category: "Furniture", description: "1400x700mm electric sit-stand desk", quantity: 6, unitPrice: "32999.00", supplierName: "Ironwood Works" },
  { name: "Mesh Task Chair", sku: "FURN-CHR-002", category: "Furniture", description: "Breathable mesh back with lumbar support", quantity: 22, unitPrice: "11499.00", supplierName: "Ironwood Works" },
  { name: "Steel Filing Cabinet", sku: "FURN-CAB-003", category: "Furniture", description: "Three-drawer lockable cabinet", quantity: 0, unitPrice: "8750.00", supplierName: "Ironwood Works" },
  { name: "Corrugated Box Medium", sku: "PKG-BOX-001", category: "Packaging", description: "400x300x300mm double-wall box", quantity: 480, unitPrice: "62.00", supplierName: "Crate & Coil", lowStockThreshold: 100 },
  { name: "Bubble Wrap Roll 50m", sku: "PKG-BUB-002", category: "Packaging", description: "1m x 50m small-bubble roll", quantity: 18, unitPrice: "1340.00", supplierName: "Crate & Coil", lowStockThreshold: 25 },
];

async function main() {
  const [existing] = await db.select({ total: count() }).from(users);
  if (existing.total > 0) {
    console.log("Database already seeded; nothing to do.");
    return;
  }

  const passwordHash = await hashPassword("Password123!");
  const insertedUsers = await db
    .insert(users)
    .values([
      { name: "Avery Stone", email: "admin@stockpile.dev", passwordHash, role: "admin" },
      { name: "Riya Menon", email: "staff@stockpile.dev", passwordHash, role: "staff" },
    ])
    .returning({ id: users.id, role: users.role });

  const admin = insertedUsers.find((u) => u.role === "admin")!;

  const insertedCategories = await db
    .insert(categories)
    .values(CATEGORIES)
    .returning({ id: categories.id, name: categories.name });

  const categoryId = new Map(insertedCategories.map((c) => [c.name, c.id]));

  const insertedProducts = await db
    .insert(products)
    .values(
      PRODUCTS.map(({ category, ...product }) => ({
        ...product,
        categoryId: categoryId.get(category)!,
      })),
    )
    .returning({
      id: products.id,
      sku: products.sku,
      name: products.name,
      quantity: products.quantity,
    });

  // Opening-balance audit rows, so stock history is not empty on first load.
  await db.insert(inventoryTransactions).values(
    insertedProducts
      .filter((product) => product.quantity > 0)
      .map((product) => ({
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        type: "in" as const,
        quantityDelta: product.quantity,
        quantityAfter: product.quantity,
        reason: "Opening stock",
        userId: admin.id,
      })),
  );

  const [{ total: productTotal }] = await db.select({ total: count() }).from(products);
  console.log(
    `Seeded ${insertedUsers.length} users, ${insertedCategories.length} categories, ${productTotal} products.`,
  );
  console.log("Sign in with admin@stockpile.dev / Password123! (or staff@stockpile.dev).");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
