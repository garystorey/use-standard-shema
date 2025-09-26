# useStandardSchema

<div style="max-width:100ch">

A React hook for managing form state in under 4 kB (minified + gzipped) using any [Standard Schema](https://standardchema.dev) definition.

[![License](https://img.shields.io/badge/license-MIT-%230172ad)](./LICENSE.md)
[![npm version](https://img.shields.io/npm/v/use-standard-schema)](https://www.npmjs.com/package/use-standard-schema)

## Table of contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Defining forms](#defining-forms)
- [Using the hook](#using-the-hook)
- [API reference](#api-reference)
  - [defineForm](#defineform)
  - [useStandardSchema](#usestandardschema)
  - [Field helpers](#field-helpers)
  - [State helpers](#state-helpers)
  - [toFormData](#toformdata)
  - [Exported types](#exported-types)
- [Validator compatibility](#validator-compatibility)
- [Custom field components](#custom-field-components)
- [Best practices](#best-practices)
- [Feedback & support](#feedback--support)
- [Changelog](#changelog)
- [License](#license)

---

## Overview

`useStandardSchema` provides a consistent form experience no matter which Standard Schema–compatible validator you use (Zod, Valibot, ArkType, Vine, and more). The hook flattens nested fields, tracks interaction state, and surfaces accessible metadata so you can focus on rendering UI.

### Key features

- Works with any validator that implements the Standard Schema v1 interface.
- Strong TypeScript support with inferred form data and field names.
- Automatic handling for nested objects via dot notation (`"address.street1"`).
- Accessible defaults: generated `aria-describedby` / `aria-errormessage` ids, descriptive labels, and error helpers.
- Straightforward field metadata: labels, descriptions, errors, and accessibility helpers are generated for you.

### Requirements

- React 18+
- Optional but recommended: TypeScript 5+
- A validator that implements the Standard Schema v1 contract

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

## Quick start

Below is a minimal example using [Zod](https://zod.dev). The same approach works with any Standard Schema validator. Prefer a live demo? Explore the [CodeSandbox example](https://codesandbox.io/p/sandbox/github/garystorey/use-standard-schema/tree/main).

```tsx
import {
  defineForm,
  useStandardSchema,
  type FieldDefintionProps,
  type TypeFromDefinition,
} from "use-standard-schema"
import * as z from "zod"

const formDefinition = defineForm({
  firstName: {
    label: "First name",
    description: "Enter your given name",
    validate: z.string().min(2, "Too short").max(100, "Too long"),
  },
  lastName: {
    label: "Last name",
    description: "Enter your family name",
    validate: z.string().min(2, "Too short"),
    defaultValue: "",
  },
})

type NameFormData = TypeFromDefinition<typeof formDefinition>

type FieldState = Pick<FieldDefintionProps, "error" | "touched" | "dirty">

const getFieldClassName = ({ error, touched, dirty }: FieldState) =>
  ["field", error && "field--error", touched && "field--touched", dirty && "field--dirty"]
    .filter(Boolean)
    .join(" ")

export function ExampleForm() {
  const { getForm, getField } = useStandardSchema(formDefinition)

  const form = getForm((data: NameFormData) => {
    console.log("Submitted", data)
  })

  const firstName = getField("firstName")
  const lastName = getField("lastName")

  return (
    <form {...form}>
      <div className={getFieldClassName(firstName)}>
        <label htmlFor={firstName.name}>{firstName.label}</label>
        <input
          name={firstName.name}
          defaultValue={firstName.defaultValue}
          aria-describedby={firstName.describedById}
          aria-errormessage={firstName.errorId}
        />
        <p id={firstName.describedById}>{firstName.description}</p>
        <p id={firstName.errorId}>{firstName.error}</p>
      </div>

      <div className={getFieldClassName(lastName)}>
        <label htmlFor={lastName.name}>{lastName.label}</label>
        <input
          name={lastName.name}
          defaultValue={lastName.defaultValue}
          aria-describedby={lastName.describedById}
          aria-errormessage={lastName.errorId}
        />
        <p id={lastName.describedById}>{lastName.description}</p>
        <p id={lastName.errorId}>{lastName.error}</p>
      </div>

      <button type="submit">Submit</button>
    </form>
  )
}
```

---

## Defining forms

Create a form definition with `defineForm`. Each property represents a field, and nested objects are supported.

```ts
const profileForm = defineForm({
  email: {
    label: "Email",
    validate: z.string().email(),
  },
  address: {
    street1: {
      label: "Street address",
      validate: z.string().min(2, "Too short"),
    },
  },
})
```

Field definitions support the following shape:

```ts
{
  label: string
  validate: StandardSchemaValidator
  description?: string
  defaultValue?: string
}
```

> **Naming rules:** Keys must be valid JSON keys *and* valid HTML `name` attributes. Use hyphens, underscores, and colons freely (`"user-name"`, `"settings:theme"`), but avoid spaces.

### Nested fields

Nested objects are automatically flattened using dot notation. In the `profileForm` example above, call `getField("address.street1")` to access the nested field.

---

## Using the hook

`useStandardSchema(formDefinition)` returns a collection of helpers. The pattern is:

1. Call `getForm` to obtain event handlers for `<form>`.
2. Call `getField("fieldName")` to retrieve metadata for inputs.
3. Use helper methods (`getErrors`, `isValid`, etc.) to drive UI state.

Validation runs automatically as users blur fields or submit the form. Reach for the `validate(name)` helper only when two fields are linked (for example, confirming that a password matches a confirmation field) and one field must re-check another’s value on demand.

### Submission flow

`getForm` returns `{ onSubmit, onFocus, onBlur, onReset }`. Attach the spread result to your `<form>` element. When the form submits:

- Validation runs for all fields.
- The provided submit callback receives `TypeFromDefinition<typeof formDefinition>` data.
- If validation passes, internal state resets and the native form is reset.

---

## API reference

### defineForm

```ts
const contactFormDefinition = defineForm({
  firstName: {
    label: "First name",
    validate: firstNameValidator, // created with your validator of choice
  },
})
```

- **Parameters:** A plain object whose properties are field definitions or nested form groups.
- **Returns:** The same definition with enhanced type inference for dot-path field names and form values.
- **Use it to:**
  - Enforce valid field keys at compile time.
  - Share a single definition between the hook, validators, and type helpers.

### useStandardSchema

```ts
const formApi = useStandardSchema(formDefinition)
```

- **Parameters:** `formDefinition` – a form definition created with `defineForm`.
- **Returns:** An object with the helpers described below. All helpers are memoized, so you can destructure safely inside components.

### Field helpers

| Helper | Description |
| --- | --- |
| `getForm(onSubmit)` | Returns `{ onSubmit, onFocus, onBlur, onReset }`. The submit handler only fires when the entire form is valid. |
| `getField(name)` | Returns metadata for a specific field, including `label`, `description`, `defaultValue`, `name`, `error`, `dirty`, `touched`, `describedById`, and `errorId`. Throws if the field does not exist. |
| `__dangerouslySetField(name, value)` | Imperatively update a field, mark it dirty/touched, and run validation. Useful for custom inputs. |
| `validate(name)` | Re-run validation for a specific field when it depends on the value of another field. For general submission or blur validation, rely on the hook’s built-in behavior. |
| `getErrors(name?)` | Returns an array of `{ name, label, error }`. Pass a field name to limit the result to a single entry. |

### State helpers

| Helper | Description |
| --- | --- |
| `resetForm()` | Reset values, errors, and interaction flags back to defaults. |
| `isDirty(name?)` | Boolean flag indicating whether the form or a specific field has diverged from `defaultValue`. |
| `isTouched(name?)` | Boolean flag indicating whether the form or a specific field has received focus. |
| `isValid(name?)` | Boolean flag indicating whether the form or a specific field currently has errors. Does **not** trigger validation. |
| `getDirty()` | Returns a frozen object map of dirty flags keyed by field name. |
| `getTouched()` | Returns a frozen object map of touched flags keyed by field name. |

### toFormData

```ts
import { useStandardSchema, toFormData, type TypeFromDefinition } from "use-standard-schema"

// formDefinition created with defineForm(...) earlier in your module
const { getForm } = useStandardSchema(formDefinition)

type MyFormData = TypeFromDefinition<typeof formDefinition>

const submitHandler = (data: MyFormData) => {
  const formData = toFormData(data)
  return fetch("/api/profile", { method: "POST", body: formData })
}

const form = getForm(submitHandler)
```

- Call `toFormData` inside the submit handler you pass to `getForm` to turn the submitted values into [`FormData`](https://developer.mozilla.org/docs/Web/API/FormData) for APIs that expect web-standard payloads.
- The helper accepts the exact object received by your submit handler (often inferred with `TypeFromDefinition`), so no additional mapping is required.

> **Environment note:** `toFormData` relies on the global `FormData` constructor. In SSR or other non-browser runtimes, supply a polyfill such as `undici` or `formdata-node` before calling this helper.

### Exported types

- `FieldDefinition` – shape of an individual field configuration.
- `FormDefinition` – recursive type used by `defineForm`.
- `TypeFromDefinition<T>` – infers the submit handler payload based on `T`.

---

## Validator compatibility

Switching validators only requires updating the `validate` property. For example, here’s the quick start form rewritten with [Valibot](https://valibot.dev):

```ts
import { defineForm } from "use-standard-schema"
import * as v from "valibot"

const formDefinition = defineForm({
  firstName: {
    label: "First name",
    description: "Enter your given name",
    validate: v.pipe(
      v.string(),
      v.minLength(2, "Too short"),
      v.maxLength(100, "Too long"),
    ),
  },
  lastName: {
    label: "Last name",
    description: "Enter your family name",
    validate: v.pipe(v.string(), v.minLength(2, "Too short")),
  },
})
```

The rest of your component code stays the same.

---

## Custom field components

Create reusable input components by extending the field metadata returned from `getField`.

```tsx
import {
  defineForm,
  useStandardSchema,
  type FieldDefintionProps,
} from "use-standard-schema"
import * as z from "zod"

const formDefinition = defineForm({
  firstName: {
    label: "First name",
    description: "Enter your given name",
    validate: z.string().min(2, "Too short"),
  },
})

type FieldState = Pick<FieldDefintionProps, "error" | "touched" | "dirty">

const getFieldClassName = ({ error, touched, dirty }: FieldState) =>
  ["field", error && "field--error", touched && "field--touched", dirty && "field--dirty"]
    .filter(Boolean)
    .join(" ")

function Example() {
  const { getField } = useStandardSchema(formDefinition)

  type TextFieldProps = FieldDefintionProps & {
    labelSuffix?: string
  }

  const TextField = ({
    labelSuffix,
    describedById,
    errorId,
    error,
    dirty,
    touched,
    name,
    label,
    description,
    defaultValue,
  }: TextFieldProps) => {
    const wrapperClassName = getFieldClassName({ error, touched, dirty })

    return (
      <div className={wrapperClassName}>
        <label htmlFor={name}>
          {label}
          {labelSuffix ? <span aria-hidden="true"> {labelSuffix}</span> : null}
        </label>
        <input
          name={name}
          defaultValue={defaultValue}
          aria-describedby={describedById}
          aria-errormessage={errorId}
        />
        {description ? <p id={describedById}>{description}</p> : null}
        <p id={errorId}>{error}</p>
      </div>
    )
  }

  return <TextField {...getField("firstName")} labelSuffix="(optional)" />
}
```

---

## Best practices

- **Infer types once.** Use `TypeFromDefinition<typeof formDefinition>` in submit handlers to keep form data strongly typed.
- **Display global errors.** `getErrors()` gives you an ordered list to display at the top of the form or inside `role="alert"` containers.
- **Lean on accessibility helpers.** Wire `describedById` and `errorId` into your markup to improve screen reader support.
- **Check interaction state sparingly.** `isDirty`, `isTouched`, and the corresponding `getDirty`/`getTouched` helpers are memoized—use them instead of your own derived state.
- **Reset intentionally.** `resetForm()` clears values, errors, and interaction state. Additional validation only needs to run when linked fields depend on one another—call `validate(name)` in those rare cases.

---

## Feedback & support

Found a bug or have a feature request? [Open an issue](https://github.com/garystorey/use-standard-schema/issues) and let us know.

---

## Changelog

- **v0.3.0** – Metadata and error-handling improvements. Added `isDirty`, `isTouched`, `isValid`, and boolean flags on `getField`.
- **v0.2.7** – `getErrors` now returns `{ name, label, error }` and accepts a field filter. Added `FieldDefinitionProps` for custom components.
- **v0.2.6** – Added labels to `ErrorEntry` for easier messaging.
- **v0.2.5** – Introduced Vitest, added tests, and tightened the `FormDefinition` type.
- **v0.2.4** – Unified validation APIs, improved `getErrors` ordering, and fixed `resetForm` state handling.
- **v0.2.3** – Fixed recursion in `isFormDefinition` that caused infinite loops.
- **v0.2.2** – Fixed recursion in `flattenSchema`.
- **v0.2.1** – Renamed `defineSchema` → `defineForm` and `schema` → `validate`.
- **v0.2.0** – Added nested object support.
- **v0.1.0** – Initial release.

---

## License

[MIT](./LICENSE.md)

</div>
