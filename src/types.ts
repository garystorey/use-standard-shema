export type FieldDefinition<T = any> = {
  label: string;
  description?: string;
  default?: T;
  schema: {
    parse: (value: unknown) => T;
  };
};

export type NestedSchema = {
  [key: string]: FieldDefinition | NestedSchema | NestedSchema[];
};

export type InferValues<T extends NestedSchema> = {
  [K in keyof T]: T[K] extends FieldDefinition
    ? T[K]["default"] extends undefined
      ? any
      : T[K]["default"]
    : T[K] extends NestedSchema[]
    ? InferValues<T[K][number]>[]
    : T[K] extends NestedSchema
    ? InferValues<T[K]>
    : never;
};

export type FlattenedSchema = Record<string, FieldDefinition>;
