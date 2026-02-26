type Callback = (...args: any[]) => (void | Promise<void>)
export default function (callback: Callback, delay = 300) {
  let timeout: number
  return (...args: any[]) => {
    clearTimeout(timeout)
    // @ts-expect-error this is fine
    const context = this
    timeout = setTimeout(() => callback.apply(context, args), delay)
  }
}
