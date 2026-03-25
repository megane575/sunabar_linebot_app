// test-integration-bc.js
const bank = require('./bankApi');
const calc = require('./calculation');

async function test() {
  console.log("1. 銀行APIからデータを取得中...");
  const rawData = await bank.getTransactions(); // Bさんの関数を実行

  console.log("2. 取得したデータを計算ロジックに投入...");
  const result = calc.calculateMonthlySummary(rawData); // Cさんの関数を実行

  console.log("3. 最終結果:", result);
}
test();