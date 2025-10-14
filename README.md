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
- [Feedback & Support](#feedback--support)
- [Changelog](#changelog)
- [License](#license)

---

## Overview

`useStandardSchema` wraps a [Standard Schema](https://standardschema.dev)-compliant form definition (e.g. Zod, Valibot, ArkType, etc.) into a React hook for form handling. It streamlines validation, state, error handling, and submission with type safety via the Standard Schema interface.

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

Define your form once with `defineForm`, then consume it inside a component with `useStandardSchema`.

```tsx
import { defineForm, useStandardSchema, type TypeFromDefinition } from "use-standard-schema"
import * as z from "zod"

const subscriptionForm = defineForm({
  email: {
    label: "Email",
    validate: z.string().email("Enter a valid email address"),
    defaultValue: "",
    description: "We'll send occasional updates.",
  },
})

type SubscriptionForm = TypeFromDefinition<typeof subscriptionForm>

export function SubscriptionForm() {
  const { getForm, getField } = useStandardSchema(subscriptionForm)
  const form = getForm((values: SubscriptionForm) => {
    console.log("Submitted:", values)
  })
  const email = getField("email")

  return (
    <form {...form}>
      <label htmlFor={email.name}>{email.label}</label>
      <input
        id={email.name}
        name={email.name}
        defaultValue={email.defaultValue}
        aria-describedby={email.describedById}
        aria-errormessage={email.errorId}
      />
      {email.description && <p id={email.describedById}>{email.description}</p>}
      {email.error && (
        <p id={email.errorId} role="alert">
          {email.error}
        </p>
      )}
      <button type="submit">Subscribe</button>
    </form>
  )
}
```

- **`getForm(onSubmit)`**: Spread onto `<form>`; your handler runs only when the data is valid.
- **`getField(name)`**: Supplies the field metadata (`name`, `defaultValue`, `error`, ARIA ids`) you spread onto inputs and messages.
- **`getErrors(name?)`**: Returns structured errors you can surface in toast notifications or summaries.

## Examples

Browse additional snippets in [`examples/`](examples):

- [dependent-field-validation.tsx](examples/dependent-field-validation.tsx) - An example that keeps two related fields in sync using `setField` and `setError`.
- [custom-field-component.tsx](examples/custom-field-component.tsx) - Share reusable inputs via `FieldData`.
- [valibot-login.tsx](examples/valibot-login.tsx) - Build a simple login form powered by Valibot validators.

### Nested object fields

Nested objects are supported.

```tsx
import { defineForm } from "use-standard-schema"
import * as z from "zod"

const addressForm = defineForm({
  address: {
    street1: { label: "Street", defaultValue: "", validate: z.string().min(2) },
  },
})

```

### Error handling

`useStandardSchema` returns the `getErrors` method that returns all of the current validations errors. This can be useful for giving all form error messages in one location. Additionally, the `getField` method returns the errors for the given field.

```tsx

const { getErrors, type ErrorInfo } = useStandardSchema(loginForm)
const errors = getErrors()

{errors.length > 0 && (
<div role="alert">
{errors.map(({ name, label, error }: ErrorInfo) => (
    <p key={name}>{label}: {error}</p>
))}
</div>
)}
```

### Touched and dirty helpers

Use the `isTouched` and `isDirty` helper methods to check whether or not the form, or a given field, has been modified or focused by the user.

```tsx
  const { isTouched, isDirty } = useStandardSchema(addressForm)

  const isStreetTouched = isTouched("address.street1")
  const isStreetDirty = isDirty("address.street1")

  const isFormTouched = isTouched()
  const isFormDirty = isDirty()
```

### Dependent field validation

Occasionally, manual validation is needed, especially when two fields are interdependent and the value of one field depends on a valid value in another field. The following utility functions support these scenarios:

- `resetForm` - will reset the **form state** back to the initial values.
- `setField` can be used to manually set a field's value and cause validation.
- `setError` - manually sets or clears an error message for any registered field. Accepts either a string message, an `Error`
  instance, or an object with a `message` property.
- `toFormData` -  a function to convert the returned data to web standard FormData.

The hook can keep two fields in sync by updating the second field whenever the first one changes. The
[dependent field validation example](examples/dependent-field-validation.tsx) combines `setField` and `setError` so that a `region/state` select always reflects the currently selected `country` while surfacing meaningful manual errors.

### Valid keys

A `FormDefinition`'s key is an intersection between a valid JSON key and an HTML name attribute.

```ts

const formDefinition = defineForm({
    prefix: z.string(),                // valid
    "first-name": z.string(),          // valid
    "middle_name": z.string(),         // valid
    "last:name": z.string(),           // valid
    "street address": z.string()       // invalid
})

```

### Using other validators

Switching to another validator is straightforward. Update the `validate` property in your form definition to call the
Standard Schema-compliant library of your choice (e.g. Zod, ArkType, Valibot). A [`valibot example`](examples/valibot-login.tsx) is also available.

---

## Custom Components

It is recommended to use `useStandardSchema` with your own custom React components.  This enables you to simply spread the result of the `getField` call directly without creating individual props. See the [custom component example](examples/custom-field-component.tsx) for a fully wired `TextField` abstraction that shows how to extend the returned props safely.

## API

`useStandardSchema` returns a toolbox of helpers for wiring form elements, reading state, and issuing manual updates.

### `useStandardSchema(formDefinition)`

Create the hook by passing a `defineForm` definition. The return value exposes the rest of the helpers documented below.

```ts
const { getForm, getField, getErrors, setField, setError, resetForm, isTouched, isDirty } =
  useStandardSchema(myFormDefinition)
```

### `getForm(onSubmit)`

Returns the props you spread onto `<form>`. It validates all fields and only invokes your handler when everything passes.

```tsx
const form = getForm((values) => console.log(values))

return <form {...form}>...</form>
```

### `getField(name)`

Returns metadata and ARIA ids for a specific field so you can wire inputs, labels, and helper text.

```tsx
const email = getField("email")

<input
  name={email.name}
  defaultValue={email.defaultValue}
  aria-describedby={email.describedById}
  aria-errormessage={email.errorId}
/>
{email.error && <span id={email.errorId}>{email.error}</span>}
```

### `setField(name, value)`

Updates a field's value programmatically (for dependent fields, custom widgets, or multi-step wizards) and re-validates it.

```ts
setField("address.postalCode", nextPostalCode)
```

### `setError(name, error)`

Surfaces a manual error message for any field. Pass `null` or `undefined` to clear it.

```ts
setError("email", new Error("Email already registered"))
```

### `getErrors(name?)`

Returns structured `{ name, label, error }` entries for the whole form or for one specific field - perfect for summary banners or toast notifications.

```ts
const allErrors = getErrors()
const emailErrors = getErrors("email")
```

### `resetForm()`

Clears errors, touched/dirty flags, and restores the original defaults. The hook calls this automatically after a successful submit, but you can use it for explicit "Start over" buttons.

```ts
resetForm()
```

### `isTouched(name?)` and `isDirty(name?)`

Report whether a field - or any field when called without arguments - has been interacted with or changed.

```ts
const hasEditedAnything = isDirty()
const isEmailTouched = isTouched("email")
```

### `toFormData(data)`

Helper that converts a values object into a browser `FormData` instance for interoperability with fetch/XHR uploads.

```ts
const formData = toFormData(values)
```

## Feedback & Support

If you encounter issues or have feature requests, [open an issue](https://github.com/garystorey/use-standard-schema/issues) on GitHub.

---

## Changelog

- **v0.4.0** - Improved form state synchronization, renamed the `FieldDefinitionProps` type to `FieldData`, and ensured programmatic updates stay validated while tracking touched/dirty status.
- [View the full changelog](./CHANGELOG.md) for earlier releases.

---

## License

[MIT License](./LICENSE.md)

</div>
