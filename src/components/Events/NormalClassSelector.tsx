import React from "react";
import {
  normalClassOptions,
  type NormalClassOptions,
  type NormalCompetitionLevel,
} from "~/lib/normal-competition-levels";
export function NormalClassSelector({
  options,
  level,
  value,
  loading,
  disabled,
  onLevelChange,
  onClassChange,
}: {
  options: NormalClassOptions;
  level: string;
  value: string;
  loading: boolean;
  disabled: boolean;
  onLevelChange: (level: NormalCompetitionLevel) => void;
  onClassChange: (value: string) => void;
}) {
  const classes = normalClassOptions(options, level);
  return (
    <section
      className="space-y-4 text-base"
      aria-label="เลือกระดับและรุ่นแข่งขัน"
    >
      <fieldset disabled={disabled} className="space-y-3">
        <legend className="mb-2 font-semibold text-primary">
          ระดับการแข่งขัน *
        </legend>
        <p className="text-sm">
          ระบบเลือกระดับประเทศและรุ่นตามอายุให้ก่อน
          หากต้องการสมัครระดับจังหวัดเปลี่ยนได้ที่นี่
          ควายตัวเดียวสมัครได้ทั้งสองระดับ โดยส่งใบสมัครแยกแต่ละรายการ
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["ประเทศ", "จังหวัด"] as const).map((item) => (
            <label
              key={item}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-base ${level === item ? "border-primary bg-primary/10" : "border-base-300"}`}
            >
              <input
                type="radio"
                className="radio-primary radio"
                name="normal-competition-level"
                value={item}
                checked={level === item}
                onChange={() => onLevelChange(item)}
              />
              <span>
                {item === "ประเทศ" ? "ระดับประเทศ" : "ระดับจังหวัด / ท้องถิ่น"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {!level ? (
        <p role="status" className="text-sm">
          เลือกระดับการแข่งขันก่อนเลือกรุ่น
        </p>
      ) : loading ? (
        <p role="status">กำลังตรวจสอบรุ่นที่เข้าเกณฑ์…</p>
      ) : (
        <>
          {[
            { title: "รุ่นตามอายุ", labels: classes.regular },
            { title: "รุ่นพิเศษ", labels: classes.special },
          ].map((group) => (
            <fieldset
              key={group.title}
              disabled={disabled}
              className="space-y-2"
            >
              <legend className="mb-2 font-semibold text-primary">
                {group.title} ({group.labels.length})
              </legend>
              {group.title === "รุ่นพิเศษ" ? (
                <p className="text-sm">
                  เลือกรุ่นพิเศษได้ตามคุณสมบัติ
                  ทีมงานจะตรวจเงื่อนไขเพิ่มเติมตามประกาศ
                </p>
              ) : null}
              {group.labels.length ? (
                group.labels.map((label) => (
                  <label
                    key={label}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-base ${value === label ? "border-primary bg-primary/10" : "border-base-300"}`}
                  >
                    <input
                      type="radio"
                      className="radio-primary radio shrink-0"
                      name="normal-competition-class"
                      value={label}
                      checked={value === label}
                      onChange={() => onClassChange(label)}
                    />
                    <span className="min-w-0 break-words">
                      {label.replace(/^\[SP\]\s*/, "")}
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-secondary/80">
                  ยังไม่มี{group.title}ที่ตรงกับอายุในระดับนี้
                </p>
              )}
            </fieldset>
          ))}
        </>
      )}
    </section>
  );
}
