// A small seeded random source (xorshift32) so a room, a patrol and a
// staged screenshot all replay the same way from one seed. Nothing that
// shapes a room ever reads Math.random.
export function makeRng(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return {
    next() {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state / 4294967296;
    },
    range(min, max) {
      return min + this.next() * (max - min);
    },
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
  };
}
