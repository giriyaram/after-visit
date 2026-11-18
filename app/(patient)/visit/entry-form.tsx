'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {CheckboxInput} from '@astryxdesign/core/CheckboxInput';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {VStack} from '@astryxdesign/core/VStack';
import {confirmEntry} from './[token]/actions';

function digitsError(digits: string) {
  if (!/^\d{4}$/.test(digits)) return 'Enter the last 4 digits of your phone number.';
  return undefined;
}

type Props = {
  /** The link token from the URL. */
  token: string;
  clinicName: string;
};

export function EntryForm({token, clinicName}: Props) {
  const router = useRouter();
  const [isChecking, startChecking] = useTransition();
  // The digits the server last refused and what it said, so the error
  // clears on the next edit.
  const [refusal, setRefusal] = useState<{digits: string; message: string}>();
  // A refusal that is not about the digits: locked, dead link, no connection.
  const [blocked, setBlocked] = useState<{title: string; description: string}>();
  const [digits, setDigits] = useState('');
  const [hasConsented, setHasConsented] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const errors = hasSubmitted
    ? {
        digits:
          digitsError(digits) ??
          (digits === refusal?.digits ? refusal.message : undefined),
        consent: hasConsented ? undefined : 'Tick the box to continue.',
      }
    : {};

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);
    setBlocked(undefined);
    if (digitsError(digits) || !hasConsented) return;

    // The phone number never reaches the browser; the server compares.
    startChecking(async () => {
      try {
        const result = await confirmEntry(token, digits, hasConsented);
        if (result.ok) {
          router.push(`/visit/${encodeURIComponent(token)}/chat`);
        } else if (result.reason === 'wrong_digits') {
          const tries = result.attemptsLeft === 1 ? '1 try' : `${result.attemptsLeft} tries`;
          setRefusal({
            digits,
            message: `Those digits do not match the number the clinic has for you. ${tries} left.`,
          });
        } else if (result.reason === 'locked') {
          const minutes = result.minutesLeft === 1 ? '1 minute' : `${result.minutesLeft} minutes`;
          setBlocked({
            title: 'Too many wrong tries',
            description: `For your safety this link is locked. Try again in ${minutes}, or call the clinic.`,
          });
        } else if (result.reason === 'invalid_link') {
          setBlocked({
            title: 'This link is no longer working',
            description: 'Call the clinic to ask for a new link.',
          });
        } else {
          // The form already checks the digits and the tick box.
          setRefusal({digits, message: 'Enter the last 4 digits of your phone number.'});
        }
      } catch {
        setBlocked({
          title: 'Could not check your number',
          description: 'Check your connection and try again.',
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <VStack gap={5}>
        <VStack gap={1}>
          <Heading level={2}>Confirm it’s you</Heading>
          <Text color="secondary">
            {clinicName} opened this chat so you can ask questions
            after your visit.
          </Text>
        </VStack>
        {blocked && (
          <Banner status="error" title={blocked.title} description={blocked.description} />
        )}
        <FormLayout>
          <TextInput
            label="Last 4 digits of your phone number"
            value={digits}
            onChange={value => setDigits(value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            autoComplete="off"
            status={
              errors.digits ? {type: 'error', message: errors.digits} : undefined
            }
          />
          <CheckboxInput
            label={`I agree to message ${clinicName} about my visit here, and I understand this chat is not for emergencies.`}
            value={hasConsented}
            onChange={setHasConsented}
            status={
              errors.consent
                ? {type: 'error', message: errors.consent}
                : undefined
            }
          />
        </FormLayout>
        <Button
          label="Continue"
          variant="primary"
          type="submit"
          width="100%"
          isLoading={isChecking}
        />
      </VStack>
    </form>
  );
}
