type Callback = () => void
export default function (callback: Callback, delay=300) {
  let timeout: number
  return (...args: any[]) => {
      clearTimeout(timeout)
      /* eslint-disable */
      const context = this
      timeout = setTimeout(() => callback.apply(context, args), delay)
  }
}
