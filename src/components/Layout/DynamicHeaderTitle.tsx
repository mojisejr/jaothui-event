import HeaderTitle from "../Typography/HeaderTitle";

export default function DynamicHeaderTitle({ pathname }: { pathname: string }) {
  switch (pathname) {
    case "/register":
      return <HeaderTitle text={"สมัครสมาชิก"} />;
    case "/event":
      return <HeaderTitle text={"งานประกวด"} />;
    case "/member":
      return <HeaderTitle text={"ข้อมูลสมาชิก"} />;
    default:
      return <HeaderTitle text={"Jaothui"} />;
  }
}
