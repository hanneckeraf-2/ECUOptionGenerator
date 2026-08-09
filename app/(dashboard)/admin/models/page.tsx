import { requireAdminPage } from '@/lib/auth';
import { prisma } from '@/lib/db';
import ModelsTable from './models-table';

export default async function AdminModelsPage() {
  await requireAdminPage();
  const models = await prisma.productModel.findMany({ orderBy: { productCode: 'asc' } });

  return (
    <div className="section">
      <h2>Modelos de Produto</h2>
      <ModelsTable
        models={models.map((m) => ({
          id: m.id,
          productCode: m.productCode,
          name: m.name,
          isActive: m.isActive,
        }))}
      />
    </div>
  );
}
