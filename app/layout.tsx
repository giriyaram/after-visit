import type {Metadata} from 'next';
import './globals.css';
import {Providers} from './providers';

// One title everywhere. Patient pages never put the patient's name, the
// clinic or the visit in the title; the only identifier they carry is the
// link token in the URL.
export const metadata: Metadata = {
  title: 'AfterVisit',
  description: 'A time-boxed follow-up chat between a clinic and a patient after a visit.',
};

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
