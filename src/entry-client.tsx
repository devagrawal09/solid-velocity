// @refresh reload
import 'solid-devtools';
// import { attachDevtoolsOverlay } from '@solid-devtools/overlay';
import { mount, StartClient } from '@solidjs/start/client';

mount(() => <StartClient />, document.getElementById('app')!);

// attachDevtoolsOverlay({
//   defaultOpen: false, // or alwaysOpen
//   noPadding: true
// });
