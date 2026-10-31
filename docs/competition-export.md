# รูปแบบไฟล์ส่งออกการแข่งขัน #123

`jaothui-event` เป็นเจ้าของข้อมูล การตรวจความครบถ้วน และลำดับกลุ่มส่งออก ส่วน Dashboard เป็นหน้าตั้งค่าผ่าน server-only admin bridge และสร้างไฟล์ XLSX/DOCX จากแผนที่ source ตรวจแล้ว ระบบเดียวรองรับงานเก่า/ใหม่ Normal/Royal และงานที่ยังไม่ทราบประเภท โดยไม่เดาลำดับจากชื่อหรืออายุแทนผู้จัดงาน

## ขอบเขตและความถูกต้อง

- ตั้งค่า `event.exportLayout` แยกจาก catalog รับสมัคร ไม่เปลี่ยนรุ่น สิทธิ์ อายุ วันตัดอายุ สถานะอนุมัติ/รายงานตัว หรือข้อมูลใบสมัคร
- แต่ละ event ตั้งลำดับ category, เลขรุ่นตามป้าย, ชื่อเต็ม/ชื่อย่อภาษาไทย และลำดับสี/เพศได้ แยกสีและเพศตามเดิม แม้ชื่อรุ่นระบุรวมสี
- ทุกใบสมัครต้องเข้ากลุ่มที่ตรวจแล้วหนึ่งกลุ่มพอดี รวมทุกสถานะ ทุกระดับ และหลายใบสมัครของไมโครชิพเดียวกัน ไม่ตามตัวกรองหน้ารายการ
- `rawType` เก็บค่ารุ่นต้นฉบับก่อน normalize; category ใช้ exact reviewed bindings ไม่ใช้ชื่อย่อหรืออายุเป็น identity รุ่นประวัติเดิมต้องผูกอย่างชัดเจน
- หัวตาราง ค่าควบคุม และชื่อรุ่นที่อนุมัติต้องเป็นภาษาไทย ชื่อคน/ฟาร์ม/งานและข้อมูลข้อความส่วนบุคคลคงเดิม ไม่มีการแปล free text อัตโนมัติ `white` หมายถึงขาว แยกจาก `albino` ที่หมายถึงเผือก
- หาก layout ขาด/ยังไม่ตรวจ, catalog เปลี่ยน, class binding กำกวม, ค่าควบคุมไม่ทราบคำแปล หรือ coverage ไม่ครบ จะไม่มีไฟล์บางส่วนและไม่มี generator เก่าสำรอง
- ชื่อชีตย่อส่วนชื่อรุ่นก่อน โดยคงระดับ/เลขรุ่นและคำสี/เพศมาตรฐานไว้ครบ รวม “ไม่ระบุ” ที่ตรวจแล้ว ชื่อค่าควบคุมแบบ custom ที่ยาวใช้ส่วนย่ออย่างแน่นอน แต่คำเต็มยังอยู่ในสารบัญและหัวชีต หากเลขรุ่นยาวจนส่วนจำเป็นเกิน 31 ตัว ระบบคืน `POSTER_NUMBER_TOO_LONG` ให้ย่อเลขรุ่นแทนการตัดความหมายเงียบ ๆ
- อายุใช้ค่าที่บันทึกไว้ก่อน รวม 0; หากไม่มี ใช้วันเกิดกับวันตัดอายุของงานพร้อมหมายเหตุ ไม่ใช้วันที่ดาวน์โหลด และไม่ย้ายรุ่น

## Admin API รุ่น 1

ทุกเส้นทางอยู่ใต้ `/api/admin/competitions` ต้องส่ง bearer key จาก server และคืน `Cache-Control: no-store` ห้ามนำ bridge key ไปไว้ใน browser หรือ `NEXT_PUBLIC_*`

| Method และ path | หน้าที่ |
| --- | --- |
| `GET /:id/export-layout` | คืน capability version, event/catalog, saved layout หรือ null, proposed layout, saved-layout plan, aggregate bindings และจำนวนใบสมัคร/หมายเหตุอายุ ไม่มีชื่อหรือเบอร์เจ้าของใน bindings |
| `POST /:id/export-layout/preview` | body `{layout}`; compile ร่างกับข้อมูลล่าสุด ไม่เขียนข้อมูล/audit และคืน `persisted:false` |
| `PATCH /:id/export-layout` | body `{operationId,expectedRevision,expectedCatalogFingerprint,layout}`; บันทึกเฉพาะ layout ที่ตรวจครบ พร้อม revision fences และ audit ใน transaction เดียว |
| `GET /:id/export` | คืน fresh versioned packet และ `exportPlan` ที่พร้อมใช้ ต้องส่ง `x-export-presentation-version: 1` |
| `GET /export-readiness?page=1&pageSize=20` | inventory ตาม event ID แบบแบ่งหน้า pageSize ไม่เกิน 100; คืน total/page/pageSize/hasMore และ diagnostics ที่ตัด registration IDs/ข้อมูลบุคคลออก |

