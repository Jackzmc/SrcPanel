import { readFileSync } from 'fs'

export type PolicyRules = Record<string, number | boolean>
export type Policies = Record<string, PolicyRules>
export interface BlockEntry {
    type: string,
    value: string,
    reason?: string,
    algorithm?: string,
    shares?: string[]
}

export interface Config {
    longRefreshIntervalSeconds: number,
    shortRefreshIntervalSeconds: number,
    policies: Policies,
    blocklist: BlockEntry
}

export default function() {

    const data = readFileSync('../../../config.json')
    const json = JSON.parse(data.toString())

    return json as Partial<Config>

}