'use babel'

/**
 * Poll periodically, resolving a promise when a condition is met or rejecting
 * it when a timeout is reached.
 *
 * @param {Function} fn The evaluation function returning whether done.
 * @param {object} options The options: interval, timeout (both in ms).
 * @returns {Promise} Resolves to the fn value on success, rejects on timeout.
 */
export default async function asyncPoll (fn, options) {
  const { interval, timeout } = options

  let timeoutReached = false

  const worker = new Promise((resolve) => {
    // repeat until timeout or resolve
    const intv = setInterval(() => {
      if (timeoutReached) {
        clearInterval(intv)
        return
      }
      if (fn()) {
        resolve()
        clearInterval(intv)
      }
    }, interval)
  })

  // set flag on timeout
  const rejecter = new Promise((resolve, reject) => {
    setTimeout(() => {
      timeoutReached = true
      reject(new Error('Timeout reached'))
    }, timeout)
  })

  return Promise.race([worker, rejecter])
}
