// Script para corrigir stationId nulo em staff/admin/fleet
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function main() {
  // Pega a primeira estação ativa
  const defaultStation = await prisma.station.findFirst({ where: { isActive: true } });
  if (!defaultStation) {
    throw new Error('Nenhuma estação ativa encontrada.');
  }
  // Atualiza todos os users staff/admin/fleet com stationId nulo
  const updated = await prisma.user.updateMany({
    where: {
      stationId: null,
      NOT: { role: 'CLIENT' }
    },
    data: {
      stationId: defaultStation.id
    }
  });
  console.log(`Atualizados ${updated.count} usuários para stationId ${defaultStation.id}`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
