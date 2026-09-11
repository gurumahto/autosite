import './globals.css';

export const metadata = {
  title: 'Autosite Generator',
  description: 'Generate and publish a professional business website.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
