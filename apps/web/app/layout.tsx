import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'RootIQ AI — Manufacturing Quality Intelligence', description: 'Manufacturing quality, RCA and CAPA intelligence' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html> }
