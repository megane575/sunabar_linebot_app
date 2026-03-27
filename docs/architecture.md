# アーキテクチャ

## 構成

LINE → API Gateway → Lambda → Sunabar API  
　　　　　　　　　　　↓  
　　　　　　　　　DynamoDB

---

## フロー

① LINEからメッセージ受信  
② Lambdaでユーザー取得（DynamoDB）  
③ Sunabar API呼び出し  
④ 結果をLINEに返信  

---

## 定期処理

EventBridge → Lambda → 全ユーザーにpush