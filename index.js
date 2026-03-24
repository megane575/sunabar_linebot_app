// Lambda関数（LINE bot events and responses）
"use strict";

const line = require("@line/bot-sdk");
var request = require("request");

const config = {
  channelSecret: process.env.channelSecretLINE,
  channelAccessToken: process.env.channelAccessTokenLINE,
};

const client = new line.Client(config);
const sunabarToken = process.env.sunabarToken;

exports.handler = async (event) => {
  console.log(event);

  const body = JSON.parse(event.body);
  const replyToken = body.events[0].replyToken;
  const reqMessage = body.events[0].message.text;

  let resMessage = "";

  if (reqMessage == "おはよう") {
    resMessage = "ゆっくり寝れました？";
    return client.replyMessage(replyToken, {
      type: "text",
      text: resMessage,
    });

  } else if (reqMessage == "残高") {
    const options = {
      method: "GET",
      url: "https://api.sunabar.gmo-aozora.com/personal/v1/accounts/balances",
      qs: {
        accountId: "302010012386",
      },
      headers: {
        Accept: "application/json; charset=UTF-8",
        "Content-Type": "application/json; charset=UTF-8",
        "x-access-token": sunabarToken,
      },
      json: true,
    };

    return new Promise((resolve, reject) => {
      request(options, function (error, response, body) {
        if (error) {
          console.error(error);
          client.replyMessage(replyToken, {
            type: "text",
            text: "残高照会でエラーが発生しました",
          })
            .then(resolve)
            .catch(reject);
          return;
        }

        const balance = body.balances[0].balance;
        const resMessage = `残高は ${balance} 円です`;

        client.replyMessage(replyToken, {
          type: "text",
          text: resMessage,
        })
          .then(resolve)
          .catch(reject);
      });
    });

  } else {
    resMessage = "「おはよう」または「残高」と送ってください";
    return client.replyMessage(replyToken, {
      type: "text",
      text: resMessage,
    });
  }
};