import { Title } from '@solidjs/meta';
import { clerkUI } from '~/directives/clerk';

export default function SignIn() {
  return (
    <main>
      <Title>Sign in</Title>
      <div class="flex justify-center">
        <div use:clerkUI="SignIn"></div>
      </div>
    </main>
  );
}
