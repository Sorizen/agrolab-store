import { catalogueMetadata, CatalogueView } from '../view';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params, searchParams }) {
  const { category } = await params;
  return catalogueMetadata(await searchParams, category);
}

export default async function CategoryPage({ params, searchParams }) {
  const { category } = await params;
  return <CatalogueView sp={await searchParams} categoryParam={category} />;
}
