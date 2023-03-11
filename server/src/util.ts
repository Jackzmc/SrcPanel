// Replaces any member of T that is set in replace, ignoring undefined
export function replaceObject<T>(original: T, replace: Partial<T>): T {
    let obj = original
    for(const [key, value] of Object.entries(replace)) {
        if(value === undefined) continue
        obj[key] = value
    }
    return obj
}