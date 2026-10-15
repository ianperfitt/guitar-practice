import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Guitar Practice — Find your flow',
  description: 'A fresh shuffle, a little focus. Practice 16 guitar exercises with editable tempo and five-fret positions.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
