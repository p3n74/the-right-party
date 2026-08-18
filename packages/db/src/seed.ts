import prisma, { ensureEventConfig } from "./index";

await ensureEventConfig(prisma);

const config = await prisma.eventConfig.findUnique({ where: { id: 1 } });
console.log("Local database is ready.");
console.log(`  event: ${config?.name}`);
console.log(`  venue: ${config?.venue}`);
console.log(`  price: ₱${(config?.ticketPriceCentavos ?? 0) / 100}`);

await prisma.$disconnect();
