import { createStorage } from 'unstorage';
import vercelKVDriver from 'unstorage/drivers/vercel-kv';

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
