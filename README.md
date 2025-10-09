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

Example using [zod](https://zod.dev). This form has a single `email` field that is required.

```tsx
import { defineForm, useStandardSchema, type TypeFromDefinition } from "use-standard-schema"
import * as z from "zod"

const emailForm = defineForm({
  email: {
    validate: z.email(),  // required
    label: "Email Address",     // required
    description: "Enter your email address to continue" // optional
    defaultValue: ""  //optional
  }
})

export function App() {

  const { getForm, getField } = useStandardSchema(emailForm);

  const handleSubmit = (data: TypeFromDefinition<typeof emailForm>) => console.log(data);
  
  const email = getField("email")

  return (
    <form {...getForm(handleSubmit)}>

      <div className={`field ${email.error ? "has-error" : ""}`}>
        <label htmlFor={email.name}>{email.label}</label>
        <input
          name={email.name}
          defaultValue={email.defaultValue}
          aria-describedby={email.describedById}
          aria-errormessage={email.errorId}
        />
        <p id={email.describedById} className="description">
          {email.description}
        </p>
        <p id={email.errorId} className="error">
          {email.error}
        </p>
      </div>

      <button type="submit">Submit</button>

    </form>
  )
}

```

## Examples

### Nested object field

Dot notation is supported automatically:

```ts
const addressForm = defineForm({
  address: {
    street1: {
      validate: z.string().min(2, "Too short"),
      label: "Street Address",
    },
  },
});

const streetField = getField("address.street1");
```

### Error Handling

You can show all errors in one place using the `getError` method.  
**Note**: `getError` can be used to get a single fields error as well.

```tsx
const allErrors = getError()

{allErrors.length > 0 && (
<div className="all-error-messages" role="alert">
    {allErrors.map(({ name, error, label }) => (
    <p key={name}>{label} is {error}</p>
    ))}
</div>
)}
```

### Touched and Dirty

The hook returns helpers that expose the field/form's `touched` and `dirty` state so you can react to
user interaction.

```tsx
const { isTouched, isDirty } = useStandardSchema(nameForm);

const hasUserInteracted = isTouched(); // true if any registered field has received focus
const hasUnsavedChanges = isDirty(); // true if any registered field value differs from its default

// Narrow the checks to a specific field
const firstNameTouched = isTouched("firstName");
const lastNameDirty = isDirty("lastName");
```

### Manual Validation

Occasionally, manual validation is needed. For instance, if two fields are interdependent and the value of one field is based on a valid value in another field.  The following utility functions are available to help with this scenario:

- `resetForm` - will reset the **form state** back to the initial values.
- `validate` - a function to validate a field
- `__dangerouslySetField` can be used to manually set a fields value and cause validation.
- `toFormData` -  a function to convert the returned data to web standard FormData.

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

Switching to another validator is straightforward. Simply update `validate` in the form definition.
Here is the example above using [Valibot](https://valibot.dev/).

```ts
import * as v from 'valibot'

const validString = v.pipe(
    v.string(),
    v.minLength(2, "Too short"),
    v.maxLength(100, "Too long")
)

// showing the updated form definition for completeness.  
// no real changes here
const formData = defineForm({
  email: {
    //... the same as previous example
    validate: validString,
  }
});

```

In this instance, we simply update the `validString` validator from `zod` to `valibot`.
`formDefinition` does not change.

---

## Custom Components

It is recommended to use `useStandardSchema` with your own custom React components.  This enables you to simply spread the result of the `getField` call directly without creating individual props. You can extend the `FieldDefinitionProps` interface provided.

```ts
import type { FieldDefinitionProps } from "use-standard-schema"

interface FieldProps extends FieldDefinitionProps {
    // your props here
}

// or

type FieldProps = FieldDefinitionProps & {
    // your props here
}


<Field {...getField("firstName")} />
<Field {...getField("lastName")} />

```

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
| `__dangerouslySetField(name, value)` | Sets a field’s value directly and validates it |

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
