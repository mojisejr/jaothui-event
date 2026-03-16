import { type AppType } from "next/app";
import Head from "next/head";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import Navbar from "~/components/Shared/Navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Providers from "./providers";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <Providers>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </Head>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl">
        <Component {...pageProps} />
      </main>
      <ToastContainer limit={1} />
    </Providers>
  );
};

export default api.withTRPC(MyApp);
