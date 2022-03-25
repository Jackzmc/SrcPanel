import { readFileSync } from 'fs'

export interface Config {
    addonsDirectory: string,
}

export default function() {

    const data = readFileSync('../../../config.json')
    const json = JSON.parse(data.toString())

    return json as Partial<Config>

}