import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import { LineProvider } from "~/context/lineContext";
import Navbar from "~/components/Shared/Navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <>
      <LineProvider>
        <Navbar />
        <Component {...pageProps} />
        <ToastContainer limit={1} />
      </LineProvider>
    </>
  );
};

export default api.withTRPC(MyApp);
