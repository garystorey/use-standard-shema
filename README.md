# useStandardSchema

<div style="max-width:100ch">

*A React hook for managing form state using any Standard Schema-compliant validator.*

[![License](https://img.shields.io/badge/license-MIT-%230172ad)](https://github.com/garystorey/use-standard-schema/blob/master/LICENSE.md)
![NPM Version](https://img.shields.io/npm/v/use-standard-schema)

---

## Table of contents

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
- [Examples](#examples)
- [API](#api)
- [Best Practices](#best-practices)
- [Feedback & Support](#feedback--support)
- [ChangeLog](#changelog)
- [License](#license)

---

## Overview

`useStandardSchema` wraps a [Standard Schema](https://standardschema.dev)–compliant form definition (e.g. Zod, Valibot, ArkType, etc.) into a React hook for form handling. It streamlines validation, state, error handling, and submission—all with type safety via the Standard Schema interface.

### Why useStandardSchema?

- Works with **any validator that implements the Standard Schema spec**
- Provides **consistent form APIs** regardless of validation library
- Built with **TypeScript support**, ensuring type-safe validation and form usage
- Integrates easily into React workflows
- Supports **nested objects** with dot notation (e.g. `"address.street1"`)

### Prerequisites

- React v18+
- TypeScript (optional, but recommended)
- A validator that implements the [Standard Schema v1 interface](https://standardschema.dev/#what-schema-libraries-implement-the-spec)

---

## Installation

```bash
npm install use-standard-schema
# or
yarn add use-standard-schema
# or
pnpm add use-standard-schema
```

---

## Usage

`useStandardSchema` pairs `getForm` for wiring the form element and `getField` for reading per-field metadata.

```tsx
import React from "react"
import { defineForm, useStandardSchema, type TypeFromDefinition } from "use-standard-schema"
import * as z from "zod"

const subscriptionForm = defineForm({
  email: {
    label: "Email",
    description: "We'll send occasional updates.",
    defaultValue: "",
    validate: z.string().email("Enter a valid email"),
  },
})

const submitHandler = (values: TypeFromDefinition<typeof subscriptionForm>) => {
  console.log("Submitted:", values)
}

export function SubscriptionForm() {
  const { getForm, getField } = useStandardSchema(subscriptionForm)
  const handlers = getForm(submitHandler)
  const email = getField("email")

  return (
    <form {...handlers}>
      <label htmlFor={email.name}>{email.label}</label>
      <input
        id={email.name}
        name={email.name}
        defaultValue={email.defaultValue}
        aria-describedby={email.describedById}
        aria-errormessage={email.errorId}
      />
      <p id={email.describedById}>{email.description}</p>
      <p id={email.errorId} role="alert">
        {email.error}
      </p>

      <button type="submit">Subscribe</button>
    </form>
  )
}
```

## Examples

Browse additional snippets in [`examples/`](examples):

- [dependent-field-validation.tsx](examples/dependent-field-validation.tsx) – Keep related selects in sync with `setField` and `setError`.
- [custom-field-component.tsx](examples/custom-field-component.tsx) – Share reusable inputs via `FieldDefinitionProps`.

### Nested object field

```tsx
import { defineForm, useStandardSchema, type TypeFromDefinition } from "use-standard-schema"
import * as z from "zod"

const addressForm = defineForm({
  address: {
    street1: { label: "Street", defaultValue: "", validate: z.string().min(2) },
  },
})

const submitHandler = (values: TypeFromDefinition<typeof addressForm>) => {
  console.log(values)
}

export function AddressForm() {
  const { getForm, getField } = useStandardSchema(addressForm)
  const handlers = getForm(submitHandler)
  const street = getField("address.street1")

  return (
    <form {...handlers}>
      <label htmlFor={street.name}>{street.label}</label>
      <input id={street.name} name={street.name} defaultValue={street.defaultValue} />
      <p>{street.error}</p>
    </form>
  )
}
```

### Error banner

```tsx
import { defineForm, useStandardSchema, type TypeFromDefinition } from "use-standard-schema"
import * as z from "zod"

const loginForm = defineForm({
  email: { label: "Email", defaultValue: "", validate: z.string().email("Required") },
  password: { label: "Password", defaultValue: "", validate: z.string().min(8, "Too short") },
})

const submitHandler = (values: TypeFromDefinition<typeof loginForm>) => {
  console.log(values)
}

export function LoginForm() {
  const { getForm, getField, getErrors } = useStandardSchema(loginForm)
  const handlers = getForm(submitHandler)
  const email = getField("email")
  const password = getField("password")
  const errors = getErrors()

  return (
    <form {...handlers}>
      {errors.length > 0 && (
        <div role="alert">
          {errors.map(({ name, error }) => (
            <p key={name}>{error}</p>
          ))}
        </div>
      )}
      <input name={email.name} defaultValue={email.defaultValue} />
      <input name={password.name} type="password" defaultValue={password.defaultValue} />
      <button type="submit">Sign in</button>
    </form>
  )
}
```

### Touched and dirty helpers

```tsx
import { defineForm, useStandardSchema, type TypeFromDefinition } from "use-standard-schema"
import * as z from "zod"

const profileForm = defineForm({
  firstName: { label: "First name", defaultValue: "Ada", validate: z.string().min(1) },
  lastName: { label: "Last name", defaultValue: "Lovelace", validate: z.string().min(1) },
})

const submitHandler = (values: TypeFromDefinition<typeof profileForm>) => {
  console.log(values)
}

export function ProfileForm() {
  const { getForm, getField, isTouched, isDirty } = useStandardSchema(profileForm)
  const handlers = getForm(submitHandler)
  const first = getField("firstName")
  const last = getField("lastName")

  return (
    <form {...handlers}>
      <p>Touched: {isTouched() ? "yes" : "no"}</p>
      <p>Dirty: {isDirty() ? "yes" : "no"}</p>
      <input name={first.name} defaultValue={first.defaultValue} />
      <input name={last.name} defaultValue={last.defaultValue} />
      <button type="submit" disabled={!isDirty()}>
        Save
      </button>
    </form>
  )
}
```

### Dependent field validation

Occasionally, manual validation is needed—especially when two fields are interdependent and the value of one field is based on a valid value in another field. The following utility functions support these scenarios:

- `resetForm` - will reset the **form state** back to the initial values.
- `validate` - a function to validate a field
- `setField` can be used to manually set a field's value and cause validation.
- `setError` - manually set or clear an error message for any registered field. Accepts either a string message, an `Error`
  instance, or an object with a `message` property.
- `toFormData` -  a function to convert the returned data to web standard FormData.

The hook can keep two fields in sync by updating the second field whenever the first one changes. The
[dependent-field-validation.tsx example](examples/dependent-field-validation.tsx) combines `setField` and `setError`
so the `state` select always reflects the currently selected `country` while surfacing meaningful manual errors.

### Valid keys

A `FormDefinition`'s key is an intersection between a valid JSON key and an HTML name attribute.

```ts

const definition = defineForm({
    prefix: z.string(),                // ✔️ valid
    "first-name": z.string(),          // ✔️ valid
    "middle_name": z.string(),         // ✔️ valid
    "last:name": z.string(),           // ✔️ valid
    "street address": z.string()       // ❌ invalid
})

```

### Using other validators

Switching to another validator is straightforward. Update the `validate` property in your form definition to call the
Standard Schema-compliant library of your choice (e.g. Zod, ArkType, Valibot). The runnable samples in
[`examples/`](examples) all demonstrate swapping validators without changing the surrounding form code.

---

## Custom Components

It is recommended to use `useStandardSchema` with your own custom React components.  This enables you to simply spread the result of the `getField` call directly without creating individual props. See [examples/custom-field-component.tsx](examples/custom-field-component.tsx) for a fully wired `TextField` abstraction that shows how to extend the returned props safely.

## API

| Hook / Function              | Description                                                                 |
|------------------------------|-----------------------------------------------------------------------------|
| `useStandardSchema(formDefinition)` | Initialize form state and validation with a form definition |
| `getForm(onSubmit)`          | Returns event handlers for the form; submit handler only fires with valid data |
| `getField(name)`             | Returns metadata for a given field (label, defaultValue, error, touched, dirty, ARIA ids) |
| `resetForm()`                | Resets all form state to initial defaults |
| `isTouched(name?)`           | Returns whether a field (or any field when omitted) has been touched |
| `isDirty(name?)`             | Returns whether a field (or any field when omitted) has been modified |
| `toFormData(data)`           | Helper to convert values to `FormData` |
| `getErrors(name?)`                | Returns an array of `{ name, error, label }` for field or form |
| `validate(name?)`            | Validates either the entire form or a single field |
| `setField(name, value)` | Sets a field’s value directly and validates it |

---

## Best Practices

- **Type Safety**: Use `TypeFromDefinition<typeof form>` for your submit handler if you need type safety. This ensures your form data matches the form definition.
- **Error Display**: Use `getErrors()` for global errors and `field.error` for field-level errors.
- **Performance**: Handlers and derived values (`getForm`, `getField`, `getErrors`) are memoized internally. You don’t need extra `useMemo` unless you’re doing heavy custom work.
- **Reset Strategy**: Call `resetForm()` after successful submission to clear touched/dirty/errors and restore defaults.
- **Nested Fields**: Use dot notation for nested keys (e.g. `"address.street1"`). TypeScript support ensures autocomplete for these paths.
- **Accessibility**: Always wire `describedById` and `errorId` into your markup to keep your forms screen-reader friendly.
  - `getField` provides `describedById` and `errorId` for use with `aria-describedby` and/or `aria-errormessage`.
  - Ensures that developers can add proper screen reader support for error messages.
  - Group-level errors can be presented with `role="alert"`.

---

## Feedback & Support

If you encounter issues or have feature requests, [open an issue](https://github.com/garystorey/use-standard-schema/issues) on GitHub.

---

## ChangeLog

- **v0.3.1** - Improve form state synchronization and ergonomics.
  - Renamed `__dangerouslySetField` to `setField` and ensured programmatic updates always mark fields touched/dirty while re-validating.
  - Reworked event handlers to merge DOM and state values on submit, clear errors on focus, and reset dirty/touched flags when inputs revert or definitions change.
  - Prevented stale validations by reusing the latest values during full-form checks and dropping dirty flags once values match their defaults.
  - Refactored the test harness into shared utilities with expanded coverage for interactions and throwing validators.
  - Updated React, TypeScript, and testing dependencies to their latest patch releases.
- **v0.3.0** - Harden validation and expose field state helpers.
  - Added `isTouched` and `isDirty` helpers to the hook return value for quick form state checks.
  - Improved validator extraction to accept broader Standard Schema shapes and gracefully surface thrown errors.
  - Simplified validation flow so blur validation only runs on dirty fields while keeping internal helpers consistent.
- **v0.2.7** - Improve error handling
  - Update the return of `getErrors` to be `{name, label, error}` for consistency.
  - `getErrors` will name accept an optional `name` prop and return only that error.
  - Add `FieldDefinitionProps` interface for easy extension for custom components.
- **v0.2.6** - Better error handling
  - Add `label` to type `ErrorEntry`. This allows users to use the label in error messages.
- **v0.2.5** - Add tests.
  - Add vitest and testing-library.
  - Add tests for all existing functionality.
  - Created a stricter `FormDefinition` type.
    - Keys must be an intersection of a valid json key and an html name attribute.
- **v0.2.4** - Improve validation.
  - remove "schema" from function names internally and externally.
  - Validation is handled consistently internally.
  - Update `getErrors` to return ordered `{ key, error }[]`.
  - fix issue with resetForm not clearing form
- **v0.2.3** - Fix recursion error in `isFormDefinition` that caused an infinite loop.
- **v0.2.2** - Fix recursion error in `flattenSchema`.
- **v0.2.1** - Rename `defineSchema` to `defineForm`. Rename `schema` to `validate`.
- **v0.2.0** - Add nested object support.
- **v0.1.0** - Initial release.

---

## License

[MIT License](./LICENSE.md)

</div>
