import "dotenv/config";
import { seedCatalog } from "../src/services/seedCatalog";
import { prisma } from "../src/db/prisma";

seedCatalog()
  .then((result) => {
    console.log(`${result.groupCount} Mitarbeitergruppen eingespielt.`);
    console.log(`${result.productCount} Produkte, ${result.sizeCount} Größen-Einträge eingespielt.`);
    console.log(
      `Admin-Account bereit: ${result.adminEmail} (Passwort aus SEED_ADMIN_PASSWORD bzw. Default).`
    );
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
