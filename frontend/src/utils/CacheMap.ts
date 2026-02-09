export class CacheMap<Key, Value> {
    private cache: Map<Key, Value> = new Map();

    constructor() {}

    get(key: Key): Value | undefined {
        return this.cache.get(key);
    }

    set(key: Key, value: Value) {
        this.cache.set(key, value);
    }

    delete(key: Key) {
        this.cache.delete(key);
    }

    has(key: Key) {
        return this.cache.has(key);
    }
}
