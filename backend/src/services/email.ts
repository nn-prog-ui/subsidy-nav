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

export async function sendProgressDeadlineReminders() {
  // 申請完了前（considering/preparing）の進捗があり、締切が7日以内の補助金についてユーザーへ通知
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const progresses = await prisma.applicationProgress.findMany({
    where: { status: { in: ['considering', 'preparing'] } },
    include: { user: { select: { email: true, emailVerified: true } } },
  });
  if (progresses.length === 0) return;

  const subsidyIds = [...new Set(progresses.map(p => p.subsidyId))];
  const subsidies = await prisma.subsidy.findMany({
    where: { id: { in: subsidyIds }, status: 'active', applicationEnd: { gte: new Date(), lte: soon } },
  });
  const subMap = Object.fromEntries(subsidies.map(s => [s.id, s]));

  // ユーザーごとに該当補助金をまとめる
  const byUser = new Map<string, { title: string; end: Date }[]>();
  for (const p of progresses) {
    const s = subMap[p.subsidyId];
    if (!s || !s.applicationEnd) continue;
    if (!p.user.emailVerified) continue;
    const list = byUser.get(p.user.email) || [];
    list.push({ title: s.title, end: s.applicationEnd });
    byUser.set(p.user.email, list);
  }
  if (byUser.size === 0) return;

  const transporter = createTransporter();
  for (const [email, items] of byUser) {
    const rows = items
      .sort((a, b) => a.end.getTime() - b.end.getTime())
      .map(i => `<li><strong>${i.title}</strong> — 締切 ${i.end.toLocaleDateString('ja-JP')}</li>`)
      .join('');
    await transporter.sendMail({
      from: `"補助金ナビ" <${process.env.SMTP_USER || 'noreply@subsidy-nav.jp'}>`,
      to: email,
      subject: '【補助金ナビ】申請準備中の補助金の締切が近づいています',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1e3a5f">⏰ 締切リマインド</h2>
          <p>申請準備中・検討中として記録されている補助金のうち、締切が7日以内のものがあります。</p>
          <ul style="line-height:1.8">${rows}</ul>
          <p style="margin-top:16px"><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/mypage" style="color:#e8954a">マイページで確認する →</a></p>
          <p style="color:#999;font-size:12px;margin-top:24px">補助金ナビ 自動送信メール</p>
        </div>
      `,
    }).catch(err => console.error('Progress reminder error:', err.message));
  }
  console.log(`Progress deadline reminders sent to ${byUser.size} users`);
}

export async function sendAnalyticsReport() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const where = { status: 'active' as const };
  const [total, byLevel, byCategory, amountStats, deadlineSoon, newCount] = await Promise.all([
    prisma.subsidy.count({ where }),
    prisma.subsidy.groupBy({ by: ['level'], where, _count: { id: true } }),
    prisma.subsidy.groupBy({ by: ['category'], where, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 5 }),
    prisma.subsidy.aggregate({ where: { ...where, maxAmount: { not: null } }, _avg: { maxAmount: true }, _max: { maxAmount: true } }),
    prisma.subsidy.count({ where: { ...where, applicationEnd: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } } }),
    prisma.subsidy.count({ where: { ...where, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
  ]);

  const yen = (n: number | null) => n ? `¥${Math.round(Number(n)).toLocaleString()}` : '－';
  const levelRows = byLevel.map(l => `<li>${l.level}: <strong>${l._count.id}件</strong></li>`).join('');
  const catRows = byCategory.map(c => `
    <tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${c.category}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right"><strong>${c._count.id}</strong></td></tr>`).join('');

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"補助金ナビ" <${process.env.SMTP_USER || 'noreply@subsidy-nav.jp'}>`,
    to: adminEmail,
    subject: `【補助金ナビ】週次分析レポート（${new Date().toLocaleDateString('ja-JP')}）`,
    html: `
      <div style="font-family:sans-serif;max-width:700px;margin:0 auto">
        <h2 style="color:#1e3a5f">📊 週次分析レポート</h2>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin:16px 0">
          <div style="flex:1;min-width:120px;background:#f0f4f8;padding:14px;border-radius:8px;text-align:center">
            <div style="font-size:24px;font-weight:bold;color:#1e3a5f">${total}</div>
            <div style="font-size:12px;color:#666">掲載中の補助金</div>
          </div>
          <div style="flex:1;min-width:120px;background:#fef2f2;padding:14px;border-radius:8px;text-align:center">
            <div style="font-size:24px;font-weight:bold;color:#c0392b">${deadlineSoon}</div>
            <div style="font-size:12px;color:#666">締切30日以内</div>
          </div>
          <div style="flex:1;min-width:120px;background:#f0fdf4;padding:14px;border-radius:8px;text-align:center">
            <div style="font-size:24px;font-weight:bold;color:#16a34a">+${newCount}</div>
            <div style="font-size:12px;color:#666">今週の新着</div>
          </div>
        </div>
        <h3 style="color:#1e3a5f;margin-top:24px">区分別</h3>
        <ul>${levelRows}</ul>
        <h3 style="color:#1e3a5f;margin-top:16px">カテゴリ上位5</h3>
        <table style="width:100%;border-collapse:collapse">${catRows}</table>
        <h3 style="color:#1e3a5f;margin-top:16px">補助額</h3>
        <p>平均上限: <strong>${yen(amountStats._avg.maxAmount)}</strong> ／ 最高上限: <strong>${yen(amountStats._max.maxAmount)}</strong></p>
        <p style="color:#999;font-size:12px;margin-top:24px">補助金ナビ 自動送信レポート</p>
      </div>
    `,
  }).catch(err => console.error('Analytics report error:', err.message));
  console.log(`Analytics report sent to ${adminEmail}`);
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
