/// <reference path="../.astro/types.d.ts" />

type D1Database = {
  prepare: (query: string) => {
    all: <T = unknown>() => Promise<{ results?: T[] }>;
    bind: (...values: unknown[]) => ReturnType<D1Database["prepare"]>;
    first: <T = unknown>() => Promise<T | null>;
    run: () => Promise<unknown>;
  };
};

declare namespace App {
  interface Locals {
    runtime?: {
      env?: {
        DB?: D1Database;
      };
    };
  }
}
