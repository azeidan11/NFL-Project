// Custom unordered map with chaining and a sorted key index
export class CustomMap {
  constructor(bucketCount = 97) {
    this.buckets = Array.from({ length: bucketCount }, () => []);
    this.keyList = [];
    this.keySet = new Set();
  }
  hash(key) {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 131 + key.charCodeAt(i)) >>> 0;
    return h % this.buckets.length;
  }
  insert(key, value) {
    const i = this.hash(key);
    const bucket = this.buckets[i];
    const hit = bucket.findIndex(p => p.key === key);
    if (hit >= 0) { bucket[hit].value = value; return false; }
    bucket.push({ key, value });
    if (!this.keySet.has(key)) { this.keySet.add(key); this.keyList.push(key); }
    return true;
  }
  find(key) {
    const i = this.hash(key);
    const bucket = this.buckets[i];
    const pair = bucket.find(p => p.key === key);
    return pair ? pair.value : undefined;
  }
  erase(key) {
    const i = this.hash(key);
    const bucket = this.buckets[i];
    const hit = bucket.findIndex(p => p.key === key);
    if (hit < 0) return false;
    bucket.splice(hit, 1);
    if (this.keySet.delete(key)) {
      const j = this.keyList.indexOf(key);
      if (j >= 0) this.keyList.splice(j, 1);
    }
    return true;
  }
  sortedKeys() {
    return [...this.keyList].sort((a, b) => a.localeCompare(b));
  }
  size() { return this.keyList.length; }
  empty() { return this.size() === 0; }
}