Detail ใช้ `plan` จาก **saved** layout เท่านั้น ร่างใน `proposedLayout` ยังไม่ใช่รูปแบบที่อนุมัติ แม้ preview ร่างจะพร้อม บน UI ต้องบันทึกก่อนดาวน์โหลด ถ้าข้อมูลสดเปลี่ยนหลัง preview จะตรวจใหม่ตอนดาวน์โหลดเสมอ

Save ใช้ event `_rev` ที่อ่านล่าสุดเป็น `expectedRevision` และ `plan.catalogFingerprint` เป็น expected catalog fingerprint การ retry คำขอเดิมที่ไม่ทราบผลต้องใช้ operation ID และ payload เดิม การใช้ ID เดิมกับข้อมูลอื่นถูกปฏิเสธ เมื่อเกิด revision conflict ให้เก็บร่าง โหลดข้อมูลล่าสุด และตรวจเทียบก่อนสร้างคำขอใหม่

Errors ใช้ `{error:{code,message,details?:{diagnostics}}}` โดย diagnostic ระบุรายการต้องแก้ เช่น `MISSING_LAYOUT`, `STALE_CATALOG`, `AMBIGUOUS_BINDING` และ `UNKNOWN_CONTROLLED_VALUE` โปรดรักษา structured details ผ่าน Dashboard proxy/tRPC ไม่ยุบเหลือข้อความ export failed อย่างเดียว

`JAOTHUI_COMPETITION_ADMIN_WRITES_ENABLED` ควบคุม PATCH ตามเดิม ส่วน exact POST preview เป็น read-only และยังใช้ได้เมื่อปิด writes; ไม่ได้ยกเว้น auth หรือเปิด mutation ข้างเคียง

## เริ่มตั้งค่างานที่ยังไม่มี layout

1. เปิดหน้าส่งออกของงานใน Dashboard แล้วตรวจร่างที่เสนอจาก catalog กับป้ายจริง ร่างไม่สามารถรู้ลำดับที่ผู้จัดตั้งใจได้เอง
2. จัดลำดับหมวด เลขรุ่น ชื่อเต็ม/ชื่อย่อภาษาไทย และกลุ่มสี/เพศ ตรวจ exact bindings ของรุ่นเก่า ชื่อซ้ำ หรือรุ่นนอก catalog
3. เติมคำเทียบเฉพาะค่าต้นทางที่ไม่รู้จัก ห้ามเปลี่ยนความหมายค่ามาตรฐาน และใช้ “ไม่ระบุ” เฉพาะข้อมูลว่างจริงที่ตรวจแล้ว
4. ดูตัวอย่าง แก้ diagnostics จนพร้อม บันทึก แล้วโหลดกลับเพื่อตรวจ revision และลำดับที่บันทึก
5. ดาวน์โหลดจาก saved layout ที่ตรวจแล้ว รุ่นไม่มีผู้สมัครไม่สร้างชีตเปล่าและไม่เปลี่ยนเลขรุ่นอื่น งานว่างคืนสารบัญ/ข้อมูลงานที่ระบุศูนย์ใบสมัคร

Catalog edit/copy ทำให้ fingerprint เปลี่ยน ต้องตรวจ layout ใหม่ก่อนใช้งาน จึงไม่ควรสลับ catalog รับสมัครเพื่อจัดลำดับไฟล์ Clone เก็บเฉพาะข้อเสนอที่ remap ให้ event ปลายทาง (`exportLayoutDraft`) ไม่คัดลอก readiness หรือ registration IDs และต้องตรวจ/บันทึกใหม่

## จำนวนไม่ตรงหรือข้อมูลต้นทางกำลังอัปเดต

Export snapshot ตรวจ event/index revision จำนวนจาก query เดียวกับรายการจริง counter ที่มีอยู่ และอ่าน event/catalog ยืนยันอีกครั้ง หากตรวจพบ lag, truncation หรือ concurrent change จะคืน `EXPORT_SOURCE_PENDING` แทนไฟล์ ไม่แก้ counter หรือใบสมัครเอง

ให้โหลดข้อมูลใหม่ หากยังไม่ตรง ให้เจ้าหน้าที่ตรวจนับผ่าน workflow เดิมก่อนส่งออก Legacy ที่ไม่มี counter ใช้ snapshot และ revision checks โดยไม่สร้าง counter ขึ้นจากการอ่าน Inventory ระบุจำนวน/fingerprint เป็น null เมื่อยังทราบค่าอย่างสอดคล้องไม่ได้ ไม่รายงานศูนย์แทนค่าที่ไม่รู้

## Source-first rollout และ rollback

