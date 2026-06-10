import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

export async function sendAlertVerificationEmail(email: string, token: string) {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/alerts/verify?token=${token}`;
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"補助金ナビ" <${process.env.SMTP_USER || 'noreply@subsidy-nav.jp'}>`,
    to: email,
    subject: '【補助金ナビ】アラート登録の確認',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1e3a5f">補助金ナビ アラート登録確認</h2>
        <p>アラート登録ありがとうございます。以下のボタンをクリックして登録を完了してください。</p>
        <a href="${url}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">アラートを有効化する</a>
        <p style="color:#666;font-size:12px">このメールに心当たりがない場合は無視してください。</p>
      </div>
    `,
  }).catch(err => console.error('Mail error:', err.message));
}

export async function sendConsultingConfirmation(name: string, email: string) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"補助金ナビ" <${process.env.SMTP_USER || 'noreply@subsidy-nav.jp'}>`,
    to: email,
    subject: '【補助金ナビ】ご相談を受け付けました',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1e3a5f">ご相談受付完了</h2>
        <p>${name} 様</p>
        <p>補助金ナビへのご相談ありがとうございます。担当者より2営業日以内にご連絡いたします。</p>
        <hr style="border:1px solid #eee">
        <p style="color:#666;font-size:12px">補助金ナビ｜subsidy-nav.jp</p>
      </div>
    `,
  }).catch(err => console.error('Mail error:', err.message));
}

export async function sendWeeklyDigest() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newSubsidies = await prisma.subsidy.findMany({
    where: { createdAt: { gte: oneWeekAgo }, status: 'active' },
    take: 20,
    orderBy: { createdAt: 'desc' },
  });

  const rows = newSubsidies.map(s => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${s.title}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${s.prefecture}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${s.category}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${s.maxAmount ? `¥${Number(s.maxAmount).toLocaleString()}` : '－'}</td>
    </tr>
  `).join('');

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"補助金ナビ" <${process.env.SMTP_USER || 'noreply@subsidy-nav.jp'}>`,
    to: adminEmail,
    subject: `【補助金ナビ】週次レポート（${new Date().toLocaleDateString('ja-JP')}）`,
    html: `
      <div style="font-family:sans-serif;max-width:800px;margin:0 auto">
        <h2 style="color:#1e3a5f">週次補助金ダイジェスト</h2>
        <p>今週新たに追加された補助金情報: <strong>${newSubsidies.length}件</strong></p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <thead>
            <tr style="background:#1e3a5f;color:white">
              <th style="padding:10px;text-align:left">タイトル</th>
              <th style="padding:10px;text-align:left">地域</th>
              <th style="padding:10px;text-align:left">カテゴリ</th>
              <th style="padding:10px;text-align:left">上限額</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#666;font-size:12px;margin-top:24px">補助金ナビ 自動送信メール</p>
      </div>
    `,
  }).catch(err => console.error('Weekly digest error:', err.message));
  console.log(`Weekly digest sent to ${adminEmail}`);
}

export async function sendDeadlineAlerts() {
  const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const expiring = await prisma.subsidy.findMany({
    where: { applicationEnd: { lte: threeDaysLater, gte: new Date() }, status: 'active' },
  });
  if (expiring.length === 0) return;

  const alerts = await prisma.alert.findMany({ where: { verified: true, active: true } });
  for (const alert of alerts) {
    const matched = expiring.filter(s =>
      alert.prefectures.length === 0 || alert.prefectures.includes(s.prefecture) ||
      (s.municipalityCode && alert.municipalityCodes.includes(s.municipalityCode))
    );
    if (matched.length === 0) continue;

    const transporter = createTransporter();
    const rows = matched.map(s => `<li><strong>${s.title}</strong>（${s.prefecture}）- 締切: ${s.applicationEnd?.toLocaleDateString('ja-JP')}</li>`).join('');
    await transporter.sendMail({
      from: `"補助金ナビ" <${process.env.SMTP_USER || 'noreply@subsidy-nav.jp'}>`,
      to: alert.email,
      subject: '【補助金ナビ】申請締切が近い補助金があります',
      html: `<div style="font-family:sans-serif"><h2 style="color:#c0392b">締切アラート</h2><ul>${rows}</ul></div>`,
    }).catch(err => console.error('Deadline alert error:', err.message));
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify?token=${token}`;
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"補助金ナビ" <${process.env.SMTP_USER || 'noreply@subsidy-nav.jp'}>`,
    to: email,
    subject: '【補助金ナビ】メールアドレスの確認',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1e3a5f">メールアドレスの確認</h2>
        <p>補助金ナビへのご登録ありがとうございます。以下のボタンをクリックしてメール認証を完了してください。</p>
        <a href="${url}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">メールアドレスを確認する</a>
        <p style="color:#666;font-size:12px">このメールに心当たりがない場合は無視してください。</p>
      </div>
    `,
  }).catch(err => console.error('Mail error:', err.message));
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"補助金ナビ" <${process.env.SMTP_USER || 'noreply@subsidy-nav.jp'}>`,
    to: email,
    subject: '【補助金ナビ】パスワードリセット',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1e3a5f">パスワードリセット</h2>
        <p>パスワードリセットのリクエストを受け付けました。以下のボタンをクリックして新しいパスワードを設定してください。</p>
        <a href="${url}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">パスワードをリセットする</a>
        <p style="color:#666;font-size:12px">このリンクは1時間で無効になります。このメールに心当たりがない場合は無視してください。</p>
      </div>
    `,
  }).catch(err => console.error('Mail error:', err.message));
}
