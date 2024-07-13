import { createStorage } from 'unstorage';
import vercelKVDriver from 'unstorage/drivers/vercel-kv';
import { consola } from 'consola';

type StorageValue = null | string | number | boolean | object;

const kvUrl = process.env.KV_REST_API_URL;
if (!kvUrl) throw new Error('KV_REST_API_URL is not set');

const kvToken = process.env.KV_REST_API_TOKEN;
if (!kvToken) throw new Error('KV_REST_API_URL is not set');

export const storage = createStorage({
  driver: vercelKVDriver({
    url: kvUrl,
    token: kvToken,
    base: 'velocity'
  })
});

export type CachedData<D> = { data: D; timestamp?: number };

export function serverCache<A = any, D = StorageValue>(
  fetchData: (a: A) => Promise<D>,
  cacheKey: string,
  ttl = 86400000
) {
  const storageKey = `uncache/${cacheKey}`;

  return async (a: A) => {
    const cachedData = await storage.getItem<CachedData<D>>(storageKey);
    if (!cachedData) {
      consola.log(`Cache miss: ${cacheKey}`);
      const data = await fetchData(a);
      await storage.setItem<CachedData<D>>(storageKey, { data, timestamp: new Date().getTime() });
      return data;
    }
    // Check if cached data is older than a day
    const now = new Date().getTime();
    const cachedDataTimestamp = cachedData.timestamp;
    const isDataStale = cachedDataTimestamp ? now - cachedDataTimestamp > ttl : true;

    if (isDataStale) {
      consola.log(`Cache stale: ${cacheKey}`);
      // Refetch fresh data
      const data = await fetchData(a);
      if (!data) return;
      await storage.setItem<CachedData<D>>(storageKey, { data, timestamp: new Date().getTime() });
      return data;
    }
    consola.log(`Cache hit: ${cacheKey}`);
    return cachedData.data;
  };
}
