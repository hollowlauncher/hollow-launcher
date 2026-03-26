import Head from 'next/head';
import App from '../App';

export default function OverlayPage() {
  return (
    <>
      <Head>
        <title>HyperBar Overlay</title>
        <meta name="description" content="HyperBar in-game overlay window" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <App overlayMode />
    </>
  );
}
