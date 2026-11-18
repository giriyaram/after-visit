'use client';

import {useTransition} from 'react';
import {usePathname} from 'next/navigation';
import {Inbox, MessageSquarePlus} from 'lucide-react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack} from '@astryxdesign/core/HStack';
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import {Text} from '@astryxdesign/core/Text';
import {TopNav} from '@astryxdesign/core/TopNav';
import {VStack} from '@astryxdesign/core/VStack';
import {signOut} from '@/lib/actions/auth';

const NAV_ITEMS = [
  {label: 'Inbox', href: '/inbox', icon: Inbox},
  {label: 'New follow-up', href: '/follow-ups/new', icon: MessageSquarePlus},
];

/** The side rail links, with the current page marked. */
export function StaffNavItems() {
  const pathname = usePathname();

  return NAV_ITEMS.map(item => (
    <SideNavItem
      key={item.href}
      label={item.label}
      href={item.href}
      icon={item.icon}
      isSelected={pathname === item.href || pathname.startsWith(`${item.href}/`)}
    />
  ));
}

const ROLE_LABELS = {doctor: 'Doctor', reception: 'Reception'};

type AccountProps = {
  name: string;
  role: 'doctor' | 'reception';
};

/** The signed-in staff member's name and role, and the sign-out button. */
export function StaffAccount({name, role}: AccountProps) {
  const [isSigningOut, startSignOut] = useTransition();

  return (
    <HStack gap={3} vAlign="center">
      <HStack gap={2} vAlign="center">
        <Avatar name={name} size="sm" tooltip={false} />
        <VStack gap={0}>
          <Text type="label">{name}</Text>
          <Text type="supporting">{ROLE_LABELS[role]}</Text>
        </VStack>
      </HStack>
      <Button
        label="Sign out"
        size="sm"
        isLoading={isSigningOut}
        onClick={() => startSignOut(() => signOut())}
      />
    </HStack>
  );
}

/** The app name at the top of the side rail, with the clinic under it. */
export function StaffHeading({clinicName}: {clinicName?: string}) {
  return (
    <SideNavHeading
      heading="AfterVisit"
      headingHref="/inbox"
      subheading={clinicName}
      icon={<Icon icon="checkDouble" color="accent" />}
    />
  );
}

type Props = {
  /** The app name and clinic, at the top of the side rail. */
  heading: React.ReactNode;
  /** The side rail links. */
  nav: React.ReactNode;
  /** The name, role and sign-out button, shown at the end of the header. */
  account: React.ReactNode;
  children: React.ReactNode;
};

// Staff frame, based on the Astryx `shell-side-nav` template: one left rail,
// plus a header that holds only the signed-in staff member. Below the `md` breakpoint AppShell turns the rail into a
// slide-out drawer on its own. The links and the account stream in, because
// they are only known once the session has been read.
export function StaffShell({heading, nav, account, children}: Props) {
  return (
    <AppShell
      variant="section"
      contentPadding={0}
      topNav={<TopNav label="Account" endContent={account} />}
      sideNav={
        <SideNav header={heading}>
          <SideNavSection title="Follow-ups" isHeaderHidden>
            {nav}
          </SideNavSection>
        </SideNav>
      }>
      {children}
    </AppShell>
  );
}
