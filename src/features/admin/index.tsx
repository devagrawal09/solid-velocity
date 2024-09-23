import { createSignal } from 'solid-js';

const [adminMode, setAdminMode] = createSignal(false);
const toggleAdminMode = () => setAdminMode(!adminMode());
export { adminMode, toggleAdminMode };
