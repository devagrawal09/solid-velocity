import { eq } from 'drizzle-orm';
import { json, pgTable, text } from 'drizzle-orm/pg-core';
import { db } from './drizzle';

type StorageValue = null | string | number | boolean | object;

export const cacheTable = pgTable(`cache-entries`, {
  id: text(`id`).primaryKey(),
  value: json('value').$type<CachedData<any>>().notNull()
});

type CachedData<D> = { data: D; timestamp?: number };

export function serverCache<A = void, D = StorageValue>(
  fetchData: (a: A) => Promise<D>,
  cacheKey: string,
  ttl = 86400000
) {
  const storageKey = `uncache/${cacheKey}`;

  return async (a: A) => {
    // const cachedData = await storage.getItem<CachedData<D>>(storageKey);
    const [cachedData] = await db.select().from(cacheTable).where(eq(cacheTable.id, storageKey));
    if (!cachedData) {
      console.log(`Cache miss: ${cacheKey}`);
      const data = await fetchData(a);
      // await storage.setItem<CachedData<D>>(storageKey, { data, timestamp: new Date().getTime() });
      await db.insert(cacheTable).values({
        id: storageKey,
        value: {
          data,
          timestamp: new Date().getTime()
        }
      });
      return data;
    }
    // Check if cached data is older than a day
    const now = new Date().getTime();
    const cachedDataTimestamp = cachedData.value.timestamp;
    const isDataStale = cachedDataTimestamp ? now - cachedDataTimestamp > ttl : true;

    if (isDataStale) {
      console.log(`Cache stale: ${cacheKey}`);
      // Refetch fresh data
      const data = await fetchData(a);
      await db
        .update(cacheTable)
        .set({ value: { data, timestamp: new Date().getTime() } })
        .where(eq(cacheTable.id, storageKey));
      return data;
    }
    console.log(`Cache hit: ${cacheKey}`);
    return cachedData.value.data;
  };
}
