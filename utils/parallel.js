/**
 * @template T
 * @template K
 * @function parallel
 * @param { T[] } arr
 * @param { (arg: T) => Promise<K> } fn
 * @param { number } [max]
 * @returns { Promise<K[]> }
 */
const parallel = (arr, fn, max = 5) => new Promise(res => {
  // console.log('p', arr.length, arr[0])
  let ctr = 0;
  let cur = 0;
  let total = 0;
  const results = new Array(arr.length);
  const next = async () => {
    if (arr[cur]) {
      fn(arr[cur]).then(result => {
        results[cur] = result;
        total += 1;
        if (total === arr.length) res(results);
        next()
      })
    } else {
      ctr--;
      if (ctr === 0) return res(results);
    }
    cur++;
  };
  for (let i = 0; i < max; i++) {
    ctr++;
    if (arr[cur]) {
      fn(arr[cur]).then(result => {
        results[cur] = result;
        total += 1;
        if (total === arr.length) res(results);
      }).then(next);
    } else {
      ctr--;
      if (ctr === 0) return res(results);
    }
    cur++;
  }
});

module.exports = parallel
