import { Title } from '@solidjs/meta';
import { clerkUI } from '~/directives/clerk';

export default function SignIn() {
  return (
    <main>
      <Title>Sign up</Title>
      <div class="flex justify-center">
        <div use:clerkUI="SignUp"></div>
      </div>
    </main>
  );
}
