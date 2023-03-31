// Replaces any member of T that is set in replace, ignoring undefined
export function replaceObject<T>(original: T, replace: Partial<T>): T {
    let obj = original
    for(const [key, value] of Object.entries(replace)) {
        if(value === undefined) continue
        obj[key] = value
    }
    return obj
}

// Gets any changed members of compare<T> that are different than original<T>
export function computeChanges<T>(original: T, compare: T): Partial<T> {
    let obj: Partial<T> = {}
    for(const key in original) {
        if(original[key] !== compare[key]) {
            obj[key] = compare[key]
        }
    }
    return obj
}