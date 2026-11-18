import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

// AfterVisit look: white background, dark ink text, one calm teal accent.
// Light mode only, so every value is a single colour rather than a
// [light, dark] pair. After editing, rebuild with:
//   npx @astryxdesign/cli theme build themes/aftervisit/aftervisitTheme.ts
const white = '#FFFFFF';
const ink = '#101828';
const teal = '#0F766E';
const tealPale = '#D5F0EC';

export const aftervisitTheme = defineTheme({
  name: 'aftervisit',
  extends: neutralTheme,
  tokens: {
    '--color-background-body': white,
    '--color-background-surface': white,
    '--color-background-card': white,
    '--color-background-popover': white,

    '--color-text-primary': ink,
    '--color-icon-primary': ink,

    '--color-accent': teal,
    '--color-accent-muted': tealPale,
    '--color-on-accent': white,
    '--color-text-accent': teal,
    '--color-icon-accent': teal,
  },
});
