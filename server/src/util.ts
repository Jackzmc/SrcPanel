import { stat } from "fs/promises"
import DNS from 'dns/promises';

// Replaces any member of T that is set in replace, ignoring undefined
export function replaceObject<T>(original: T, replace: Partial<T>): T {
    const obj = original
    for(const [key, value] of Object.entries(replace)) {
        if(value === undefined) continue
        obj[key] = value
    }
    return obj
}

// Gets any changed members of compare<T> that are different than original<T>
export function computeChanges<T>(original: T, compare: T): Partial<T> {
    const obj: Partial<T> = {}
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

/**
 * Looks up only IPv4 addresses
 * 
 * Intended for source engine game servers as they do not support ipv6 
 * 
 * @param host hostname to resolve
 * @returns address if found
 */
export async function resolveIPv4(host: string): Promise<string> {
    const lookup = await DNS.lookup(host, { verbatim: false, family: 4 })
    return lookup.address
}
/**
 * Attempts to resolve an IPv4 Address or returns null if not found.
 * 
 * @throws on any other DNS lookup error
 * 
 * Intended for source engine game servers as they do not support ipv6 
 * 
 * @param host hostname to resolve
 * @returns ipv4 address or null if none resolved
 */
export async function tryResolveIPv4(host: string): Promise<string|null> {
    try {
        return await resolveIPv4(host)
    } catch(err) {
        if(err.code != "ENOTFOUND") throw err
        return null
    }
}

export class ErrorWithCode extends Error {
    code: string
    constructor(_code: string, message: string) {
        super(message)
        this.code = _code
    }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const unixTimestamp = () => Math.floor(Date.now() / 1000)