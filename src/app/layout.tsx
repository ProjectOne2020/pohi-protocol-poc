import './globals.css'; // Opcional si usas estilos globales

export const metadata = {
  title: 'PoHI Protocol - Proof of Human Intent',
  description: 'Auditoría biométrica conductual basada en cliente',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
