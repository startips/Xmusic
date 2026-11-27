export default class Event {
  listeners: Map<string, Array<(...args: any[]) => any>>
  constructor() {
    this.listeners = new Map()
  }

  on(eventName: string, listener: (...args: any[]) => any) {
    let targetListeners = this.listeners.get(eventName)
    if (!targetListeners) this.listeners.set(eventName, targetListeners = [])
    targetListeners.push(listener)
  }

  off(eventName: string, listener: (...args: any[]) => any) {
    let targetListeners = this.listeners.get(eventName)
    if (!targetListeners) return
    const index = targetListeners.indexOf(listener)
    if (index < 0) return
    targetListeners.splice(index, 1)
  }

  emit(eventName: string, ...args: any[]) {
    setImmediate(() => {
      const targetListeners = this.listeners.get(eventName)
      if (!targetListeners?.length) return
      const snapshot = [...targetListeners]
      for (const listener of snapshot) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          listener(...args)
        } catch (err) {
          console.error('[Event]', eventName, err)
        }
      }
    })
  }

  offAll(eventName: string) {
    let targetListeners = this.listeners.get(eventName)
    if (!targetListeners) return
    this.listeners.delete(eventName)
  }
}
