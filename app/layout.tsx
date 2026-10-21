import type { Metadata } from 'next';
import './globals.css';
import './mockup.css';
export const metadata: Metadata={title:'Trade · Oficios de confianza',description:'Encuentra, contrata y da seguimiento a tus servicios en un solo lugar.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
