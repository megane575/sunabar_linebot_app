// transfer_api.js
require("dotenv").config({ quiet: true });
const axios = require("axios");

const BASE_URL = process.env.SUNABAR_BASE_URL;

// 固定の振込先（まずは1件）
const FIXED_TRANSFER_DEST = {
  beneficiaryBankCode: "0310",
  beneficiaryBranchCode: "301",
  accountTypeCode: "1",
  accountNumber: "0000277",
  beneficiaryName: "ｽﾅﾊﾞ ﾂｷﾞｵ",
};

// JSTで YYYY-MM-DD を返す
function formatDateJST(date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 翌営業日を返す（土日だけ考慮）
function getNextBusinessDayJST() {
  const date = new Date();

  while (true) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) break; // 日曜=0, 土曜=6
  }

  return formatDateJST(date);
}

async function requestTransfer(
  sunabarAccessToken,
  sunabarAccountId,
  amount = 30000,
) {
  try {
    if (!sunabarAccessToken) {
      throw new Error("sunabarAccessToken が指定されていません");
    }

    if (!sunabarAccountId) {
      throw new Error("sunabarAccountId が指定されていません");
    }

    const safeAmount = Number(amount);

    if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
      throw new Error("振込金額が不正です");
    }

    const transferDesignatedDate = getNextBusinessDayJST();

    const payload = {
      accountId: sunabarAccountId,
      transferDesignatedDate,
      transferDateHolidayCode: "1",
      totalCount: "1",
      totalAmount: String(safeAmount),
      transfers: [
        {
          itemId: "1",
          transferAmount: String(safeAmount),
          beneficiaryBankCode: FIXED_TRANSFER_DEST.beneficiaryBankCode,
          beneficiaryBranchCode: FIXED_TRANSFER_DEST.beneficiaryBranchCode,
          accountTypeCode: FIXED_TRANSFER_DEST.accountTypeCode,
          accountNumber: FIXED_TRANSFER_DEST.accountNumber,
          beneficiaryName: FIXED_TRANSFER_DEST.beneficiaryName,
        },
      ],
    };

    const response = await axios.post(
      `${BASE_URL}/transfer/request`,
      payload,
      {
        headers: {
          "x-access-token": sunabarAccessToken,
          "Content-Type": "application/json; charset=UTF-8",
          Accept: "application/json; charset=UTF-8",
        },
      },
    );

    return {
      accountId: response.data.accountId,
      resultCode: response.data.resultCode,
      applyNo: response.data.applyNo,
      requestedAmount: safeAmount,
      transferDesignatedDate,
    };
  } catch (error) {
    console.error("振込依頼エラー");
    console.error("status:", error.response?.status);
    console.error("data:", error.response?.data);
    throw error;
  }
}

module.exports = {
  requestTransfer,
  formatDateJST,
  getNextBusinessDayJST,
};