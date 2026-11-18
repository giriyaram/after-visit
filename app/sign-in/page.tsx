import {AppShell} from '@astryxdesign/core/AppShell';
import {Card} from '@astryxdesign/core/Card';
import {Center} from '@astryxdesign/core/Center';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Heading} from '@astryxdesign/core/Heading';
import {StackItem} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {SignInForm} from './sign-in-form';

// Two columns side by side at staff widths; one column (form first) once the
// card is narrower than two of these plus the gap. Keep it under a 380px
// screen minus the page and card padding (380 - 48 - 24 = 308).
const COLUMN_MIN_WIDTH = 280;

const HIGHLIGHTS = [
  {
    icon: 'clock',
    title: 'Time-boxed by design',
    body: 'Each follow-up runs for 3, 7 or 14 days, then turns read-only for the patient.',
  },
  {
    icon: 'checkDouble',
    title: 'One inbox for the clinic',
    body: 'Unread first, with the days left and the visit note on every conversation.',
  },
  {
    icon: 'eyeSlash',
    title: 'Private patient links',
    body: 'Patients need no app or account. A link opens one follow-up and nothing else.',
  },
] as const;

// Staff only. Patients never sign in: they arrive through their private link.
export default function SignInPage() {
  return (
    <AppShell contentPadding={6} mobileNav={false}>
      <Center axis="both" minHeight="100%">
        <Card padding={3} width="100%" maxWidth={1040} elevation="low">
          <Grid
            columns={{minWidth: COLUMN_MIN_WIDTH, repeat: 'fit'}}
            gap={3}
            align="stretch">
            <Card variant="transparent" padding={8} minHeight={560}>
              <VStack gap={8} height="100%">
                <HStack gap={2} vAlign="center">
                  <Icon icon="checkDouble" color="accent" />
                  <Text type="body" weight="bold">
                    AfterVisit
                  </Text>
                </HStack>

                <StackItem size="fill">
                  <Center axis="vertical" height="100%">
                    <VStack gap={6} hAlign="stretch" width="100%" maxWidth={380}>
                      <VStack gap={1}>
                        <Heading level={1} type="display-2">
                          Staff sign in
                        </Heading>
                        <Text type="body" color="secondary">
                          Sign in to answer your clinic&apos;s follow-ups.
                        </Text>
                      </VStack>
                      <SignInForm />
                    </VStack>
                  </Center>
                </StackItem>

                <Text type="supporting">
                  Staff accounts are set up by your clinic. Patients don&apos;t
                  sign in here: open the link your clinic sent you.
                </Text>
              </VStack>
            </Card>

            <Card variant="teal" padding={8}>
              <VStack gap={8} height="100%">
                <VStack gap={2}>
                  <Text type="supporting" weight="semibold" color="primary">
                    FOR CLINIC STAFF
                  </Text>
                  <Heading level={2} type="display-3">
                    Pick up where the visit left off.
                  </Heading>
                  <Text type="body" color="secondary">
                    A short, private chat with each patient after their
                    appointment, so questions get answered without another
                    visit.
                  </Text>
                </VStack>

                <StackItem size="fill">
                  <VStack gap={3}>
                    {HIGHLIGHTS.map(item => (
                      <Card key={item.title} padding={4}>
                        <HStack gap={3} vAlign="start">
                          <Icon icon={item.icon} color="accent" />
                          <VStack gap={0.5}>
                            <Text type="label">{item.title}</Text>
                            <Text type="supporting">{item.body}</Text>
                          </VStack>
                        </HStack>
                      </Card>
                    ))}
                  </VStack>
                </StackItem>

                <HStack gap={2} vAlign="center">
                  <Icon icon="warning" size="sm" />
                  <Text type="supporting" color="primary">
                    Not for emergencies. Patients always see the clinic phone
                    number.
                  </Text>
                </HStack>
              </VStack>
            </Card>
          </Grid>
        </Card>
      </Center>
    </AppShell>
  );
}
