// Type-only shim so shared edge modules type-check under Node/Vitest.
declare const Deno: { env: { get(key: string): string | undefined } };
