export const queries = {
    foo: () => {},
    bar: () => {}
} satisfies Record<string, () => void>;

export type QueryKey = keyof typeof queries;
