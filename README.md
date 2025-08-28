
# useStandardSchema

<div style="max-width:100ch">

*A React hook for managing form state using any Standard Schema‑compliant validator.*

[![License](https://img.shields.io/badge/license-MIT-%230172ad)](https://github.com/garystorey/usezodform/blob/master/LICENSE.md)
![NPM Version](https://img.shields.io/npm/v/use-standard-schema)

---

## Table of contents

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
- [Documentation](#documentation)
- [License](#license)

## Overview

`useStandardSchema` wraps a [Standard Schema](https://standardschema.dev)–compliant schema (e.g. Zod, Valibot, ArkType, etc.) into a React hook for form handling. It streamlines validation, state, error handling, and submission—all with type safety via the Standard Schema interface.

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
- A validator that implements the [Standard Schema v1 interface](https://standardschema.dev/#what-schema-libraries-implement-the-spec)

---

## Installation

```bash
npm install use-standard-schema  # zod, valibot, ArkType, etc 
# or
yarn add use-standard-schema
# or
pnpm add use-standard-schema
```

---

## Usage

In this example, using [zod](https://zod.dev), and a form definition that has two fields: `firstName` and `lastName`. Both fields are required and must be at least two character long.

```ts
import { defineForm, useStandardSchema, type TypeFromDefinition } from "use-standard-schema"
import * as z from 'zod'

const stringSchema = z.string().min(2, "Too short").max(100, "too long")

// create the form definition
// nested objects are supported (address.street1)
const nameForm = defineForm({
  firstName: {
    validate: stringSchema,  // required
    label: "First Name",  // required
    description: "Enter your given name"
  },
  lastName: {
    validate: stringSchema,
    label: "Last Name", // or i18n('user.lastName'), etc
    description: "Enter your surname",
    defaultValue: "",  // an initial value can be supplied
  },
})

// get the type from the form definition
type NameFormData = TypeFromDefinition<typeof nameSchema>;

export function App() {
  // call the hook with the form definition
  const { getForm, getField, resetForm, getErrors  } = useStandardSchema(nameForm);

  // submit handler only called with valid data
  // it will match the type from the definition
  const handleSubmit = (data: NameFormData) => {
    console.log(data);
    resetForm();
  }

  // get form events
  const form = getForm(handleSubmit)
  
  // get field definitions
  const firstName = getField("firstName");
  const lastName = getField("lastName");
 
  return (
    <form {...form}>

      /* show all errors */
      {getErrors() !== "" ? (
        <div className="all-error-messages" role="alert">
          {getErrors()}
        </div>
      ) : ""}

      <div className={`field ${firstName.error !== "has-error": ""}`}>
        <label htmlFor={firstName.name}>{firstName.label}</label>
        <input name={firstName.name}
          defaultValue={firstName.defaultValue}
          aria-describedby={firstName.describedById}
          aria-errormessage={firstName.errorId}
        />
        <p id={firstName.describedById} className="description">
          {firstName.description}
        </p>
        /* an error message for a single field*/
        <p id={firstName.errorId} className="error">
          {firstName.error}
        </p>
      </div>

      <div className={`field ${lastName.error !== "has-error": ""}`}>
        <label htmlFor={lastName.name}>{lastName.label}</label>
        <input name={lastName.name}
          defaultValue={lastName.defaultValue}
          aria-describedby={lastName.describedBy}
          aria-errormessage={lastName.errorId}
        />
        <p id={lastName.describedById} className="description">
          {lastName.description}
        </p>
        /* an error message for a single field*/
        <p id={lastName.errorId} className="error">
          {lastName.error}
        </p>
      </div>

      <button type="submit">Submit</button>
    </form>
);
}

```

### Update example to work with Valibot

To update the above example to use a different validation library is straightforward. The following code is all the changes necessary to use [Valibot](https://valibot.dev/).

```ts
import * as v from 'valibot'

const formData = defineForm({
  firstName: {
    //... same as above
    validate: v.pipe(
      v.string(),
      v.minLength(2, "Too short"),
      v.maxLength(100, "Too long")
    ),
  },
  lastName: {
    //... same as above
    validate: v.pipe(
      v.string(),
      v.minLength(2, "Too short"),
      v.maxLength(100, "Too long")
    ),
  }
});

```

---

## Documentation

| Hook                | Description                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| `useStandardSchema(schema)` | Initialize form state and validation with a Standard Schema |
| `getForm` | returns the event handlers for the form for managing form state; accepts a submit handler function |
| `getField` | returns information for the given field |
| `resetForm` | resets form state |
| `errors` | read only Errors mapped by field name |
| `touched` | read only Touched mapped by field name |
| `dirty` | read only Dirty mapped by field name |
| `toFormData` | helper function to convert returned data to web standard FormData |
| `getErrors` | helper function to get all current errors |
| `validate` | helper function to manually call validation for the form or a field |
|`__setField` | helper function to set a given fields value; value will be validated. |

---

## Feedback & Support

If you encounter issues or have feature requests, [open an issue](https://github.com/garystorey/use-standard-shema/issues) on GitHub

---

## ChangeLog

- v0.2.2 - fix recursion error in `flattenSchema`
- v0.2.1 - rename `defineSchema` to `defineForm`. rename `schema` to `validate`.
- v0.2.0 - Add nested object support
- v0.1.0 - Initial release

## License

[MIT License](./LICENSE)

</div>
