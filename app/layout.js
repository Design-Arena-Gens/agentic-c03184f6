export const metadata = {
  title: 'MBBS Question Bank Screenshots',
  description: 'Organize and browse MBBS question screenshot bank',
};

import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="header">
            <h1>MBBS Question Bank</h1>
          </header>
          <main className="main">
            {children}
          </main>
          <footer className="footer">? {new Date().getFullYear()} MBBS Question Bank</footer>
        </div>
      </body>
    </html>
  );
}
