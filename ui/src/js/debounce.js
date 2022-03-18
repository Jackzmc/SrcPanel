export default function (callback, delay=300) {
  let timeout = null
  return (...args) => {
      clearTimeout(timeout)
      const context = this
      timeout = setTimeout(() => callback.apply(context, args), delay)
  }
}
