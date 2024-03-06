import { APIUser } from "./User.js"

export interface APIEvent {
    id: number,
    creator: APIUser,
    name: string,
    description?: string
    range: [number|null, number|null]
}
export interface APIEventDetailed<T extends string | boolean[]> extends APIEvent {
    weeks: APIWeekAvailability<T>[]
}
export interface APIUserAvailability<T extends string | boolean[]> {
    user: APIUser
    data: T
}
export interface APIBaseWeek {
    startDate: number,
    endDate: number,
}
export interface APIWeekAvailability<T extends string | boolean[]> extends APIBaseWeek {
    startDate: number,
    endDate: number,
    availability: APIUserAvailability<T>[]
}
export interface EventDataSubmission<T extends string | boolean[]> {
    weeks: {
        startDate: number,
        data: T
    }[]
}