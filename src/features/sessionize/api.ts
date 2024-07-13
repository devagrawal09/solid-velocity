import { cache } from '@solidjs/router';
import { getCachedData } from './store';

export const getSessionizeData = cache(async () => {
  'use server';

  const data = await getCachedData();
  return data;
}, 'sessionize');
