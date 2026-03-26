import Head from 'next/head';
import App from '../App';

export default function Home() {
  return (
    <>
      <Head>
        <title>HollowLauncher</title>
        <meta name="description" content="HollowLauncher desktop launcher" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/icon.ico" />
      </Head>
      <App />
    </>
  );
}
