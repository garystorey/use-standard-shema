# use-standard-schema

<div style="max-width:80ch">

[![License](https://img.shields.io/badge/license-MIT-%230172ad)](https://github.com/garystorey/usezodform/blob/master/LICENSE.md)

<!-- ![NPM Version](https://img.shields.io/npm/v/usezodform) -->

A React hook that provides a simple way to manage form state using any [standard schema](https://standardschema.dev) compliant validator including zod, valibot and ArkType.

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
<!-- - [Documentation](#documentation)
- [Upgrade Guide](#upgrade-guide)
- [License](#license) -->

## Installation

To install `use-standard-schema`, use your preferred package manager, such as `npm`, `pnpm`, `bun` or `yarn`. The example below uses `npm`.

```bash
npm install use-standard-schema
```

## Quick start

In this example, using [zod](https://zod.dev), and a schema that has two fields: `firstName` and `lastName`. Both fields are required and must be at least two character long.

<div style="width:100ch;margin:auto;">

```ts
import type { TypeFromSchema } from "use-standard-schema"
import { defineSchema, useStandardSchema } from "use-standard-schema"
import * as z from 'zod'

const stringSchema = z.string().min(2, "Too short")

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
    schema: stringSchema.maxLength(100, "Too long"),
  },
})

// call the hook with the schema
const { getForm, getField } = useStandardSchema(schema);

// get field data
const firstName = getField("firstName");
const lastName = getField("lastName");

// get the type from the schema
type NameFormData = TypeFromSchema<typeof nameSchema>;

// submit handler
const handleSubmit = (data: NameFormData) => console.log(data);

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

</div>
