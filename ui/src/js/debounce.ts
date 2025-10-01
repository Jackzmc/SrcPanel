type Callback = () => void
export default function (callback: Callback, delay=300) {
  let timeout: number
  return (...args: any[]) => {
      clearTimeout(timeout)
      /* eslint-disable */
      // @ts-expect-error this is fine
      const context = this
      // @ts-expect-error this is fine
      timeout = setTimeout(() => callback.apply(context, args), delay)
  }
}
