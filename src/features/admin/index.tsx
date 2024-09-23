import { createSignal } from 'solid-js';

const [adminMode, setAdminMode] = createSignal(true);
const toggleAdminMode = () => setAdminMode(!adminMode());
export { adminMode, toggleAdminMode };
