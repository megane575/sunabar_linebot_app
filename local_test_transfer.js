const { requestTransfer } = require("./transfer_api");

async function main() {
  try {
    console.log("=== 振込依頼テスト開始 ===");

    const result = await requestTransfer(
      process.env.SUNABAR_ACCESS_TOKEN,
      process.env.SUNABAR_ACCOUNT_ID,
      30000,
    );

    console.log(result);

    console.log("=== 振込依頼テスト成功 ===");
  } catch (error) {
    console.error("=== 振込依頼テスト失敗 ===");
    console.error(error.message);
  }
}

main();