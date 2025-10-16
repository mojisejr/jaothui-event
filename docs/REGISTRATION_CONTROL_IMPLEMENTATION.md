# Enhanced Registration Control System Implementation

## Overview

This document describes the implementation of the enhanced event registration control system that addresses the issues identified in [ISSUE-0047]. The implementation provides separate control for registration windows independent of event status.

## Implementation Date

Implemented: 2025-10-16

## Key Features

### 1. Schema Enhancement (Sanity CMS)

**New Fields Added to Event Schema:**

- `registrationActive` (boolean): Controls whether registration is currently open
  - Default: `true` (backward compatible)
  - Description: "Controls whether registration is currently open for this event"

- `registrationStartAt` (date): When registration opens
  - Format: DD-MM-YYYY
  - Optional field
  - Description: "When registration opens for this event"

- `registrationDeadline` (date): When registration closes
  - Format: DD-MM-YYYY
  - Optional field
  - Description: "When registration closes for this event (separate from event deadline)"

**File Modified:** `/sanity/schemas/event.ts`

### 2. TypeScript Interface Updates

**Event Interface Enhanced:**

```typescript
export interface Event {
  eventId: string;
  imageUrl: string;
  name: string;
  eventAt: string;
  endAt: string;
  deadline: string;
  isActive?: boolean;
  registrationActive?: boolean;      // NEW
  registrationStartAt?: string;      // NEW
  registrationDeadline?: string;     // NEW
  metadata: string[] | null;
}
```

All new fields are optional to maintain backward compatibility with existing events.

**File Modified:** `/src/interfaces/Event.ts`

### 3. Service Layer Implementation

**New Function: `getRegistrationOpenEvents()`**

This function filters events based on comprehensive registration control logic:

```typescript
export async function getRegistrationOpenEvents() {
  // Fetches all active events from Sanity
  // Filters based on:
  // 1. registrationActive === true
  // 2. Current date >= registrationStartAt (if set)
  // 3. Current date <= registrationDeadline (if set)
  // 4. Falls back to event deadline if no registration deadline
  
  return registrationOpenEvents;
}
```

**Filtering Logic:**

1. If `registrationActive === false`: Event is excluded
2. If `registrationStartAt` is set and future: Event is excluded
3. If `registrationDeadline` is set and past: Event is excluded
4. If no `registrationDeadline` but `deadline` is past: Event is excluded
5. Otherwise: Event is included

**Files Modified:**
- `/src/server/services/event.service.ts` - Added new function and updated existing queries
- `/src/server/api/routers/event.ts` - Added new tRPC endpoint

### 4. API Endpoint Addition

**New tRPC Endpoint:**

```typescript
getRegistrationOpen: publicProcedure.query(async () => {
  return await getRegistrationOpenEvents();
});
```

This endpoint is now used by the public events listing page to show only events with open registration.

**Existing Endpoints Preserved:**
- `getAllActive`: Still returns all active events (for admin use)
- `getAll`: Still returns all events regardless of status (for admin use)
- `getById`: Now includes registration control fields

### 5. Frontend Updates

#### Events Listing Page

**File:** `/src/pages/events/index.tsx`

- Changed from `api.event.getAllActive.useQuery()` to `api.event.getRegistrationOpen.useQuery()`
- Users now only see events where registration is currently open
- Passes `registrationDeadline` to EventCard component

#### Event Card Component

**File:** `/src/components/Events/Card.tsx`

- Added `registrationDeadline` prop to interface
- Calculates effective deadline: `registrationDeadline ?? deadline`
- Uses effective deadline for registration form links and display

#### Admin Event List

**File:** `/src/components/Admin/EventList.tsx`

Enhanced admin interface with:

1. **New Column:** "สถานะรับสมัคร" (Registration Status)
2. **Status Calculation Function:** `getRegistrationStatus(event)`
3. **Status Badges:**
   - "เปิดรับสมัคร" (Open) - Info badge
   - "ปิดรับสมัคร" (Closed) - Warning badge
   - "ยังไม่เปิดรับสมัคร" (Not yet open) - Warning badge

The status function checks:
- `registrationActive === false` → "ปิดรับสมัคร"
- `registrationStartAt` > now → "ยังไม่เปิดรับสมัคร"
- `registrationDeadline` < now → "ปิดรับสมัคร"
- Otherwise → "เปิดรับสมัคร"

## Backward Compatibility

### Existing Events

All new fields are optional in the TypeScript interface. Events without the new fields will:

1. Continue to function normally
2. Default to registration being open (if `isActive === true`)
3. Use the existing `deadline` field for registration cutoff

### Migration Not Required

No database migration needed. Existing events will work with their current data structure.

## Benefits

### For Users

1. **Clear Visibility:** Only see events accepting registrations
2. **Better Experience:** No confusion about closed registrations
3. **Accurate Deadlines:** Registration deadlines separate from event dates

### For Administrators

