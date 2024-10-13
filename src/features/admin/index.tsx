import { useClerk } from 'clerk-solidjs';
import { createSignal, ParentProps, Show } from 'solid-js';

const [adminMode, setAdminMode] = createSignal(false);
const [clock, overrideClock] = createSignal(``);
export const toggleAdminMode = () => setAdminMode(!adminMode());

export const useAdmin = () => {
  const clerk = useClerk();

  const isUserAdmin = () => clerk()?.user?.publicMetadata.role === 'admin';

  const showAdminUi = () => adminMode() && isUserAdmin();

  return { showAdminUi, isUserAdmin, clock, overrideClock };
};

export function AdminMode(props: ParentProps) {
  const { showAdminUi } = useAdmin();
  return <Show when={showAdminUi()}>{props.children}</Show>;
}
