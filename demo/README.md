# useStandardSchema Demo

## Running the Demo

```bash
npm run demo
```

Then open http://localhost:5173 in your browser.

## Demo Features

### 📊 Side-by-Side Comparison
Shows the difference between the old way (sync validation only) and new way (sync + async validation).

**Old Way Problems:**
- Username availability only checked after form submission
- Poor user experience - users find out too late
- Requires separate API call logic
- More complex error recovery

**New Way Benefits:**
- Real-time username availability checking
- Email domain verification during typing
- Loading states with "Checking..." indicators
- Automatic request cancellation for fast typing
- Better user experience - fix errors before submit

### 🚀 Full Async Demo
Complete signup form with:
- Username availability checking (tries: admin, user, test are taken)
- Email domain blocking (tries: tempmail.com is blocked)
- Password strength validation
- All with loading states and real-time feedback

## Key Implementation Details

### Adding Async Validation
```typescript
const form = defineForm({
  username: {
    label: "Username",
    validate: z.string().min(3),  // Sync validation first
    validateAsync: async (value) => {  // Then async
      const available = await checkAvailability(value)
      return available ? {} : { error: "Username taken" }
    }
  }
})
```

### Using Loading States
```tsx
const field = getField("username")

{field.validating === "true" && <span>Checking...</span>}
{field.error && <span>{field.error}</span>}
```

## Business Value

1. **Reduced Failed Submissions**: Users fix errors before submitting
2. **Better UX**: Real-time feedback instead of submit-error-retry loops
3. **Cleaner Code**: Validation logic stays with field definition
4. **Progressive Enhancement**: Works without breaking existing forms
5. **Automatic Optimizations**: Request cancellation, debouncing built-in