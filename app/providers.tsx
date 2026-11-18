'use client';

import NextLink from 'next/link';
import {LinkProvider} from '@astryxdesign/core/Link';
import {Theme} from '@astryxdesign/core/theme';
import {themes, defaultThemeSlug} from '../astryx-themes';

export function Providers({children}: {children: React.ReactNode}) {
  // AfterVisit is light mode only, so the mode is fixed rather than
  // following the device setting.
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="light">
      <LinkProvider component={NextLink}>{children}</LinkProvider>
    </Theme>
  );
}
