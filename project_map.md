# Project Map: jaothui-event

##  Filosofia (Philosophy)
ระบบจัดการอีเวนต์และการลงทะเบียนสำหรับการประกวดควายไทยในเครือ **เจ้าทุย (Jaothui)** เน้นความถูกต้องของข้อมูลสายพันธุ์ (Pedigree) ความโปร่งใสในการตัดสิน และความสะดวกในการลงทะเบียนทั้งสำหรับผู้ใช้ทั่วไปและเจ้าหน้าที่ (Admin) หน้างาน

- **Vibe**: Professional, Traditional yet Modernized, Secure, Scalable.
- **Core Goal**: Digital Transformation สำหรับวงการความงามควายไทย

## 🏗️ Architecture & Stack
- **Framework**: [Next.js 14](https://nextjs.org/) (T3 Stack Base - Mix of Pages/App Router)
- **Language**: [TypeScript](https://www.typescript.org/) (Strict Type Law)
- **API Strategy**: [tRPC](https://trpc.io/) (End-to-end typesafety)
- **Database / ORM**: [PostgreSQL](https://www.postgresql.org/) + [Prisma](https://www.prisma.io/)
- **Integration**:
  - [LINE LIFF](https://developers.line.biz/en/docs/liff/) (User Entry Point)
  - [Sanity CMS](https://www.sanity.io/) (Content Management)
  - [Supabase](https://supabase.com/) (Storage/Auth Helpers)
  - [Viem](https://viem.sh/) (Blockchain Verification)
- **Testing**: [Vitest](https://vitest.dev/) (Root-level TDD)

## 🗺️ Key Landmarks
- Competition authority (verified 2026-10-24, #106): Sanity `event` → national/province catalogs and `eventRegister`; Royal supplements are `eventImage`, `eventAddress`, `approvment`. Competition writes below use Sanity, not the legacy Prisma diagram.
- [src/server/admin/competition-service.ts](src/server/admin/competition-service.ts): canonical event/catalog/application/onsite/approval/export service; revision fences, idempotency and historical age preservation.
- [src/pages/api/admin/competitions/[[...path]].ts](src/pages/api/admin/competitions/[[...path]].ts): authenticated REST bridge called by dashboard; write kill switch retains read/export.
- [src/server/services/competition-policy.ts](src/server/services/competition-policy.ts), [competition-registration.service.ts](src/server/services/competition-registration.service.ts): inclusive Bangkok dates, independent signup/event closure and public/onsite eligibility.
- [src/lib/competition-classes.ts](src/lib/competition-classes.ts): versioned class codec and legacy reader; preserve during rollback.
- [src/server/admin/legacy-competition-cutover.ts](src/server/admin/legacy-competition-cutover.ts), [src/server/api/legacy-competition-procedure.ts](src/server/api/legacy-competition-procedure.ts): opt-in competition-only SSR redirects and old API guard before caller-userId authorization. `/admin/roll`, exact `tab=votes` and public signup/status/history are outside cutover.
- [docs/competition-admin-api.md](docs/competition-admin-api.md), [.env.example](.env.example): source-first release/configuration/recovery; production and real LINE/operator acceptance remain separate gates.
- [src/server/api/routers/](src/server/api/routers/): แหล่งรวม tRPC Routers (Admin, Event, Register, User)
- [src/server/services/](src/server/services/): Business Logic Layer แยกออกจาก Router (e.g., `event-visibility.service.ts`)
- [prisma/schema.prisma](prisma/schema.prisma): Database Blueprint
- [tests/](tests/): ศูนย์รวม Unit Tests (อยู่นอก `src/` ตามความต้องการของคุณนนท์)
- [sanity/](sanity/): การตั้งค่า Schema และ Content สำหรับ Sanity Studio

## � Database Schema (Prisma)
โครงสร้างข้อมูลหลักเน้นความสัมพันธ์ระหว่างเจ้าของ (User) และการลงทะเบียนอีเวนต์ (EventRegister)

```mermaid
erDiagram
    USER ||--o{ EVENT_REGISTER : "registers"
    EVENT ||--o{ EVENT_REGISTER : "has"
    VOTE_EVENT ||--o{ VOTES : "has"
    VOTES ||--o{ VOTERS : "voted_by"

    USER {
        string userId PK
        string name
        string tel
        string role
    }
    EVENT {
        int id PK
        string name
        datetime startAt
        datetime endAt
        boolean isActive
    }
    EVENT_REGISTER {
        int id PK
        int eventId FK
        string userId FK
        string name "Animal Name"
        string microchip
        string ownerName
    }
```

## �🔄 Data Flow
1. **User Side**: LINE LIFF -> [Next.js Frontend] -> [tRPC Client] -> [tRPC Router] -> [Service Layer] -> [Prisma/Sanity]
2. **Competition Admin Side (#106)**: dashboard shared login → protected server proxy → authenticated source REST bridge → canonical competition service → Sanity. Old competition admin pages/APIs disable only by explicit cutover after dashboard readiness.
3. **Storage**: [Upload Service] -> [AWS S3 / Supabase Storage]

## 🐉 Challenges & Dragons
- ** Buffalo Age Calculation**: การคำนวณอายุควายตามเกณฑ์การประกวด (ต้องแม่นยำระดับเดือน)
- **Competition Eligibility**: public signup can close before event end; onsite only through inclusive Bangkok event end day, with no extra-day mutation grace. History/read/export remain available after closure.
- **Hybrid Router**: การจัดการโปรเจกต์ที่มีทั้ง Pages Router และ App Router (Legacy vs Modern)
- **External Integration**: ความเสถียรของการเชื่อมต่อ LINE LIFF และการจัดการ Token

## 🛡️ Oracle Vows
- **Testing Required**: โค้ดที่เกี่ยวกับ Logic การคำนวณหรือสิทธิ์การมองเห็นต้องมี Unit Test คุมเสมอ
- **Service-First**: เขียน Business Logic ใน `services/` เสมอ ห้ามเขียน Logic ยาวๆ ใน Router
- **Folder Integrity**: เก็บไฟล์ทดสอบไว้ใน `tests/` ที่ Root เท่านั้น

---
*Last Updated: 2026-03-10*
