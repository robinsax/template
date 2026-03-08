export class MutationError extends Error {
    key: string;

    constructor(key: string) {
        super(key);
        this.key = key;
    }
}
