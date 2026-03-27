"use strict";

const line = require("@line/bot-sdk");

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const bankApi = require("./bank_api");
const logic = require("./calc_logic");

const client_db = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client_db);

const config = {
  channelSecret: process.env.channelSecretLINE,
  channelAccessToken: process.env.channelAccessTokenLINE,
};

const client = new line.Client(config);

async function getUserConfig(userId) {
  const { GetCommand } = require("@aws-sdk/lib-dynamodb");
  const command = new GetCommand({
    TableName: "LineUsers_forBOT",
    Key: { userId: userId },
  });
  const result = await dynamo.send(command);
  return result.Item;
}

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event));

  // --- 1. 定期実行（Event Bridge） ---
  if (
    event.source === "aws.events" ||
    event["detail-type"] === "Scheduled Event"
  ) {
    try {
      // DynamoDBから全ユーザーIDを取得
      const command = new ScanCommand({
        TableName: "LineUsers_forBOT",
      });
      const result = await dynamo.send(command);
      const users = result.Items;

      if (!users || users.length === 0) {
        console.log("No users found in DynamoDB.");
        return { statusCode: 200 };
      }

      // ユーザーごとにループして、それぞれの口座情報を取得して送る
      for (const user of users) {
        const targetId = user.userId;
        const token = user.sunabarAccessToken;
        const accountId = user.sunabarAccountId;

        try {
          const balanceData = await bankApi.getBalance(token, accountId);
          const transactions = await bankApi.getTransactions(token, accountId);

          const messageText = logic.formatDailyReportJa(
            transactions,
            balanceData.amount,
          );
          await client.pushMessage(targetId, {
            type: "text",
            text: `【あさの定期通知】\n${messageText}`,
          });
          console.log(`Successfully sent to: ${targetId}`);
        } catch (pushErr) {
          console.error(`Failed to send to ${targetId}:`, pushErr);
        }
      }

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

  const lineUserId = lineEvent.source.userId;
  const userConfig = await getUserConfig(lineUserId);

  // --- 3. コマンドによる応答ロジック ---
  try {
    if (!userConfig) {
      await client.replyMessage(replyToken, {
        type: "text",
        text: "ユーザー登録が見つかりません。管理者に連絡してください。",
      });
      return { statusCode: 200 };
    }

    if (reqMessage === "検索") {
      await client.replyMessage(replyToken, {
        type: "text",
        text: "「残高」か「明細」と入力してみてね！！",
      });
    } else if (reqMessage === "残高") {
      const balanceData = await bankApi.getBalance(
        userConfig.sunabarAccessToken,
        userConfig.sunabarAccountId,
      );
      const transactions = await bankApi.getTransactions(
        userConfig.sunabarAccessToken,
        userConfig.sunabarAccountId,
      );

      // 集計と整形を行う
      const summary = logic.calculateMonthlySummary(transactions);
      const text = logic.formatBalanceAndSummaryJa(summary, balanceData.amount);

      await client.replyMessage(replyToken, {
        type: "text",
        text: `${text}`,
      });
    } else if (reqMessage === "明細") {
      const transactions = await bankApi.getTransactions(
        userConfig.sunabarAccessToken,
        userConfig.sunabarAccountId,
      );
      const sortedTransactions = [...transactions].reverse(
        userConfig.sunabarAccessToken,
        userConfig.sunabarAccountId,
      );

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
            return `${t.date} ${type}${t.remark} ${t.amount.toLocaleString()}円`;
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
        text: "データの取得中にエラーが発生しました。しばらく時間を置いてから試してね。",
      });
    } catch (replyErr) {
      console.error("Error reporting failure to user:", replyErr);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ message: "OK" }) };
};
