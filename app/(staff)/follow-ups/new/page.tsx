import {Suspense} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Layout, LayoutContent, StackItem} from '@astryxdesign/core/Layout';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {Step, Stepper} from '@astryxdesign/core/Stepper';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {getStaffClinic, listDoctors} from '@/lib/data/follow-ups';
import {NewFollowUpForm} from './new-follow-up-form';

// Reception and doctors both open follow-ups. Both data functions check the
// session and read only the signed-in staff member's clinic.
async function SignedInForm() {
  const [doctors, clinic] = await Promise.all([listDoctors(), getStaffClinic()]);
  return (
    <NewFollowUpForm
      doctors={doctors}
      clinicName={clinic.name}
      isDevWindowAllowed={process.env.NODE_ENV !== 'production'}
    />
  );
}

function FormSkeleton() {
  return (
    <VStack gap={3}>
      {[0, 1, 2, 3, 4].map(index => (
        <Skeleton key={index} height={56} index={index} />
      ))}
    </VStack>
  );
}

// The flow from docs/PRODUCT.md, so whoever opens a follow-up knows what the
// patient will be asked to do.
const NEXT_STEPS = [
  {
    label: 'Open the follow-up',
    description: 'Patient, phone, window length, a one-line visit note and the doctor.',
  },
  {
    label: 'Share the private link',
    description: 'It is shown once. Copy it, or send it by WhatsApp, SMS or email.',
  },
  {
    label: 'Patient confirms their phone',
    description: 'They enter the last 4 digits. Five wrong tries lock the link for 15 minutes.',
  },
  {
    label: 'Chat until the window ends',
    description: 'Then it turns read-only. The patient can book a visit or extend by 7 days.',
  },
];

function WhatHappensNext() {
  return (
    <VStack gap={4}>
      <Card variant="muted" padding={5}>
        <VStack gap={3}>
          <Heading level={2}>What happens next</Heading>
          <Stepper activeStep={0} orientation="vertical" density="compact" label="What happens next">
            {NEXT_STEPS.map((step, index) => (
              <Step
                key={step.label}
                step={index}
                label={step.label}
                description={step.description}
                indicator="number"
              />
            ))}
          </Stepper>
        </VStack>
      </Card>
      <Card padding={4}>
        <HStack gap={3} vAlign="start">
          <Icon icon="warning" color="warning" />
          <VStack gap={0.5}>
            <Text type="label">Not for emergencies</Text>
            <Text type="supporting">
              Every patient screen says so and shows the clinic phone number.
            </Text>
          </VStack>
        </HStack>
      </Card>
    </VStack>
  );
}

export default function NewFollowUpPage() {
  return (
    <Layout
      content={
        <LayoutContent padding={6}>
          <VStack gap={5} maxWidth={1040}>
            <VStack gap={1}>
              <Heading level={1}>New follow-up</Heading>
              <Text type="supporting">
                Give a patient a private chat with the clinic for a few days after their visit.
              </Text>
            </VStack>
            {/* The form takes the room it needs; the guide keeps a fixed width beside it. */}
            <HStack gap={5} vAlign="start">
              <StackItem size="fill">
                <Card padding={6}>
                  <Suspense fallback={<FormSkeleton />}>
                    <SignedInForm />
                  </Suspense>
                </Card>
              </StackItem>
              <VStack width={360}>
                <WhatHappensNext />
              </VStack>
            </HStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
