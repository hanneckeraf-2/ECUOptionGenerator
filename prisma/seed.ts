import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Lista original de modelos, hardcoded no Form_Load de Main.frm (VB6).
const INITIAL_MODELS: Array<{ productCode: string; name: string }> = [
  { productCode: '800.1004.00', name: 'PR330' },
  { productCode: '800.1004.01', name: 'PR330 CODED' },
  { productCode: '800.1004.02', name: 'PR-SPORT' },
  { productCode: '800.1004.31', name: 'PR-SPORT EVO' },
  { productCode: '800.1004.32', name: 'PR-SPORT EVO 4' },
  { productCode: '800.1003.00', name: 'PR440' },
  { productCode: '800.1003.01', name: 'PR440 CODED' },
  { productCode: '800.1003.20', name: 'PR-4' },
  { productCode: '800.1003.21', name: 'PR-4 EVO' },
  { productCode: '800.1002.00', name: 'PR660' },
  { productCode: '800.1002.01', name: 'PR660 CODED' },
  { productCode: '800.1002.20', name: 'PR-8' },
  { productCode: '800.1002.21', name: 'PR-8 EVO' },
  { productCode: '800.1005.01', name: 'PR661 CODED' },
  { productCode: '800.1001.00', name: 'PR600AB' },
];

// Mesma ordem/numeracao da combo "Feature" original (indice 1-based == FNumber
// usado no algoritmo de geracao de codigo). O item "All-Codes" (indice 0) nao
// e uma feature real - virou a opcao "Todas as opcoes" na tela nova.
const INITIAL_FEATURES: string[] = [
  'Internal_Logging_Memory',
  'ETC Electronic Throttle Control',
  'Lambda Control',
  'Lambda Auto-Tune',
  'Boost Control',
  'Anti-Lag',
  'Injectors Peak-And-Hold',
  'Cam Control',
  'Dual Lambda Control',
  'Traction Control',
  'Knock Control',
  '2nd Bank Injectors',
  'Firmware PR-EVO Series',
  'Firmware PR-EVO Series (+1 Year)',
  'Firmware PR-EVO Series (+2 Years)',
  'Firmware PR-EVO Series (+3 Years)',
  'Super User',
];

async function main() {
  const adminEmail = 'ismael@protune.com.br';
  const adminPassword = 'Suporte#123';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: { email: adminEmail, passwordHash, role: 'ADMIN', status: 'ACTIVE' },
    });
    console.log(`Admin inicial criado: ${adminEmail}`);
  } else {
    console.log(`Admin inicial ja existe: ${adminEmail}`);
  }

  for (const model of INITIAL_MODELS) {
    await prisma.productModel.upsert({
      where: { productCode: model.productCode },
      update: {},
      create: model,
    });
  }
  console.log(`${INITIAL_MODELS.length} modelos de produto garantidos.`);

  for (let i = 0; i < INITIAL_FEATURES.length; i++) {
    const featureNumber = i + 1;
    const name = INITIAL_FEATURES[i]!;
    await prisma.feature.upsert({
      where: { featureNumber },
      update: {},
      create: { featureNumber, name },
    });
  }
  console.log(`${INITIAL_FEATURES.length} features garantidas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
