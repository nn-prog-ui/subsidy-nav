import PDFDocument from 'pdfkit';

export function generateSubsidyPdf(subsidy: {
  title: string; description: string; category: string; targetType: string;
  prefecture: string; level: string; maxAmount: bigint | null; subsidyRate: string | null;
  applicationStart: Date | null; applicationEnd: Date | null; applicationUrl: string | null;
  requirements: string | null; notes: string | null;
}) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  const fmt = (d: Date | null) => d ? new Date(d).toLocaleDateString('ja-JP') : '－';
  const money = (n: bigint | null) => n ? `¥${Number(n).toLocaleString()}` : '上限なし';

  doc.registerFont('Helvetica', 'Helvetica');
  doc.font('Helvetica');

  // Header
  doc.rect(0, 0, doc.page.width, 80).fill('#1e3a5f');
  doc.fillColor('white').fontSize(20).text('補助金ナビ', 50, 25);
  doc.fontSize(10).text('Subsidy Navigator', 50, 52);

  doc.fillColor('#1e3a5f').fontSize(16).text(subsidy.title, 50, 110, { width: 495 });
  doc.moveTo(50, doc.y + 8).lineTo(545, doc.y + 8).strokeColor('#1e3a5f').stroke();

  doc.moveDown();

  const row = (label: string, value: string) => {
    doc.fillColor('#555').fontSize(9).text(label, 50, doc.y, { continued: false });
    doc.fillColor('#111').fontSize(11).text(value, 50, doc.y, { width: 495 });
    doc.moveDown(0.4);
  };

  row('カテゴリ', subsidy.category);
  row('対象', subsidy.targetType);
  row('地域', `${subsidy.prefecture}（${subsidy.level}）`);
  row('補助上限額', money(subsidy.maxAmount));
  row('補助率', subsidy.subsidyRate || '－');
  row('申請期間', `${fmt(subsidy.applicationStart)} 〜 ${fmt(subsidy.applicationEnd)}`);

  doc.moveDown();
  doc.fillColor('#1e3a5f').fontSize(12).text('概要');
  doc.moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).strokeColor('#ddd').stroke();
  doc.moveDown(0.5);
  doc.fillColor('#333').fontSize(10).text(subsidy.description, { width: 495, lineGap: 4 });

  if (subsidy.requirements) {
    doc.moveDown();
    doc.fillColor('#1e3a5f').fontSize(12).text('申請要件');
    doc.moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).strokeColor('#ddd').stroke();
    doc.moveDown(0.5);
    doc.fillColor('#333').fontSize(10).text(subsidy.requirements, { width: 495, lineGap: 4 });
  }

  if (subsidy.applicationUrl) {
    doc.moveDown();
    doc.fillColor('#1e3a5f').fontSize(11).text('申請・詳細はこちら:');
    doc.fillColor('#2980b9').fontSize(10).text(subsidy.applicationUrl, { link: subsidy.applicationUrl, underline: true });
  }

  // Footer
  doc.fillColor('#999').fontSize(8).text(
    `補助金ナビ（subsidy-nav.jp）　出力日: ${new Date().toLocaleDateString('ja-JP')}`,
    50, doc.page.height - 40, { align: 'center', width: 495 }
  );

  doc.end();
  return doc;
}

export function generateMatchingPdf(
  params: { prefecture: string; industry: string; employees: string },
  results: { title: string; category: string; level: string; prefecture: string; maxAmount: bigint | number | null; matchScore: number; reasons: string[] }[],
) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.font('Helvetica');

  const money = (n: bigint | number | null) => n ? `¥${Number(n).toLocaleString()}` : '上限なし';

  // Header
  doc.rect(0, 0, doc.page.width, 80).fill('#1e3a5f');
  doc.fillColor('white').fontSize(20).text('補助金ナビ', 50, 25);
  doc.fontSize(10).text('マッチング診断結果レポート', 50, 52);

  doc.fillColor('#1e3a5f').fontSize(14).text('診断条件', 50, 105);
  doc.moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).strokeColor('#ddd').stroke();
  doc.moveDown(0.5);
  doc.fillColor('#333').fontSize(10)
    .text(`地域: ${params.prefecture}　業種: ${params.industry}　従業員数: ${params.employees}`, { width: 495 });

  doc.moveDown();
  doc.fillColor('#1e3a5f').fontSize(14).text(`おすすめの補助金（${results.length}件）`);
  doc.moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).strokeColor('#ddd').stroke();
  doc.moveDown(0.5);

  results.forEach((r, i) => {
    if (doc.y > doc.page.height - 120) doc.addPage();
    doc.fillColor('#1e3a5f').fontSize(11).text(`${i + 1}. ${r.title}`, { width: 495 });
    doc.fillColor('#555').fontSize(9).text(
      `マッチ度 ${r.matchScore}　|　${r.level}・${r.prefecture}　|　${r.category}　|　${money(r.maxAmount)}`,
      { width: 495 }
    );
    if (r.reasons.length) {
      doc.fillColor('#2980b9').fontSize(8).text(`理由: ${r.reasons.join(' / ')}`, { width: 495 });
    }
    doc.moveDown(0.6);
  });

  doc.fillColor('#999').fontSize(8).text(
    `補助金ナビ（subsidy-nav.jp）　出力日: ${new Date().toLocaleDateString('ja-JP')}`,
    50, doc.page.height - 40, { align: 'center', width: 495 }
  );

  doc.end();
  return doc;
}

export function generateTemplatePdf(template: { title: string; category: string; description: string; fileName: string }) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  doc.font('Helvetica');

  doc.rect(0, 0, doc.page.width, 80).fill('#1e3a5f');
  doc.fillColor('white').fontSize(20).text('補助金ナビ', 50, 25);
  doc.fontSize(10).text('申請書類テンプレート', 50, 52);

  doc.fillColor('#1e3a5f').fontSize(18).text(template.title, 50, 110);
  doc.fontSize(11).fillColor('#555').text(`カテゴリ: ${template.category}`, 50, doc.y + 8);
  doc.moveDown();
  doc.fillColor('#333').fontSize(10).text(template.description, { width: 495 });

  doc.moveDown(2);
  doc.rect(50, doc.y, 495, 300).strokeColor('#ddd').stroke();
  doc.fillColor('#bbb').fontSize(10).text('（記入欄）', 270, doc.y + 130);

  doc.fillColor('#999').fontSize(8).text(
    `補助金ナビ（subsidy-nav.jp）　${new Date().toLocaleDateString('ja-JP')}`,
    50, doc.page.height - 40, { align: 'center', width: 495 }
  );

  doc.end();
  return doc;
}
