export function getUnixSeconds() {
    return Math.floor(Date.now()/1000)
}

export interface TimeOptions {
    seconds?: number,
    minutes?: number,
    hours?: number
    days?: number
}

export function calculateDate(startDate: Date, timeOptions: TimeOptions) {
    const endDate = new Date(startDate)
    if(timeOptions.seconds) endDate.setSeconds(endDate.getSeconds() + timeOptions.seconds)
    if(timeOptions.minutes) endDate.setMinutes(endDate.getMinutes() + timeOptions.minutes)
    if(timeOptions.hours) endDate.setHours(endDate.getHours() + timeOptions.hours)
    if(timeOptions.days) endDate.setDate(endDate.getDate() + timeOptions.days)
    
    // console.debug(startDate, endDate, endDate.valueOf() - startDate.valueOf())
    return endDate
}