1. **Independent Control:** Manage registration windows separately from event status
2. **Flexible Timing:** Open/close registration independent of event dates
3. **Better Visibility:** Clear status indicators for both event and registration
4. **Granular Control:** Control via three mechanisms:
   - Boolean toggle (`registrationActive`)
   - Start date (`registrationStartAt`)
   - End date (`registrationDeadline`)

### For System

1. **Separation of Concerns:** Event status ≠ Registration status
2. **Date-Based Automation:** Registration windows handled automatically
3. **Type Safety:** Full TypeScript support
4. **Maintainability:** Clear, well-documented code

## Testing Validation

### Completed
- ✅ TypeScript compilation passes
- ✅ ESLint validation passes for modified files
- ✅ No breaking changes to existing functionality
- ✅ All existing endpoints preserved

### Requires Environment
- ⚠️ Full functional testing requires Sanity CMS configuration
- ⚠️ UI validation requires database connection
- ⚠️ End-to-end testing in staging environment

## Deployment Checklist

### 1. Sanity Studio Deployment
- [ ] Deploy schema changes to Sanity Studio
- [ ] Verify new fields appear in event editor
- [ ] Test field validation and date pickers

### 2. Application Deployment
- [ ] Deploy backend changes (service layer + API)
- [ ] Deploy frontend changes (pages + components)
- [ ] Verify no runtime errors

### 3. Data Configuration
- [ ] Review existing events in Sanity CMS
- [ ] Set `registrationActive`, `registrationStartAt`, `registrationDeadline` for events as needed
- [ ] Test events appear correctly on public page

### 4. Validation Testing
- [ ] Test registration window filtering
- [ ] Verify date-based logic with different scenarios
- [ ] Test timezone handling (dates are in DD-MM-YYYY format)
- [ ] Verify backward compatibility with events without new fields

### 5. User Acceptance
- [ ] Verify public events page shows only open registrations
- [ ] Test admin panel shows all events with clear status
- [ ] Validate registration forms use correct deadlines
- [ ] Check user experience on mobile and desktop

## Usage Examples

### Example 1: Event with Registration Window

```javascript
// In Sanity CMS
{
  title: "Buffalo Competition 2025",
  isActive: true,
  registrationActive: true,
  registrationStartAt: "2025-09-01",  // Opens Sept 1
  registrationDeadline: "2025-10-15", // Closes Oct 15
  startAt: "2025-11-01",              // Event starts Nov 1
  endAt: "2025-11-03"
}
```

**Behavior:**
- Event appears on public page between Sept 1 - Oct 15
- Event remains in admin panel always
- Registration form accepts submissions until Oct 15
- Event status is independent of registration status

### Example 2: Manual Registration Control

```javascript
// In Sanity CMS
{
  title: "Special Event",
  isActive: true,
  registrationActive: false,  // Manually closed
  // No date fields set
}
```

**Behavior:**
- Event does NOT appear on public page
- Event shows "ปิดรับสมัคร" in admin panel
- Registration is closed regardless of dates

### Example 3: Legacy Event (No New Fields)

```javascript
// In Sanity CMS
{
  title: "Old Event",
  isActive: true,
  deadline: "2025-10-20"
  // registrationActive: undefined
  // registrationStartAt: undefined
  // registrationDeadline: undefined
}
```

**Behavior:**
- Falls back to old behavior
- Uses `deadline` for registration cutoff
- Appears on public page if current date < deadline

## Technical Notes

### Date Handling

- Sanity dates are stored in ISO format but displayed as DD-MM-YYYY
- JavaScript Date objects handle timezone conversion
- Comparison uses `new Date()` for current time
- Consider timezone implications for deployment

### Performance Considerations

- Filtering is done in-memory after Sanity fetch
- For large event catalogs, consider server-side filtering in GROQ query
- Current implementation suitable for moderate event counts

### Future Enhancements

Potential improvements for future iterations:

1. **Advanced Filtering:** Add GROQ-level date filtering for performance
2. **Notification System:** Alert admins when registration windows open/close
3. **Scheduled Tasks:** Automatically toggle `registrationActive` based on dates
4. **Dashboard Widgets:** Show registration status overview for admins
5. **Analytics:** Track registration rate vs. available window time
6. **Email Notifications:** Alert users when registration opens

## Related Issues

- **Resolves:** [ISSUE-0047] Event Listing Flow Issues and Registration Control Problems
- **Implements:** [TASK-0047] Enhanced Registration Control System

## Files Modified

### Schema (1 file)
- `sanity/schemas/event.ts`

### Interfaces (1 file)
- `src/interfaces/Event.ts`

### Services (1 file)
- `src/server/services/event.service.ts`

### API Routes (1 file)
- `src/server/api/routers/event.ts`

### Pages (1 file)
- `src/pages/events/index.tsx`

### Components (2 files)
- `src/components/Events/Card.tsx`
- `src/components/Admin/EventList.tsx`

**Total Files Modified:** 7

## Conclusion

This implementation provides a comprehensive solution for managing event registration windows independently of event status. The changes are minimal, focused, and maintain full backward compatibility while adding powerful new capabilities for administrators.

The system is ready for deployment to staging for testing and validation.
