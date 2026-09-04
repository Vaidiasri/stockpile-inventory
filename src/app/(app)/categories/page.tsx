import type { Metadata } from "next";

import { CategoryManager } from "@/components/categories/category-manager";
import { getSessionUser } from "@/lib/auth";
import { listCategories } from "@/lib/services/categories";

export const metadata: Metadata = { title: "Categories - Stockpile" };

export default async function CategoriesPage() {
  const [categories, user] = await Promise.all([listCategories(), getSessionUser()]);
  return <CategoryManager categories={categories} canDelete={user?.role === "admin"} />;
}