1. ตรวจ PR และ deterministic gates ของทั้ง source/Dashboard จาก commit ที่จะ release โดยใช้ [admin bridge configuration](competition-admin-api.md) เดิม ไม่มี credential migration เพิ่ม
2. Release source ก่อนและตรวจ deployment Ready จากนั้น release Dashboard consumer ที่รองรับ packet รุ่น 1
3. **ช่วงรอยต่อ source ใหม่กับ Dashboard เก่า:** export consumer ที่ไม่ส่ง exact header รุ่น 1 ได้ `503 SOURCE_UPGRADE_REQUIRED` เพื่อหยุดการสร้างไฟล์เก่าที่ผิด การอ่าน/แก้ event ทั่วไปยัง compatible ห้ามเปิด silent fallback เพียงเพื่อให้ปุ่ม download ใช้ได้
4. เมื่อ Dashboard พร้อม ตรวจ missing-layout state และตั้งค่างานที่เลือกผ่าน preview/save ตามขั้นตอนข้างต้น ไม่มี automatic bulk production configuration
5. อ่าน readiness inventory จนครบทุกหน้า เก็บเฉพาะ event/count/diagnostic summaries และยืนยันว่าไม่ข้ามหน้า ห้ามเรียก “ทุกงานเก่าพร้อมแล้ว” ถ้ายังมี layout/alias/order ที่เจ้าหน้าที่ยังไม่ตรวจ

หาก release มีปัญหา ให้หยุด export ที่ได้รับผลกระทบและใช้ reviewed revert/redeploy โดยจัดการ Dashboard ที่พึ่ง contract ก่อน source เก็บ metadata/audit และใบสมัครเดิมไว้ ใช้ current revisions เมื่อต้องคืน layout ที่ตรวจแล้ว ห้าม whole-event stale overwrite, force push หรือลบประวัติ และห้าม rollback ไป generator ที่ทราบว่าผิดพร้อมอ้าง strict correctness ต่อ

## Operator UAT หลัง production

เจ้าของ/ทีมเป็นผู้ทดสอบ browser และ Microsoft Excel จริงหลัง release ไม่มี agent browser/Excel interaction หรือ live layout writes เป็นส่วนหนึ่งของ deterministic verification นี้

- ใช้ designated event ตรวจตั้งค่า → preview → save → reload → download และตรวจชื่อ/ลำดับกับป้ายจริง ทั้ง Normal/Royal และทั้งสองระดับ
- ทดสอบ stale catalog/revision และ unknown mapping: เห็นรายการต้องแก้ เก็บร่าง โหลดข้อมูลล่าสุด และไม่มี partial download ตรวจ clone และงานใหม่ว่ายังต้องตรวจ layout
- เปิด `.xlsx` ใน Microsoft Excel บันทึก version/OS และยืนยันไม่มี repair prompt คลิกสารบัญแถวแรก/กลาง/ท้าย และ “กลับสารบัญ” ของแต่ละชีตต้องกลับแถวของตนเอง ชื่อชีตไทย มี apostrophe/ชื่อยาว/ชื่อชนกันยังนำทางถูก
- ตรวจจำนวน IDs ครบ ค่าศูนย์อายุ/อายุคำนวณ/อายุไม่ครบ หมายเหตุ สถานะทั้งงานเก่าและใหม่ ไมโครชิพ/เบอร์ที่มีศูนย์นำหน้า และไฟล์จากทั้งสอง export entry points
- เปิด DOCX ZIP ตรวจคำไทย เผือก/ขาว/ผู้/เมีย รุ่นเต็ม อายุ/หมายเหตุ และจำนวนใบสมัคร ไม่มีการแปลชื่อส่วนบุคคล
- อย่าอ้างว่า Google Sheets/Numbers ผ่านจากผล Microsoft Excel และอย่าอ้าง actual Excel click acceptance จาก XML/library roundtrip

รายงานแยก **deterministic gates passed**, **operator web/Excel acceptance pending/accepted** และ **all existing events ready/not ready** ไม่รวมเป็นคำรับรองเดียว

## Synthetic cross-repository contract

[Golden fixture](../tests/fixtures/competition-export-contract.json) สร้างจาก source functions จริงด้วยเวลาคงที่และข้อมูลจำลองเท่านั้น ครอบคลุม Normal/Royal/unknown type, raw encoded/historical classes, สองระดับ, อายุ 0/cutoff/missing และชื่อชีตยาว/apostrophe/collision โดย Normal กับ Royal ตั้งลำดับต่างกัน

[Source contract test](../tests/competition-export-contract.test.ts) อ่าน fixture อย่างเดียวแล้วตรวจ actual `toCompetitionDTO`, `exportRegistration` และ compiler ว่าให้ JSON wire packet ตรง golden Dashboard เก็บสำเนา byte-for-byte ที่ `src/test-fixtures/competition-export-contract.json` เพื่อทดสอบ binary rendering ไม่มี cross-repository imports ใน runtime หรือ CI การเปลี่ยน contract ต้อง review และอัปเดต fixture/test ทั้งสอง repository ร่วมกัน
