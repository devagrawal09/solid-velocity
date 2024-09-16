import { createEffect, type ParentProps } from 'solid-js';

export default function SpeakerLayout(props: ParentProps) {
  console.log('SpeakerLayout', props);
  createEffect(() => {
    console.log('SpeakerLayout effect', props.children);
  });
  return <>{props.children}</>;
}
