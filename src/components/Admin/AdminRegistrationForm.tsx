import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "~/utils/api";
import FormV3 from "~/components/Events/Formv3";
import { useAdmin } from "~/context/adminContext";


type AdminFormData = {
  eventId: string;
};

const AdminRegistrationForm = () => {
  const { admin, adminUser } = useAdmin();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [overrideDuplicate, setOverrideDuplicate] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<any>(null);

  // Get active events for admin dropdown
  const { data: activeEvents, isLoading: eventsLoading } = 
    api.admin.getActiveEvents.useQuery();

  // Admin registration mutation
  const { mutate: registerAdmin, isLoading: registering } = 
    api.admin.registerAdminEvent.useMutation({
      onSuccess: (result) => {
        if (result.success) {
          setRegistrationResult(result);
          if (result.duplicateWarning?.exists) {
            // Show that duplicate was overridden
            setDuplicateWarning(result.duplicateWarning);
          }
        } else if (result.duplicateWarning?.exists) {
          // Show duplicate warning and ask for override
          setDuplicateWarning(result.duplicateWarning);
        } else {
          // Show error
          alert(result.error ?? "การลงทะเบียนล้มเหลว");
        }
      },
      onError: (error) => {
        alert(error.message);
      }
    });

  const { register, handleSubmit, watch, reset } = useForm<AdminFormData>();

  const selectedEventId = watch("eventId");

  const handleEventSelect = (eventId: string) => {
    const event = activeEvents?.find(e => e.eventId === eventId);
    setSelectedEvent(event);
    setDuplicateWarning(null);
    setOverrideDuplicate(false);
    setRegistrationResult(null);
  };

  const handleAdminSubmit = (formData: any) => {
    if (!admin) {
      alert("กรุณาเข้าสู่ระบบในฐานะ Admin");
      return;
    }

    if (!selectedEvent) {
      alert("กรุณาเลือกงานที่ต้องการลงทะเบียน");
      return;
    }

    const adminData = {
      ...formData,
      eventId: selectedEvent.eventId,
      userId: adminUser?.userId,
      overrideDuplicate,
    };

    registerAdmin(adminData);
  };

  const handleOverrideDuplicate = () => {
    setOverrideDuplicate(true);
    // Re-submit with override flag
    if (selectedEvent && adminUser) {
      // This will be called by the FormV3 component
      setDuplicateWarning(null);
    }
  };

  const resetForm = () => {
    reset();
    setSelectedEvent(null);
    setDuplicateWarning(null);
    setOverrideDuplicate(false);
    setRegistrationResult(null);
  };

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-bold text-primary">ไม่มีสิทธิ์เข้าถึง</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-300 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary">
            ลงทะเบียนควายที่งาน
          </h1>
          <p className="text-neutral-content mt-2">
            ระบบลงทะเบียนควายสำหรับ Admin ณ งานสถานที่ (อนุมัติอัตโนมัติ)
          </p>
        </div>

        {/* Event Selection */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-primary mb-4">
              เลือกงานที่ต้องการลงทะเบียน
            </h2>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">งานที่เปิดรับสมัครอยู่</span>
              </label>
              <select
                className="select select-bordered select-primary"
                {...register("eventId", { required: true })}
                onChange={(e) => handleEventSelect(e.target.value)}
                disabled={eventsLoading || registering}
              >
                <option value="">กรุณาเลือกงาน...</option>
                {activeEvents?.map((event) => (
                  <option key={event.eventId} value={event.eventId}>
                    {event.name} - {event.eventAt ? 
                      new Date(event.eventAt).toLocaleDateString('th-TH') : 
                      'ไม่ระบุวันที่'
                    }
                  </option>
                ))}
              </select>
            </div>

            {eventsLoading && (
              <div className="loading loading-spinner loading-sm"></div>
            )}

            {activeEvents?.length === 0 && !eventsLoading && (
              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>ไม่มีงานที่เปิดรับสมัครอยู่ในขณะนี้</span>
              </div>
            )}

            {selectedEvent && (
              <div className="mt-4 p-4 bg-base-200 rounded-lg">
                <h3 className="font-bold text-primary mb-2">
                  รายละเอียดงาน: {selectedEvent.name}
                </h3>
                <div className="text-sm space-y-1">
                  <p><strong>วันที่จัดงาน:</strong> {selectedEvent.eventAt ? 
                    new Date(selectedEvent.eventAt).toLocaleDateString('th-TH') : 
                    'ไม่ระบุ'}</p>
                  <p><strong>วันสิ้นสุดรับสมัคร:</strong> {selectedEvent.registrationDeadline ? 
                    new Date(selectedEvent.registrationDeadline).toLocaleDateString('th-TH') : 
                    'ไม่ระบุ'}</p>
                  <p><strong>สถานที่:</strong> {selectedEvent.metadata?.location || 'ไม่ระบุ'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Duplicate Warning */}
        {duplicateWarning?.exists && (
          <div className="card bg-warning shadow-xl mb-6">
            <div className="card-body">
              <h3 className="card-title text-warning-content">
                ⚠️ พบข้อมูลซ้ำ
              </h3>
              <p className="text-warning-content">
                {duplicateWarning.message}
              </p>
              {duplicateWarning.existingRegistration && (
                <div className="mt-2 p-3 bg-warning/20 rounded">
                  <p className="text-sm">
                    <strong>ข้อมูลเดิม:</strong> {duplicateWarning.existingRegistration.name} 
                    ({duplicateWarning.existingRegistration.ownerName})
                  </p>
                </div>
              )}
              <div className="card-actions justify-end">
                <button 
                  className="btn btn-outline btn-warning"
                  onClick={() => setDuplicateWarning(null)}
                >
                  ยกเลิก
                </button>
                <button 
                  className="btn btn-warning"
                  onClick={handleOverrideDuplicate}
                >
                  ลงทะเบียนซ้ำ (Admin Override)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Registration Success */}
        {registrationResult?.success && (
          <div className="card bg-success shadow-xl mb-6">
            <div className="card-body">
              <h3 className="card-title text-success-content">
                ✅ ลงทะเบียนสำเร็จ
              </h3>
              <p className="text-success-content">
                การลงทะเบียนควายเสร็จสิ้นและได้รับการอนุมัติแล้ว
              </p>
              {registrationResult.registration && (
                <div className="mt-2 p-3 bg-success/20 rounded">
                  <p className="text-sm">
                    <strong>ชื่อควาย:</strong> {registrationResult.registration.name}
                  </p>
                  <p className="text-sm">
                    <strong>เจ้าของ:</strong> {registrationResult.registration.ownerName}
                  </p>
                  <p className="text-sm">
                    <strong>Microchip:</strong> {registrationResult.registration.microchip}
                  </p>
                </div>
              )}
              <div className="card-actions justify-end">
                <button 
                  className="btn btn-success"
                  onClick={resetForm}
                >
                  ลงทะเบียนเพิ่ม
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Registration Form */}
        {selectedEvent && !registrationResult?.success && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-primary mb-4">
                แบบฟอร์มลงทะเบียนควาย
              </h2>
              
              <div className="bg-base-200 p-4 rounded-lg">
                <p className="text-sm text-neutral-content mb-4">
                  <strong>โหมด Admin:</strong> การลงทะเบียนจะถูกอนุมัติโดยอัตโนมัติ
                  {overrideDuplicate && (
                    <span className="text-warning ml-2">
                      (กำลังบันทึกข้อมูลซ้ำตามคำสั่ง Admin)
                    </span>
                  )}
                </p>
                
                <FormV3
                  userId={adminUser?.userId}
                  eventId={selectedEvent.eventId}
                  name={selectedEvent.name}
                  startAt={selectedEvent.eventAt}
                  deadline={selectedEvent.registrationDeadline ?? selectedEvent.deadline}
                  isNational={true}
                  isInHouse={false}
                  isAdminMode={true}
                  onAdminSubmit={handleAdminSubmit}
                  isRegistering={registering}
                />
                
                <div className="mt-4 text-xs text-gray-400">
                  <p>หมายเหตุ: แบบฟอร์มนี้จะใช้ข้อมูลเดียวกับการลงทะเบียนออนไลน์ แต่จะถูกอนุมัติโดยอัตโนมัติ</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



export default AdminRegistrationForm;
