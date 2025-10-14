# Jaothui Event Registration System

## Overview
This is the event registration system for Thai buffalo (Kwai Plak Thai) competitions.

## Registration Features

### Automated LINE Notification System
Upon successful registration, applicants receive an automated confirmation message via LINE with the following details:
- **Cow's Name** (ชื่อควาย)
- **Chip Number** (เลขประจำตัวสัตว์)
- **Sex** (เพศ)
- **Color** (สี)
- **Registered Class/Category** (ประเภทที่ลงสมัคร)

This system uses the LINE messaging API to send instant confirmation to registrants, similar to the implementation used in the Pak Chong event.

### Registration Types

#### 1. Regular Event Registration
- Standard registration for provincial and national level competitions
- Automatic LINE notification upon successful registration
- Registration includes all buffalo details and owner information

#### 2. Royal Event Registration
- Special registration flow for royal-level competitions
- Enhanced verification process with image upload requirements
- Includes approval workflow with status tracking
- LINE notifications sent at registration and approval stages

## On-Site Registration Procedure

For events that permit on-site registration, the following process should be followed:

### Process Steps:
1. **Use Standard Registration Link**
   - The team uses the same online registration link/system for all on-site registrations
   - This ensures data consistency and unified processing

2. **Enter Applicant Details**
   - Input all required buffalo and owner information through the standard form
   - Include all mandatory fields: name, microchip, sex, color, class, etc.

3. **Automated Notification**
   - Upon submission, applicants automatically receive a LINE confirmation message
   - The message contains all registration details for verification

4. **Unified Data Retrieval**
   - All registration data (online and on-site) is stored in the same database
   - Data retrieval is performed once at the end of the registration period
   - No separate processing required for on-site vs. online registrations

### Benefits of This Approach:
- **Single Source of Truth**: All data in one unified system
- **Consistent Experience**: Same notification process for all registrants
- **Simplified Management**: One data retrieval process at the end
- **Real-time Confirmation**: Immediate LINE notification for on-site registrants

## Technical Implementation

### LINE Notification Flow
1. Registration data is validated and saved to the database
2. A confirmation message is generated using `messageParser` or `royalMessageParser`
3. The message is sent via LINE API using the `notify` function
4. Message includes all key registration details formatted for easy reading

### Message Format
Messages are formatted in Thai with clear sections and checkmarks (✅) for easy readability:
```
🙏ขอขอบคุณ🙏
👩‍🌾คุณ [Owner Name]👨🏻‍🌾

=====================
การลงทะเบียนเข้าประกวด
=====================
งาน: [Event Name]

ชื่อควาย
✅ [Buffalo Name]

เลขประจำตัวสัตว์
✅ [Microchip Number]

เพศ
✅ [Sex]

สี
✅ [Color]

ประเภทที่ลงสมัคร
✅ [Class/Category]

ได้รับการลงทะเบียนเรียบร้อยแล้ว
```

## Development

### Prerequisites
- Node.js
- Yarn package manager
- LINE messaging API credentials
- Database connection

### Setup
```bash
yarn install
yarn dev
```

### Environment Variables
Required environment variables should be configured as per the `.env` file requirements.

## Support
For technical issues or questions about the registration system, please contact the development team.
