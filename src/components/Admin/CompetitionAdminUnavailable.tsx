export default function CompetitionAdminUnavailable() {
  return (
    <section role="alert" className="mx-auto max-w-lg p-6 text-white">
      <h1 className="mb-3 text-xl font-bold">
        ย้ายการจัดการแข่งขันไป Dashboard แล้ว
      </h1>
      <p>
        ขณะนี้ยังเปิดทางเข้า Dashboard ไม่ได้
        กรุณาติดต่อผู้ดูแลระบบและลองใหม่ภายหลัง
      </p>
      <p className="mt-3">
        การสมัคร ดูประวัติ และติดตามผลของผู้สมัครยังใช้หน้าบ้านเดิมได้
      </p>
    </section>
  );
}
