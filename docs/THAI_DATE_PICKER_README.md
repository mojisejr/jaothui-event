# Thai Date Picker - Quick Start Guide

## 🎯 Overview

A Thai Buddhist Era (BE) calendar date picker component for the Jaothui Event Management System. This component provides a user-friendly interface for Thai users while maintaining ISO date format for backend compatibility.

## 📁 Files

### Core Implementation
- **`src/utils/thaiDateUtils.ts`** - Date conversion utilities
- **`src/components/ThaiDatePicker.tsx`** - React date picker component
- **`src/components/Events/Formv3.tsx`** - Integration point (modified)

### Documentation
- **`docs/THAI_DATE_PICKER_IMPLEMENTATION.md`** - Detailed implementation guide
- **`docs/THAI_DATE_PICKER_UI_MOCKUP.md`** - Visual mockups and UI documentation
- **`docs/THAI_DATE_PICKER_README.md`** - This file (quick start)

## 🚀 Quick Start

### Basic Usage

```tsx
import ThaiDatePicker from "~/components/ThaiDatePicker";

function MyForm() {
  const [date, setDate] = useState("");

  return (
    <ThaiDatePicker
      value={date}
      onChange={setDate}
      required={true}
      minYear={1900}
      maxYear={2024}
    />
  );
}
```

### With React Hook Form

```tsx
import { useForm } from "react-hook-form";
import ThaiDatePicker from "~/components/ThaiDatePicker";

function MyForm() {
  const { register, watch, setValue } = useForm();

  return (
    <>
      <input type="hidden" {...register("birthDate", { required: true })} />
      <ThaiDatePicker
        value={watch("birthDate")}
        onChange={(isoDate) => setValue("birthDate", isoDate)}
        required={true}
      />
    </>
  );
}
```

## 📊 Data Format

### Input/Output Format
- **Input:** ISO 8601 date string (`YYYY-MM-DD`)
- **Output:** ISO 8601 date string (`YYYY-MM-DD`)
- **Display:** Thai format (`DD เดือนไทย พ.ศ. YYYY`)

### Example
```typescript
// User selects: 25 ธันวาคม พ.ศ. 2567
// Component outputs: "2024-12-25"

// Component receives: "2021-01-01"
// User sees: 1 มกราคม พ.ศ. 2564
```

## 🛠️ API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string?` | `undefined` | ISO date string (YYYY-MM-DD) |
| `onChange` | `(isoDate: string) => void` | `undefined` | Callback when date changes |
| `disabled` | `boolean` | `false` | Disable all dropdowns |
| `required` | `boolean` | `false` | Mark as required field |
| `className` | `string` | `""` | Additional CSS classes |
| `placeholder` | `string` | `"เลือกวันที่"` | Placeholder text |
| `minYear` | `number` | `currentYear - 100` | Minimum AD year |
| `maxYear` | `number` | `currentYear` | Maximum AD year |

### Utility Functions

```typescript
import {
  adToBe,        // Convert AD to BE year
  beToAd,        // Convert BE to AD year
  formatIsoToThai, // Format ISO to Thai display
  parseIsoDate,  // Parse ISO to components
  thaiToIso,     // Convert Thai to ISO
  THAI_MONTHS_FULL, // Full month names
  THAI_MONTHS_SHORT // Abbreviated month names
} from "~/utils/thaiDateUtils";

// Example usage
const beYear = adToBe(2024);        // 2567
const adYear = beToAd(2567);        // 2024
const thai = formatIsoToThai("2024-12-25"); // "25 ธันวาคม พ.ศ. 2567"
```

## ✅ Integration Checklist

When integrating into a new form:

1. [ ] Import `ThaiDatePicker` component
2. [ ] Create hidden input for form registration
3. [ ] Connect using `watch` and `setValue`
4. [ ] Set `required` prop if needed
5. [ ] Configure `minYear` and `maxYear` if needed
6. [ ] Test manual date selection
7. [ ] Test with auto-fill (if applicable)
8. [ ] Verify ISO format in form submission
9. [ ] Test validation rules

