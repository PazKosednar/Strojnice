/** Binary min-heap of integer values ordered by a numeric key (typed arrays, grows on demand). */
export class MinHeap {
  private keys = new Float64Array(1024)
  private values = new Int32Array(1024)
  private count = 0

  get size(): number {
    return this.count
  }

  push(key: number, value: number) {
    if (this.count === this.keys.length) {
      const keys = new Float64Array(this.count * 2)
      keys.set(this.keys)
      this.keys = keys
      const values = new Int32Array(this.count * 2)
      values.set(this.values)
      this.values = values
    }
    let i = this.count++
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.keys[parent]! <= key) break
      this.keys[i] = this.keys[parent]!
      this.values[i] = this.values[parent]!
      i = parent
    }
    this.keys[i] = key
    this.values[i] = value
  }

  /** Removes and returns the value with the smallest key (undefined when empty). */
  pop(): number | undefined {
    if (this.count === 0) return undefined
    const top = this.values[0]!
    const lastKey = this.keys[--this.count]!
    const lastValue = this.values[this.count]!
    let i = 0
    for (;;) {
      const left = 2 * i + 1
      if (left >= this.count) break
      const right = left + 1
      const child = right < this.count && this.keys[right]! < this.keys[left]! ? right : left
      if (this.keys[child]! >= lastKey) break
      this.keys[i] = this.keys[child]!
      this.values[i] = this.values[child]!
      i = child
    }
    this.keys[i] = lastKey
    this.values[i] = lastValue
    return top
  }
}
