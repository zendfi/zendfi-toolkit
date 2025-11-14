// Force dynamic rendering (don't pre-render during build)
export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import { ProductForm } from "@/components/admin/ProductForm";
import { notFound } from "next/navigation";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await prisma.product.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <ProductForm
      mode="edit"
      initialData={{
        ...product,
        description: product.description || "",
        category: product.category || "",
        image: product.image || "",
      }}
    />
  );
}
