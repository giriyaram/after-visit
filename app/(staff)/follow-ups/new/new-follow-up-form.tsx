'use client';

import {useState, useTransition} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {HStack} from '@astryxdesign/core/HStack';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {Selector} from '@astryxdesign/core/Selector';
import {TextInput} from '@astryxdesign/core/TextInput';
import {VStack} from '@astryxdesign/core/VStack';
import {openFollowUp} from '@/lib/actions/follow-ups';
import {
  DEV_WINDOW_MINUTES,
  DEV_WINDOW_VALUE,
  normalisePhone,
  validateFollowUpInput,
  WINDOW_LENGTHS,
  type FollowUpInputErrors,
} from '@/lib/follow-ups/input';

type Values = {
  patientName: string;
  patientPhone: string;
  /** A string, because that is what the radio list holds. */
  windowDays: string;
  visitNote: string;
  doctorId: string;
};

const EMPTY: Values = {
  patientName: '',
  patientPhone: '',
  windowDays: '',
  visitNote: '',
  doctorId: '',
};

const toInput = (values: Values) => ({
  ...values,
  windowDays: values.windowDays === DEV_WINDOW_VALUE ? DEV_WINDOW_VALUE : Number(values.windowDays),
});

// The same check the server runs, used here only for faster feedback.
function validate(values: Values, isDevWindowAllowed: boolean): FollowUpInputErrors {
  const result = validateFollowUpInput(toInput(values), {allowDevWindow: isDevWindowAllowed});
  return result.ok ? {} : result.errors;
}

/** "7 days" or "2 minutes", for the messages after opening. */
function windowLabel(windowDays: string) {
  return windowDays === DEV_WINDOW_VALUE ? `${DEV_WINDOW_MINUTES} minutes` : `${windowDays} days`;
}

function errorStatus(message: string | undefined) {
  return message ? {type: 'error' as const, message} : undefined;
}

type Opened = {
  /** The full private link. The server cannot show it again. */
  link: string;
  patientName: string;
  patientPhone: string;
  windowDays: string;
  doctorName: string;
};

type Props = {
  /** The clinic's doctors, loaded on the server. */
  doctors: {id: string; name: string}[];
  /** Goes into the message the patient receives. */
  clinicName: string;
  /** Shows the 2-minute window, for watching a window end. Never in production. */
  isDevWindowAllowed?: boolean;
};

