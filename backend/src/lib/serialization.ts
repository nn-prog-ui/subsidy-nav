// Prisma の BIGINT 列（maxAmount 等）を res.json / JSON.stringify で安全に返すための共通処理。
// これを呼ばないと JSON.stringify が BigInt で TypeError を投げ、補助金APIが500になる。
// index.ts と テストの双方から利用し、回帰をCIで検知できるようにしている。
export function enableBigIntJson(): void {
  // 数値化（補助金額は 2^53 未満なので number で安全）。冪等。
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}
