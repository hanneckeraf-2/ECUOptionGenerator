import { requireAdminPage } from '@/lib/auth';
import { prisma } from '@/lib/db';
import FeaturesTable from './features-table';

export default async function AdminFeaturesPage() {
  await requireAdminPage();
  const features = await prisma.feature.findMany({ orderBy: { featureNumber: 'asc' } });

  return (
    <div className="section">
      <h2>Features / Opcoes</h2>
      <FeaturesTable
        features={features.map((f) => ({
          id: f.id,
          featureNumber: f.featureNumber,
          name: f.name,
          isActive: f.isActive,
        }))}
      />
    </div>
  );
}
