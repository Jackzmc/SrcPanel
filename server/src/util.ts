import { stat } from "fs/promises"
import DNS from 'dns/promises';

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

export class GenericError extends Error {
    constructor(message: string, public code: string, options?: ErrorOptions) {
        super(message, options)
    }
}

export async function doesFileExist(filename: string) {
  try {
    await stat(filename)
    return true
  } catch(err) {
    if(err.code === "ENOENT") return false
    throw err
  }
}

export async function tryResolveIPv4(host: string): Promise<string|null> {
    try {
        return resolveIPv4(host)
    } catch(err) {
        return null
    }
}
export async function resolveIPv4(host: string): Promise<string> {
    const lookup = await DNS.lookup(host, { verbatim: false, family: 4 })
    return lookup.address
}