export function IncludeModel<T extends new (...args: any[]) => {}>(constructor: T) {
    return constructor;
}
