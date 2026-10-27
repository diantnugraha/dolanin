import { db } from "@/lib/db";
import { seedData } from "@/prisma/seed";

export async function resetDb() {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "Event", "Media", "Listing", "City", "Setting", "Admin" RESTART IDENTITY CASCADE',
  );
}

export function seedBasic() {
  return seedData(db);
}
