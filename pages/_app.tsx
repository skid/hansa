import { AppComponent } from "next/dist/shared/lib/router/router";
import Head from "next/head";
import "../public/styles.scss";

const HansaTeutonica: AppComponent = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <title>Hansa Teutonica</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
};

export default HansaTeutonica;
