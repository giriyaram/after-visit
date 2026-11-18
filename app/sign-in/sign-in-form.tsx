'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {VStack} from '@astryxdesign/core/VStack';

// One message for a wrong email and a wrong password, so the form does not
// reveal which staff emails exist.
const WRONG_DETAILS = 'Email or password is wrong.';
const TOO_MANY = 'Too many attempts. Wait a minute, then try again.';
const NO_CONNECTION = 'Could not reach the server. Check your connection and try again.';
const SERVER_ERROR = 'Something went wrong on our side. Try again in a moment.';

type Values = {email: string; password: string};
type Errors = Partial<Record<keyof Values, string>>;

function validate(values: Values): Errors {
  const errors: Errors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = 'Enter your email.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter an email address like name@clinic.com.';
  }
  if (!values.password) {
    errors.password = 'Enter your password.';
  }
  return errors;
}

function errorStatus(message: string | undefined) {
  return message ? {type: 'error' as const, message} : undefined;
}

export function SignInForm() {
  const router = useRouter();
  const [values, setValues] = useState<Values>({email: '', password: ''});
  // Field errors stay hidden until the first submit, then update as the
  // user types.
  const [hasSubmitted, setHasSubmitted] = useState(false);
  // What the server said about the last attempt.
  const [signInError, setSignInError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const errors = hasSubmitted ? validate(values) : {};

  const set = (field: keyof Values) => (value: string) =>
    setValues(current => ({...current, [field]: value}));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setHasSubmitted(true);
    setSignInError('');
    if (Object.keys(validate(values)).length > 0) return;

    setIsSigningIn(true);
    try {
      // Goes to the auth route, not a server action, so the sign-in attempt
      // limit in lib/auth.ts applies.
      const response = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          email: values.email.trim().toLowerCase(),
          password: values.password,
        }),
      });
      if (response.ok) {
        // The button keeps loading until the inbox replaces this page.
        router.replace('/inbox');
        return;
      }
      if (response.status === 429) setSignInError(TOO_MANY);
      else if (response.status >= 500) setSignInError(SERVER_ERROR);
      else setSignInError(WRONG_DETAILS);
    } catch {
      setSignInError(NO_CONNECTION);
    }
    setIsSigningIn(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <VStack gap={4} hAlign="stretch">
        {signInError && (
          <Banner status="error" title={signInError} container="card" />
        )}
        <TextInput
          label="Email"
          type="email"
          autoComplete="username"
          size="lg"
          value={values.email}
          onChange={set('email')}
          isDisabled={isSigningIn}
          status={errorStatus(errors.email)}
        />
        <TextInput
          label="Password"
          type="password"
          autoComplete="current-password"
          size="lg"
          value={values.password}
          onChange={set('password')}
          isDisabled={isSigningIn}
          status={errorStatus(errors.password)}
        />
        <Button
          label="Sign in"
          variant="primary"
          size="lg"
          type="submit"
          isLoading={isSigningIn}
        />
      </VStack>
    </form>
  );
}
