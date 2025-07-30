
# useStandardSchema

<div style="max-width:80ch">

*A React hook for managing form state using any Standard Schema‑compliant validator.*

[![License](https://img.shields.io/badge/license-MIT-%230172ad)](https://github.com/garystorey/usezodform/blob/master/LICENSE.md)
![NPM Version](https://img.shields.io/npm/v/us-standard-schema)

---

## Table of contents

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
- [Documentation](#documentation)
- [License](#license)

## Overview

`useStandardSchema` wraps a [Standard Schema](https://standardschema.dev)–compliant schema (e.g. Zod, Valibot, ArkType) into a React hook for form handling. It streamlines validation, state, error handling, and submission—all with type safety via the Standard Schema interface.

---

### Why useStandardSchema?

- Works with **any validator that implements the Standard Schema spec**
- Provides **consistent form APIs** regardless of validation library
- Built with **TypeScript support**, ensuring type‑safe validation and form usage
- Integrates easily into React workflows

---

### Prerequisites

- React v18+
- TypeScript (optional, but recommended)
- One or more validators implementing the Standard Schema V1 interface (e.g. Zod ≥3.24.0, ArkType v2+, etc.)

---

## Installation

```bash
npm install use-standard-shema
# or
yarn add use-standard-shema
```

---

## Usage

In this example, using [zod](https://zod.dev), and a schema that has two fields: `firstName` and `lastName`. Both fields are required and must be at least two character long.

<div style="width:100ch;margin:auto;">

```ts
import type { TypeFromSchema } from "use-standard-schema"
import { defineSchema, useStandardSchema } from "use-standard-schema"
import * as z from 'zod'

const stringSchema = z.string().min(2, "Too short").max(100, "too long")

// define the schmea 
// nested objects are supported
const nameSchema = defineSchema({
  firstName: {
    label: "First Name",  // required
    schema: stringSchema,  // required
    description: "Enter your given name"
  },
  lastName: {
    label: "Last Name",
    description : "Enter your surname"
    defaultValue: "",
    schema: stringSchema,
  },
})

// call the hook with the schema
const { getForm, getField, resetForm } = useStandardSchema(schema);

// get field data
const firstName = getField("firstName");
const lastName = getField("lastName");

// get the type from the schema
type NameFormData = TypeFromSchema<typeof nameSchema>;

// submit handler
const handleSubmit = (data: NameFormData) => {
  console.log(data);
  resetForm();
}

// get form data, accepts a submit handler.
const form = getForm(handleSubmit)

// aria-describedby field name
const firstNameDescription = `${firstName.name}-description`
const lastNameDescription = `${lastName.name}-description`

  return (
    <form {...form}>
      <div>
        <label>{firstName.label}</label>
        <input name={firstName.name}
          defaultValue={firstName.defaultValue}
          aria-describedby={firstNameDescription}
        />
        <p id={firstNameDescription}>{firstName.description}</p>
        {firstName.error !== "" && (
          <div class="error">{firstName.error}</div>
        )}
      </div>

      <div>
        <label>{lastName.label}</label>
        <input name={lastName.name}
          defaultValue={lastName.defaultValue}
          aria-describedby={lastNameDescription}
        />
        <p id={lastNameDescription}>{lastName.description}</p>
        {lastName.error !== "" && (
          <div class="error">{lastName.error}</div>
        )}
      </div>

      <button type="submit">Submit</button>
    </form>
);

```

</div>

### Update example to work with Valibot

To update the above example to use a different validation library is straightforward. The following code is all the changes necessary to use [Valibot](https://valibot.dev/).

```ts
import * as v from 'valibot'

const formData = defineSchema({
  firstName: {
    //... same as above
    schema: v.pipe(
      v.string(),
      v.minLength(2, "Too short"),
      v.maxLength(10, "Too long")
    ),
  },
  lastName: {
    //... same as above
    schema: v.pipe(
      v.string(),
      v.minLength(2, "Too short"),
      v.maxLength(10, "Too long")
    ),
  }
});

```

---

## Documentation

| Hook                | Description                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| `useStandardSchema(schema)` | Initialize form state and validation with a Standard Schema |
| `getForm` | returns the event handlers for the form for managing form state. accepts a submit handler function. |
| `getField` | returns information for the given field |
| `resetForm` | re4sets form state |
| `errors` | read only Errors mapped by field name |
| `touched` | read only Touched mapped by field name |
| `dirty` | read only Dirty mapped by field name |

---

## Feedback & Support

If you encounter issues or have feature requests, [open an issue](https://github.com/garystorey/use-standard-shema/issues) on GitHub

---

## License

[MIT License](./LICENSE)

</div>
