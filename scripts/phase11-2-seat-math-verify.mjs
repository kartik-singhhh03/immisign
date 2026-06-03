#!/usr/bin/env node
const INCLUDED = 3;
const BASE = 49;
const SEAT = 10;

function additionalSeats(n) {
  return Math.max(0, n - INCLUDED);
}
function monthly(n) {
  return BASE + additionalSeats(n) * SEAT;
}

const cases = [
  [0, 0, 49],
  [1, 0, 49],
  [2, 0, 49],
  [3, 0, 49],
  [4, 1, 59],
  [5, 2, 69],
];

let failed = 0;
for (const [billable, expAdd, expPrice] of cases) {
  const add = additionalSeats(billable);
  const price = monthly(billable);
  const ok = add === expAdd && price === expPrice;
  console.log(`${ok ? 'PASS' : 'FAIL'} billable=${billable} additional=${add} price=$${price}`);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
