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
  id: string,
  ttl = 86400000
) {
  console.trace({ id });
  return async (a: A) => {
    console.log(`fetching ${id}`);
    const [cachedData] = await db.select().from(cacheTable).where(eq(cacheTable.id, id));
    console.log({ cachedData });
    if (!cachedData) {
      console.log(`Cache miss: ${id}`);
      const data = await fetchData(a);
      await db.insert(cacheTable).values({
        id,
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
      console.log(`Cache stale: ${id}`);
      // Refetch fresh data
      const data = await fetchData(a);
      await db
        .update(cacheTable)
        .set({ value: { data, timestamp: new Date().getTime() } })
        .where(eq(cacheTable.id, id));
      return data;
    }
    console.log(`Cache hit: ${id}`);
    return cachedData.value.data as D;
  };
}
