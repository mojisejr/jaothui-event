import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import Navbar from "~/components/Shared/Navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Providers from "./providers";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <Providers>
      <Navbar />
      <Component {...pageProps} />
      <ToastContainer limit={1} />
    </Providers>
  );
};

export default api.withTRPC(MyApp);