export function NewFollowUpForm({doctors, clinicName, isDevWindowAllowed = false}: Props) {
  const [values, setValues] = useState<Values>(EMPTY);
  // Errors stay hidden until the first submit, then update as the user types.
  const [hasSubmitted, setHasSubmitted] = useState(false);
  // What the server refused, shown until the next submit.
  const [serverErrors, setServerErrors] = useState<FollowUpInputErrors>({});
  const [hasFailed, setHasFailed] = useState(false);
  const [isOpening, startOpening] = useTransition();
  const [opened, setOpened] = useState<Opened>();

  const errors = hasSubmitted ? {...serverErrors, ...validate(values, isDevWindowAllowed)} : {};

  const set = (field: keyof Values) => (value: string) => {
    setValues(previous => ({...previous, [field]: value}));
    setServerErrors(previous => ({...previous, [field]: undefined}));
  };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);
    setHasFailed(false);
    setServerErrors({});
    if (Object.keys(validate(values, isDevWindowAllowed)).length > 0) return;

    startOpening(async () => {
      try {
        const result = await openFollowUp(toInput(values));
        if (!result.ok) {
          setServerErrors(result.errors);
          return;
        }
        setOpened({
          link: `${window.location.origin}${result.linkPath}`,
          patientName: values.patientName.trim(),
          patientPhone: normalisePhone(values.patientPhone) ?? '',
          windowDays: values.windowDays,
          doctorName: doctors.find(doctor => doctor.id === values.doctorId)?.name ?? '',
        });
      } catch {
        setHasFailed(true);
      }
    });
  }

  function handleReset() {
    setValues(EMPTY);
    setHasSubmitted(false);
    setOpened(undefined);
  }

  if (opened) {
    return (
      <OpenedFollowUp opened={opened} clinicName={clinicName} onReset={handleReset} />
    );
  }

  if (doctors.length === 0) {
    return (
      <EmptyState
        headingLevel={2}
        title="No doctors yet"
        description="A follow-up needs an assigned doctor. Ask whoever set up AfterVisit to add one."
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <VStack gap={5} maxWidth={560}>
        {hasFailed && (
          <Banner
            status="error"
            title="Could not open the follow-up"
            description="Nothing was saved. Check your connection and try again."
          />
        )}
        <FormLayout>
          <TextInput
            label="Patient name"
            value={values.patientName}
            onChange={set('patientName')}
            autoComplete="off"
            isDisabled={isOpening}
            status={errorStatus(errors.patientName)}
          />
          <TextInput
            label="Phone"
            type="tel"
            description="With the country code, like +91. The patient confirms the last 4 digits to open their link."
            value={values.patientPhone}
            onChange={set('patientPhone')}
            autoComplete="off"
            isDisabled={isOpening}
            status={errorStatus(errors.patientPhone)}
          />
          <RadioList
            label="Window length"
            orientation="horizontal"
            value={values.windowDays}
            onChange={set('windowDays')}
            status={errorStatus(errors.windowDays)}>
            {WINDOW_LENGTHS.map(days => (
              <RadioListItem key={days} label={`${days} days`} value={String(days)} />
            ))}
            {isDevWindowAllowed && (
              <RadioListItem
                label={`${DEV_WINDOW_MINUTES} minutes (development only)`}
                value={DEV_WINDOW_VALUE}
              />
            )}
          </RadioList>
          <TextInput
            label="Visit note"
            description="One line. Pinned at the top of the conversation."
            value={values.visitNote}
            onChange={set('visitNote')}
            autoComplete="off"
            isDisabled={isOpening}
            status={errorStatus(errors.visitNote)}
          />
          <Selector
            label="Assigned doctor"
            placeholder="Choose a doctor"
            options={doctors.map(doctor => ({value: doctor.id, label: doctor.name}))}
            value={values.doctorId}
            onChange={set('doctorId')}
            status={errorStatus(errors.doctorId)}
          />
        </FormLayout>
        <HStack>
          <Button
            label="Open follow-up"
            variant="primary"
            type="submit"
            isLoading={isOpening}
          />
        </HStack>
      </VStack>
    </form>
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OpenedProps = {
  opened: Opened;
  clinicName: string;
  onReset: () => void;
};

// The link is on screen this once. Only its hash is stored, so leaving the
// page without copying or sharing it means generating a new one.
function OpenedFollowUp({opened, clinicName, onReset}: OpenedProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  // Only used to address the email in the staff member's own mail app.
  // Never sent to the server or saved.
  const [email, setEmail] = useState('');
  const trimmedEmail = email.trim();
  const isEmailInvalid = trimmedEmail !== '' && !EMAIL_PATTERN.test(trimmedEmail);

  // Says who it is from and nothing about the visit.
  const message = `${clinicName}: you can message us about your visit for the next ${windowLabel(opened.windowDays)}. Your private link: ${opened.link}`;
  const text = encodeURIComponent(message);
  // The subject names the clinic only, like the message.
  const emailHref = `mailto:${encodeURIComponent(trimmedEmail)}?subject=${encodeURIComponent(
    `Your follow-up link from ${clinicName}`,
  )}&body=${text}`;
  // WhatsApp needs the full international number. Without a country code
  // it opens with the message ready and staff pick the contact.
  const whatsAppNumber = opened.patientPhone.startsWith('+')
    ? opened.patientPhone.slice(1)
    : '';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(opened.link);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <VStack gap={5} maxWidth={560}>
      <Banner
        status="success"
        title="Follow-up opened"
        description={`${opened.patientName} can message the clinic for ${windowLabel(opened.windowDays)}. Assigned to ${opened.doctorName}.`}
      />
      <Banner
        status="warning"
        title="Copy or share this link now"
        description="It is shown only this once. If it is lost, a new link has to be generated."
      />
      <TextInput
        label="Private link"
        value={opened.link}
        isReadOnly
        status={
          copyState === 'failed'
            ? {type: 'error', message: 'Could not copy. Select the link and copy it by hand.'}
            : undefined
        }
      />
      <HStack gap={2} wrap="wrap">
        <Button
          label={copyState === 'copied' ? 'Copied' : 'Copy'}
          variant="primary"
          onClick={handleCopy}
        />
        <Button
          label="Share on WhatsApp"
          href={`https://wa.me/${whatsAppNumber}?text=${text}`}
          target="_blank"
        />
        <Button label="Share by SMS" href={`sms:${opened.patientPhone}?&body=${text}`} />
      </HStack>
      <TextInput
        label="Patient email (optional)"
        type="email"
        description="Opens your mail app with the link ready to send. The address is not saved."
        value={email}
        onChange={setEmail}
        autoComplete="off"
        status={
          isEmailInvalid
            ? {type: 'error', message: 'Enter an email address like name@example.com.'}
            : undefined
        }
      />
      <HStack>
        <Button label="Share by email" href={emailHref} isDisabled={isEmailInvalid} />
      </HStack>
      <HStack>
        <Button label="Open another follow-up" variant="ghost" onClick={onReset} />
      </HStack>
    </VStack>
  );
}
