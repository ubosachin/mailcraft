import { connectToDatabase } from './connection.js';
import { Template } from './models/Template.js';
import { TEMPLATE_CATALOG } from '@mailcraft/email-renderer';

export async function seedTemplates(): Promise<{ upserted: number; modified: number; total: number }> {
  console.log('[Seed] Connecting to MongoDB to seed templates...');
  await connectToDatabase();

  const ops = TEMPLATE_CATALOG.map((t) => ({
    updateOne: {
      filter: { slug: t.slug },
      update: {
        $set: {
          name: t.name,
          slug: t.slug,
          category: t.category,
          thumbnail: t.thumbnail,
          description: t.description,
          editorSchema: t.editorSchema,
          isActive: t.isActive,
          isPremium: t.isPremium,
          version: t.version,
        },
      },
      upsert: true,
    },
  }));

  const result = await Template.bulkWrite(ops);
  const total = await Template.countDocuments({ isActive: true });

  console.log(
    `[Seed] Templates seeded successfully. Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}, Total active: ${total}`
  );

  return {
    upserted: result.upsertedCount,
    modified: result.modifiedCount,
    total,
  };
}

// Allow direct CLI invocation via `node packages/database/dist/seed-templates.js`
if (process.argv[1]?.endsWith('seed-templates.js') || process.argv[1]?.endsWith('seed-templates.ts')) {
  seedTemplates()
    .then(() => {
      console.log('✓ Seeding complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}

