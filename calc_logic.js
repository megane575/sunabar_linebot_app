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

/* 明細一覧から月次の集計を計算する */
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

/*「明細」コマンドメッセージを作成 */
function formatMonthlySummaryJa(summary) {
  const { totalIncome, totalExpense, net } = summary;
  return (
    `【今月の集計】\n` +
    `収入: ${totalIncome.toLocaleString("ja-JP")} 円\n` +
    `支出: ${totalExpense.toLocaleString("ja-JP")} 円\n` +
    `収支: ${net.toLocaleString("ja-JP")} 円`
  );
}

/*「残高」コマンドメッセージを作成 */
function formatBalanceAndSummaryJa(summary, currentBalanceAmount) {
  const I = summary.totalIncome;
  const E = summary.totalExpense;
  const B = toAmount(currentBalanceAmount);

  const lines = [];
  lines.push(`現在の残高: ${B.toLocaleString("ja-JP")} 円`);
  lines.push(`---`);
  lines.push(`今月の総収入: ${I.toLocaleString("ja-JP")} 円`);
  lines.push(`今月の総支出: ${E.toLocaleString("ja-JP")} 円`);

  return lines.join("\n");
}

/*「定期通知用」前日の集計メッセージを作成 */
function formatDailyReportJa(transactions, currentBalance) {
  // 前日の日付を取得
  const now = new Date();
  // JST補正 (+9時間) してから1日引く
  const yesterday = new Date(
    now.getTime() + 9 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000,
  );
  console.log("now:", now);
  console.log("yesterday:", yesterday);

  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let yesterdayIn = 0;
  let yesterdayOut = 0;

  // 前日のデータのみ抽出して集計
  if (Array.isArray(transactions)) {
    for (const t of transactions) {
      if (t.date === yesterdayStr) {
        const amount = toAmount(t.amount);
        if (t.transactionType === "in") yesterdayIn += amount;
        if (t.transactionType === "out") yesterdayOut += amount;
      }
    }
  }

  const B = toAmount(currentBalance);
  const lines = [`現在の残高：${B.toLocaleString("ja-JP")}円`, "ーーー"];

  if (yesterdayIn === 0 && yesterdayOut === 0) {
    // 両方動きがない場合
    lines.push("前日の入出金はありません");
  } else {
    //　入金の表示
    if (yesterdayIn > 0) {
      lines.push(`前日の入金：${yesterdayIn.toLocaleString("ja-JP")}円`);
    } else {
      lines.push("前日の入金：ありません");
    }
    // 出金の表示
    if (yesterdayOut > 0) {
      lines.push(`前日の出金：${yesterdayOut.toLocaleString("ja-JP")}円`);
    } else {
      lines.push("前日の出金：ありません");
    }
  }

  return lines.join("\n");
}

module.exports = {
  calculateMonthlySummary,
  formatMonthlySummaryJa,
  formatDailyReportJa,
  formatBalanceAndSummaryJa,
  toAmount,
  isInMonth,
};
