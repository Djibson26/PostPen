import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html style={{ backgroundColor: '#121212' }}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <style>{`
          body {
            background-color: #121212;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            color: #e0e0e0;
          }
        `}</style>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
