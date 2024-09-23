import { useClerk } from 'clerk-solidjs';
import { createSignal } from 'solid-js';

const [adminMode, setAdminMode] = createSignal(false);
export const toggleAdminMode = () => setAdminMode(!adminMode());

export const useAdmin = () => {
  const clerk = useClerk();

  const isUserAdmin = () => clerk()?.user?.publicMetadata.role === 'admin';

  const showAdminUi = () => adminMode() && isUserAdmin();

  return { showAdminUi, isUserAdmin };
};
