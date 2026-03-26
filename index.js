"use strict";

const line = require("@line/bot-sdk");
const bankApi = require("./bank_api");
const logic = require("./calc_logic");

const config = {
  channelSecret: process.env.channelSecretLINE,
  channelAccessToken: process.env.channelAccessTokenLINE,
};

const client = new line.Client(config);

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event));

  // --- 1. 定期実行（Event Bridge） ---
  if (
    event.source === "aws.events" ||
    event["detail-type"] === "Scheduled Event"
  ) {
    const userId = process.env.MY_USER_ID;
    try {
      const balanceData = await bankApi.getBalance();
      const transactions = await bankApi.getTransactions();

      // 前日用レポート作成関数を呼び出す
      const messageText = logic.formatDailyReportJa(
        transactions,
        balanceData.amount,
      );

      await client.pushMessage(userId, {
        type: "text",
        text: `【あさの定期通知】\n${messageText}`,
      });
      return { statusCode: 200 };
    } catch (err) {
      console.error("Scheduled Push Error:", err);
      return { statusCode: 500 };
    }
  }

  // --- 2. Webhook（LINEからのメッセージ）の解析 ---
  let body;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch (e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  if (!body || !body.events || body.events.length === 0) {
    return { statusCode: 200, body: "No events" };
  }

  const lineEvent = body.events[0];

  if (!lineEvent.message || lineEvent.message.type !== "text") {
    return { statusCode: 200 };
  }

  const replyToken = lineEvent.replyToken;
  const reqMessage = lineEvent.message.text;

  // --- 3. コマンドによる応答ロジック ---
  try {
    if (reqMessage === "検索") {
      await client.replyMessage(replyToken, {
        type: "text",
        text: "「残高」か「明細」と入力してみてね！！",
      });
    } else if (reqMessage === "残高") {
      const balanceData = await bankApi.getBalance();
      const transactions = await bankApi.getTransactions();

      // 集計と整形を行う
      const summary = logic.calculateMonthlySummary(transactions);
      const text = logic.formatBalanceAndSummaryJa(summary, balanceData.amount);

      await client.replyMessage(replyToken, {
        type: "text",
        text: `${text}`,
      });
    } else if (reqMessage === "明細") {
      const transactions = await bankApi.getTransactions();
      const sortedTransactions = [...transactions].reverse();

      console.log("transactions:", transactions);

      if (transactions.length === 0) {
        await client.replyMessage(replyToken, {
          type: "text",
          text: "直近1ヶ月の明細はありません。",
        });
      } else {
        const summary = logic.calculateMonthlySummary(transactions);
        const report = logic.formatMonthlySummaryJa(summary);

        const list = sortedTransactions
          .slice(0, 3)
          .map((t) => {
            const type = t.transactionType === "in" ? "[入金]" : "[出金]";
            return `${t.date} ${type} ${t.amount.toLocaleString()}円`;
          })
          .join("\n");
        await client.replyMessage(replyToken, {
          type: "text",
          text: `${report}\n\n【直近の動き】\n${list}`,
        });
      }
    } else {
      await client.replyMessage(replyToken, {
        type: "text",
        text: "「残高」,「明細」と送ってみてね！",
      });
    }
  } catch (err) {
    console.error("LINE Reply Error:", err);
    try {
      await client.replyMessage(replyToken, {
        type: "text",
        text: "データの取得中にエラーが発生しました。",
      });
    } catch (replyErr) {
      console.error("Error reporting failure to user:", replyErr);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ message: "OK" }) };
};
