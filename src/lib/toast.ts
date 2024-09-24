import { showToast } from '~/components/ui/toast';
import { Handler, createTopic, createListener } from './events';

type ToastProps = Parameters<typeof showToast>[0];

export function createToastListener(...handlers: Handler<ToastProps>[]) {
  const handler = createTopic(...handlers);
  createListener(handler, showToast);
}
