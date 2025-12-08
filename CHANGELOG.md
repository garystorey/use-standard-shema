# Changelog

All notable changes to this project will be documented in this file.

## 0.4.4

- Added a React 19 + Server Actions example demonstrating shared validation between client and server.
- Updated the README to document the React 19 server action flow and point to the dedicated example.
- Exposed `validateField` and `validateForm` helpers for reusing form validators outside the React hook.

## 0.4.3

- Fixed documentation issues.
- Restored the missing `ErrorEntry` export.

## 0.4.2

- Added `watchValues` for monitoring value changes without rerender.
- Fixed issue with `ErrorInfo` not being exported.
- Made field updates safer, provided default fallbacks for validation errors, and prevented async checks from overwriting newer input.
- Added a shadcn/ui Field example.
- Added additional tests to keep real-world flows covered.

## 0.4.1

- Broaden React peer dependency support to include React 18.

## 0.4.0

- Improve form state synchronization and ergonomics.
  - **Breaking**: Removed the imperative `validate()` method from the hook return; rely on `setField`, `setError`, and `getErrors()` for manual flows.
  - Renamed the field payload type to `FieldData` (previously `FieldDefinitionProps`).
  - Added a Valibot example.
  - Renamed `__dangerouslySetField` to `setField` and ensured programmatic updates always mark fields touched/dirty while re-validating.
  - Prevented stale validations by reusing the latest values during full-form checks and dropping dirty flags once values match their defaults.
  - Refactored the test harness into shared utilities with expanded coverage for interactions and throwing validators.
  - Updated React, TypeScript, and testing dependencies to their latest patch releases.

## 0.3.0

- Harden validation and expose field state helpers.
  - **Breaking**: Removed `dirty` and `touched` objects.
  - Added `isTouched` and `isDirty` helpers to the hook return value for quick form state checks.
  - Improved validator extraction to accept broader Standard Schema shapes and gracefully surface thrown errors.
  - Simplified validation flow so blur validation only runs on dirty fields while keeping internal helpers consistent.

## 0.2.7

- Improve error handling.
  - Update the return of `getErrors` to be `{ name, label, error }` for consistency.
  - `getErrors` will now accept an optional `name` prop and return only that error.
  - Add field metadata typing for easy extension of custom components.

## 0.2.6

- Better error handling.
  - Add `label` to type `ErrorEntry`. This allows users to use the label in error messages.

## 0.2.5

- Add tests.
  - Add vitest and testing-library.
  - Add tests for all existing functionality.
  - Create a stricter `FormDefinition` type.
    - Keys must be an intersection of a valid JSON key and an HTML name attribute.

## 0.2.4

- Improve validation.
  - Remove "schema" from function names internally and externally.
  - Handle validation consistently internally.
  - Update `getErrors` to return ordered `{ key, error }[]`.
  - Fix issue with `resetForm` not clearing the form.

## 0.2.3

- Fix recursion error in `isFormDefinition` that caused an infinite loop.

## 0.2.2

- Fix recursion error in `flattenSchema`.

## 0.2.1

- Rename `defineSchema` to `defineForm`. Rename `schema` to `validate`.

## 0.2.0

- Add nested object support.

## 0.1.0

- Initial release.