## 🧪 Testing

### Manual Test Steps

1. **Manual Selection**
   - Select day, month, and year
   - Verify all three dropdowns work
   - Check ISO format in console/network

2. **Auto-fill** (if applicable)
   - Trigger auto-fill mechanism
   - Verify dropdowns populate correctly
   - Check Thai date display matches data

3. **Validation**
   - Submit without selection
   - Verify required validation
   - Submit with selection
   - Verify backend receives ISO format

4. **Edge Cases**
   - Try leap year dates (Feb 29)
   - Try year boundaries (min/max)
   - Try different months
   - Verify disabled state works

## 🐛 Troubleshooting

### Date not displaying
- Check if `value` is valid ISO format (`YYYY-MM-DD`)
- Verify date is within `minYear`/`maxYear` range
- Check browser console for errors

### Auto-fill not working
- Verify `setValue` is being called
- Check hidden input is registered with react-hook-form
- Ensure ISO format string is passed

### Validation failing
- Confirm hidden input has `required` attribute
- Verify `required` prop on ThaiDatePicker
- Check form submission logic

### Wrong year displayed
- Remember: BE = AD + 543
- Check if year conversion is applied
- Verify `parseIsoDate` function

## 📝 Common Patterns

### With Default Value
```tsx
<ThaiDatePicker
  value="2024-01-01"  // Default to Jan 1, 2024
  onChange={handleChange}
/>
```

### With Date Range Limits
```tsx
<ThaiDatePicker
  minYear={2020}  // Only show 2020-2024
  maxYear={2024}
  value={date}
  onChange={setDate}
/>
```

### With Custom Styling
```tsx
<ThaiDatePicker
  className="my-custom-class"
  value={date}
  onChange={setDate}
/>
```

### Disabled State
```tsx
<ThaiDatePicker
  disabled={isLoading || isSubmitting}
  value={date}
  onChange={setDate}
/>
```

## 🎨 Styling

The component uses DaisyUI classes:
- `select` - Base select element
- `select-sm` - Small size
- `select-bordered` - Border styling
- `text-black` - Text color
- `disabled:text-slate-300` - Disabled text color
- `grid grid-cols-3 gap-2` - Layout

To customize, add your own classes via `className` prop.

## 🌐 Internationalization

Current language: Thai (ภาษาไทย)

Month names:
- มกราคม (January)
- กุมภาพันธ์ (February)
- มีนาคม (March)
- เมษายน (April)
- พฤษภาคม (May)
- มิถุนายน (June)
- กรกฎาคม (July)
- สิงหาคม (August)
- กันยายน (September)
- ตุลาคม (October)
- พฤศจิกายน (November)
- ธันวาคม (December)

## 🔄 Version History

### v1.0.0 (2025-10-16)
- ✅ Initial implementation
- ✅ Thai BE calendar support
- ✅ React Hook Form integration
- ✅ DaisyUI styling
- ✅ Full TypeScript support
- ✅ Comprehensive documentation

## 📚 Further Reading

- [Implementation Guide](./THAI_DATE_PICKER_IMPLEMENTATION.md) - Detailed technical documentation
- [UI Mockups](./THAI_DATE_PICKER_UI_MOCKUP.md) - Visual documentation and design rationale
- [Buddhist Calendar](https://en.wikipedia.org/wiki/Buddhist_calendar) - Learn about BE calendar
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) - Learn about ISO date format

## 💬 Support

For questions or issues:
1. Check this README first
2. Review [Implementation Guide](./THAI_DATE_PICKER_IMPLEMENTATION.md)
3. Check [UI Mockups](./THAI_DATE_PICKER_UI_MOCKUP.md)
4. Test in development environment
5. Report issues on GitHub

## 📄 License

This implementation follows the project's existing license.

## 👥 Authors

- GitHub Copilot Agent
- Jaothui Event Management Team

---

**Last Updated:** 2025-10-16
**Status:** ✅ Production Ready
