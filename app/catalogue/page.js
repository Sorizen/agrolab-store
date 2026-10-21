import { catalogueMetadata, CatalogueView } from './view';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  return catalogueMetadata(await searchParams);
}

export default async function CataloguePage({ searchParams }) {
  return <CatalogueView sp={await searchParams} />;
}
