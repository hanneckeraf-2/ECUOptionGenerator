import { prisma } from '@/lib/db';
import GenerateForm from './generate-form';

export default async function GeneratePage() {
  const [models, features] = await Promise.all([
    prisma.productModel.findMany({ where: { isActive: true }, orderBy: { productCode: 'asc' } }),
    prisma.feature.findMany({ where: { isActive: true }, orderBy: { featureNumber: 'asc' } }),
  ]);

  return (
    <div className="section">
      <h2>Gerar Código de Autenticação</h2>
      <GenerateForm
        models={models.map((m) => ({ id: m.id, productCode: m.productCode, name: m.name }))}
        features={features.map((f) => ({ id: f.id, featureNumber: f.featureNumber, name: f.name }))}
      />
    </div>
  );
}
