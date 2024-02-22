import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import { LineProvider } from "~/context/lineContext";
import Navbar from "~/components/Shared/Navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AdminProvider } from "~/context/adminContext";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <>
      <LineProvider>
        <AdminProvider>
          <Navbar />
          <Component {...pageProps} />
          <ToastContainer limit={1} />
        </AdminProvider>
      </LineProvider>
    </>
  );
};

export default api.withTRPC(MyApp);
