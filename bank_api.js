// bank_api.js
require("dotenv").config({ quiet: true });
const axios = require("axios");

const BASE_URL = process.env.SUNABAR_BASE_URL;
const TOKEN = process.env.SUNABAR_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.SUNABAR_ACCOUNT_ID;

async function getBalance() {
  try {
    console.log("BASE_URL:", BASE_URL);
    console.log("ACCOUNT_ID:", ACCOUNT_ID);

    const response = await axios.get(`${BASE_URL}/accounts/balances`, {
      headers: {
        "x-access-token": TOKEN,
        "Content-Type": "application/json",
      },
      params: {
        accountId: ACCOUNT_ID,
      },
    });

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
    const dateTo = today.toISOString().slice(0, 10);

    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const dateFrom = from.toISOString().slice(0, 10);

    console.log("BASE_URL:", BASE_URL);
    console.log("ACCOUNT_ID:", ACCOUNT_ID);
    console.log("dateFrom:", dateFrom);
    console.log("dateTo:", dateTo);

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

    return rawTransactions.map((item) => ({
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
};