import { useState, useCallback } from "react";
import { flattenSchema, setValue } from "./helpers";
import { NestedSchema, InferValues } from "./types";

export function useStandardForm<T extends NestedSchema>(schema: T) {
  type Values = InferValues<T>;
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
      error: errors[path],
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

  return {
    values,
    errors,
    validate,
    reset,
    getForm,
    getField,
  };
}
