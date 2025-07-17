import { useState, useCallback } from "react";
import { flattenSchema, setValue } from "./helpers";
import { NestedSchema, InferType } from "./types";

export type { NestedSchema, InferType } from "./types";

export function useStandardSchema<T extends NestedSchema>(schema: T) {
  type Values = InferType<T>;
  const flatSchema = flattenSchema(schema);

  const initialValues = Object.fromEntries(
    Object.entries(flatSchema).map(([key, def]) => [key, def.default ?? ""])
  );

  const [flatValues, setFlatValues] =
    useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const values = Object.keys(flatValues).reduce((acc, path) => {
    return setValue(acc, path, flatValues[path]);
  }, {} as Values);

  const handleChange = useCallback(
    (path: string, value: any) => {
      setFlatValues((prev) => ({ ...prev, [path]: value }));
      try {
        flatSchema[path].schema.parse(value);
        setErrors((prev) => ({ ...prev, [path]: undefined }));
      } catch (err: any) {
        setErrors((prev) => ({
          ...prev,
          [path]: err?.message || "Invalid value",
        }));
      }
    },
    [flatSchema]
  );

  const handleFocus = useCallback((path: string) => {
    setErrors((prev) => ({ ...prev, [path]: undefined }));
  }, []);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    for (const path in flatSchema) {
      try {
        flatSchema[path].schema.parse(flatValues[path]);
      } catch (err: any) {
        newErrors[path] = err?.message || "Invalid value";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [flatSchema, flatValues]);

  const reset = useCallback(() => {
    setFlatValues(initialValues);
    setErrors({});
  }, [initialValues]);

  function getForm(onValid: (data: Values) => void) {
    return {
      onSubmit: (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
          onValid(values);
        }
      },
      onReset: (e: React.FormEvent) => {
        e.preventDefault();
        reset();
      },
    };
  }

  const getField = (path: string) => {
    const field = flatSchema[path];
    return {
      name: path,
      label: field.label,
      description: field.description,
      value: flatValues[path],
      error: getErrorMessage(path),
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      ) => handleChange(path, e.target.value),
      onFocus: () => handleFocus(path),
      onBlur: () => {
        try {
          field.schema.parse(flatValues[path]);
        } catch (err: any) {
          setErrors((prev) => ({
            ...prev,
            [path]: err?.message || "Invalid value",
          }));
        }
      },
    };
  };

  const getError = (path?: string) => {
    if (path) {
      return errors[path];
    }
    return Object.entries(errors).reduce(
      (acc, [key, error]) => ({ ...acc, [key]: error }),
      {}
    );
  };

  // a function that will return only a string contain all the errors for a given path or the entire form if no path is provided
  // the errors are in this format [ { "code": "too_small", "minimum": 2, "type": "string", "inclusive": true, "exact": false, "message": "Too short", "path": [] } ], [ { "code": "too_small", "minimum": 2, "type": "string", "inclusive": true, "exact": false, "message": "Too short", "path": [] } ], [ { "code": "custom", "message": "Select A State", "path": [] } ]
  // convert the format to a single string with each error on a new line
  const getErrorMessage = (path?: string) => {
    if (path) {
      return errors[path] || "";
    }
    const res = Object.entries(errors)
      .map(([key, error]) => `${key}: ${error}`)
      .join("\n");

    const updated = Object.entries(res).reduce((acc, [key, error]) => {
      if (error) {
        acc[key] = error;
      }
      return acc;
    }, {} as Record<string, string>);
    return updated;
  };

  const getValue = (path: string) => {
    if (!path) return values;
    return flatValues[path];
  };

  const isDirty = useCallback(
    (path: string) => {
      if (!path)
        return Object.keys(flatValues).some(
          (key) => flatValues[key] !== initialValues[key]
        );
      return flatValues[path] !== initialValues[path];
    },
    [flatValues, initialValues]
  );

  return {
    isDirty,
    getErrorMessage,
    getError,
    getValue,
    validate,
    reset,
    getForm,
    getField,
  };
}
