import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Guitar & Piano Practice — Find your flow',
  description:
    'Separate guitar and piano practice decks and exercise libraries, with two chords on every card and editable tempo.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
