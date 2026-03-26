/**
 * 収支計算（Cさん / ちびすけ）
 *
 * データ形式（bank_api.js → calc_logic.js）
 * [
 *   {
 *     transactionType: "out",   // "out" = 支出, "in" = 収入
 *     amount: 5000,
 *     date: "2026-03-24"
 *   }
 * ]
 */

function toAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isInMonth(dateStr, year, month) {
  if (!dateStr || typeof dateStr !== "string") return false;
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return dateStr.startsWith(prefix);
}

function calculateMonthlySummary(transactions, options = {}) {
  const now = new Date();
  const year = options.year ?? now.getFullYear();
  const month = options.month ?? now.getMonth() + 1;

  const empty = {
    totalIncome: 0,
    totalExpense: 0,
    net: 0,
    countIn: 0,
    countOut: 0,
  };

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return empty;
  }

  let totalIncome = 0;
  let totalExpense = 0;
  let countIn = 0;
  let countOut = 0;

  for (const t of transactions) {
    if (!isInMonth(t.date, year, month)) continue;

    const amount = toAmount(t.amount);
    if (t.transactionType === "in") {
      totalIncome += amount;
      countIn += 1;
    } else if (t.transactionType === "out") {
      totalExpense += amount;
      countOut += 1;
    }
  }

  return {
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    countIn,
    countOut,
  };
}

function formatMonthlySummaryJa(summary) {
  const { totalIncome, totalExpense, net } = summary;
  return (
    `【今月の集計】\n` +
    `収入: ${totalIncome.toLocaleString("ja-JP")} 円\n` +
    `支出: ${totalExpense.toLocaleString("ja-JP")} 円\n` +
    `収支: ${net.toLocaleString("ja-JP")} 円`
  );
}

function formatIncomeExpenseNoticeJa(summary, currentBalance) {
  const I = summary.totalIncome; // 今月の収入合計
  const E = summary.totalExpense; // 今月の支出合計

  // 要件: 入出金が0件なら固定文言
  if (I === 0 && E === 0) return "入出金ありませんでした";

  const currentBalanceAmount =
    typeof currentBalance === "number"
      ? currentBalance
      : toAmount(currentBalance?.amount);
  const B = toAmount(currentBalanceAmount);

  const lines = [];
  lines.push("【残高・収支確認】");

  if (Number.isFinite(B)) {
    lines.push(`現在の残高: ${B.toLocaleString("ja-JP")} 円`);
    lines.push("---");

    // 月初残高 O = B - I + E
    const O = B - I + E;

    if (I > 0) {
      lines.push(`収入: ${I.toLocaleString("ja-JP")} 円`);
      // 収入を加えた後の残高 = O + I (= B + E)
      lines.push(
        `収入を加えた後の残高: ${(O + I).toLocaleString("ja-JP")} 円`
      );
    }

    if (E > 0) {
      // 収入がある場合は区切って見やすく
      if (I > 0) lines.push("---");
      lines.push(`出金: ${E.toLocaleString("ja-JP")} 円`);
      // 出金を引いた後の残高 = O + I - E (= B)
      lines.push(
        `出金を引いた後の残高: ${(O + I - E).toLocaleString("ja-JP")} 円`
      );
    }
  } else {
    if (I > 0) lines.push(`収入: ${I.toLocaleString("ja-JP")} 円`);
    if (E > 0) lines.push(`出金: ${E.toLocaleString("ja-JP")} 円`);
    lines.push("---");
    lines.push("※現在残高を取得できないため、段階の残高は表示できません。");
  }

  return lines.join("\n");
}

const sampleTransactionsForTest = [
  { transactionType: "out", amount: 5000, date: "2026-03-24" },
  {
    transactionType: "in",
    amount: 200000,
    date: "2026-03-24",
    content: "給与",
  },
  {
    transactionType: "out",
    amount: 1200,
    date: "2026-02-10",
    content: "先月分",
  },
];

module.exports = {
  calculateMonthlySummary,
  formatMonthlySummaryJa,
  formatIncomeExpenseNoticeJa,
  toAmount,
  isInMonth,
  sampleTransactionsForTest,
};
