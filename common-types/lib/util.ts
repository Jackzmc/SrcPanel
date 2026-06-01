type Callback = (...args: any[]) => (void | Promise<void>)
export function debounce(callback: Callback, delay = 300) {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: any[]) => {
    clearTimeout(timeout)
    // @ts-ignore this is fine
    const context = this
    timeout = setTimeout(() => callback.apply(context, args), delay)
  }
}
