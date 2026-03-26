// bank_api.js
require("dotenv").config({ quiet: true });
const axios = require("axios");

const BASE_URL = process.env.SUNABAR_BASE_URL;
const TOKEN = process.env.SUNABAR_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.SUNABAR_ACCOUNT_ID;

// JSTで YYYY-MM-DD を作る関数
function formatDateJST(date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getBalance() {
  try {
    const response = await axios.get(`${BASE_URL}/accounts/balances`, {
      headers: {
        "x-access-token": TOKEN,
        "Content-Type": "application/json",
      },
      params: {
        accountId: ACCOUNT_ID,
      },
    });

    // balances[0] が無いときのガード
    if (!response.data?.balances?.length) {
      throw new Error("残高データが取得できませんでした");
    }

    const balanceInfo = response.data.balances[0];

    return {
      amount: Number(balanceInfo.balance),
      date: balanceInfo.baseDate,
    };
  } catch (error) {
    console.error("残高取得エラー");
    console.error("status:", error.response?.status);
    console.error("data:", error.response?.data);
    throw error;
  }
}

async function getTransactions() {
  try {
    const today = new Date();
    const dateTo = formatDateJST(today);

    // JST基準の「当月1日」
    const jstToday = new Date(today.getTime() + 9 * 60 * 60 * 1000);
    const firstDay = new Date(
      Date.UTC(jstToday.getUTCFullYear(), jstToday.getUTCMonth(), 1)
    );
    const dateFrom = formatDateJST(firstDay);

    const response = await axios.get(`${BASE_URL}/accounts/transactions`, {
      headers: {
        "x-access-token": TOKEN,
        "Content-Type": "application/json",
      },
      params: {
        accountId: ACCOUNT_ID,
        dateFrom,
        dateTo,
      },
    });

    const rawTransactions = response.data.transactions || [];

    return rawTransactions
      .filter((item) => item.transactionType === "1" || item.transactionType === "2")
      .map((item) => ({
        transactionType: item.transactionType === "1" ? "in" : "out",
        amount: Number(item.amount),
        date: item.transactionDate,
        }));
  } catch (error) {
    console.error("明細取得エラー");
    console.error("status:", error.response?.status);
    console.error("data:", error.response?.data);
    throw error;
  }
}

async function test() {
  console.log("=== 残高テスト ===");
  const balance = await getBalance();
  console.log(balance);

  console.log("=== 明細テスト ===");
  const transactions = await getTransactions();
  console.log(transactions);
}

if (require.main === module) {
  test().catch((err) => {
    console.error("テスト失敗:", err.message);
  });
}

module.exports = {
  getBalance,
  getTransactions,
  formatDateJST,
};