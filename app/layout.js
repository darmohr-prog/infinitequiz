// app/layout.js
export const metadata = {
  title: "Infinité Quiz",
  description: "Quiz adaptatif généré par IA — 50 questions, 5 niveaux",
  manifest: "/manifest.json",
  themeColor: "#060d18",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Infinité Quiz",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#060d18" }}>
        {children}
      </body>
    </html>
  );
}
