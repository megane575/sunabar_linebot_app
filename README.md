# LINE × sunabar 銀行API アプリ

## 概要

LINEから銀行口座の情報を取得・操作できるボットアプリです。  
sunabar API と AWS Lambda を利用しています。

---

## 主な機能

### ① 残高確認

LINEで「残高」と送信すると、現在の残高と収支を返します。

---

### ② 明細確認

LINEで「明細」と送信すると、今月の取引と収支を返します。

---

### ③ 振込依頼（NEW）

LINEで振込依頼ができます。

#### 使い方

振込 30000

#### 挙動

- 指定した金額で振込依頼を作成
- 振込先は固定
- 実際の実行はsunabarポータルで承認が必要

---

### ④ 定期通知

EventBridgeにより、定期的に収支情報をLINEに通知します。

---

## 技術構成

- Node.js（Lambda）
- LINE Messaging API
- sunabar API（GMOあおぞらネット銀行）
- AWS Lambda
- Amazon DynamoDB
- EventBridge

---

## ユーザー管理

ユーザーごとの情報はDynamoDBで管理しています。

| 項目               | 内容           |
| ------------------ | -------------- |
| userId             | LINEユーザーID |
| sunabarAccessToken | APIトークン    |
| sunabarAccountId   | 口座ID         |

---

## 振込機能の仕様

- 振込元：ユーザーごとの口座
- 振込先：固定
- 金額：LINE入力で指定
- 承認：sunabarポータルで実施

---

## 注意事項

- 本アプリはデモ用途のため、振込確認フローは省略しています
- 実際の金融システムでは追加の安全対策が必要です

## ディレクトリ構成

```
.
├── bank_api.js　　　　→銀行APIとの通信を担当
├── calc_logic.js　　 →データの計算・整形ロジック
├── docs　　
├── index.js　　　　   →Lambdaのハンドラー関数
├── local_test_transfer.js
├── node_modules
├── package-lock.json
├── package.json
├── README.md
└── transfer_api.js　 →振込機能に関連するAPI処理
```
