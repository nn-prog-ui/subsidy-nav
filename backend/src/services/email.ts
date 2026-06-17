import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma';


function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

/**
 * 共通メールレイアウト。ブランドヘッダー＋本文コンテナ＋フッターで統一する。
 * @param contentHtml 本文HTML（h2/p/a 等）
 * @param footerNote フッターに追記する補足（配信停止リンク等、任意）
 */
function emailLayout(contentHtml: string, footerNote?: string): string {
  const site = process.env.FRONTEND_URL || 'https://subsidy-nav.jp';
  return `
  <div style="background:#f3f4f6;padding:24px 0;font-family:-apple-system,'Segoe UI',sans-serif">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#1e3a5f;padding:20px 24px;color:#fff">
        <span style="font-size:18px;font-weight:bold">🏛 補助金ナビ</span>
      </div>
      <div style="padding:24px">${contentHtml}</div>
      <div style="padding:16px 24px;border-top:1px solid #eee;color:#9ca3af;font-size:12px;line-height:1.6">
        ${footerNote ? `<p style="margin:0 0 8px">${footerNote}</p>` : ''}
        <p style="margin:0">掲載情報は変更される場合があります。申請の際は公式情報をご確認ください。</p>
        <p style="margin:8px 0 0"><a href="${site}" style="color:#9ca3af">補助金ナビ</a> ｜ © 2024 subsidy-nav.jp</p>
      </div>
    </div>
  </div>`;
}

export async function sendAlertVerificationEmail(email: string, token: string) {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/alerts/verify?token=${token}`;
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"補助金ナビ" <${process.env.SMTP_USER || 'noreply@subsidy-nav.jp'}>`,
    to: email,
    subject: '【補助金ナビ】アラート登録の確認',
    html: emailLayout(`
      <h2 style="color:#1e3a5f;margin-top:0">アラート登録確認</h2>
      <p>アラート登録ありがとうございます。以下のボタンをクリックして登録を完了してください。</p>
      <a href="${url}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">アラートを有効化する</a>
    `, 'このメールに心当たりがない場合は無視してください。'),
  }).catch(err => console.error('Mail error:', err.message));
}

export async function sendConsultingConfirmation(name: string, email: string) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"補助金ナビ" <${process.env.SMTP_USER || 'noreply@subsidy-nav.jp'}>`,
    to: email,
    subject: '【補助金ナビ】ご相談を受け付けました',
    html: emailLayout(`
      <h2 style="color:#1e3a5f;margin-top:0">ご相談受付完了</h2>
      <p>${name} 様</p>
      <p>補助金ナビへのご相談ありがとうございます。担当者より2営業日以内にご連絡いたします。</p>
    `),
  }).catch(err => console.error('Mail error:', err.message));
}

export async function sendConsultingAdminNotification(req: {
  name: string; email: string; company?: string | null; phone?: string | null;
  prefecture?: string | null; industry?: string | null; employees?: string | null; budget?: string | null; message: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  const transporter = createTransporter();
  const field = (label: string, v: string | null | undefined) => v ? `<tr><td style="padding:4px 10px;color:#666">${label}</td><td style="padding:4px 10px"><strong>${v}</strong></td></tr>` : '';
  await transporter.sendMail({
    from: `"補助金ナビ" <${process.env.SMTP_USER || 'noreply@subsidy-nav.jp'}>`,
    to: adminEmail,
    replyTo: req.email,
    subject: `【新規相談】${req.name} 様（${req.company || '個人'}）`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1e3a5f">新しい相談が届きました</h2>
        <table style="width:100%;border-collapse:collapse">
          ${field('お名前', req.name)}
          ${field('メール', req.email)}
          ${field('会社名', req.company)}
          ${field('電話', req.phone)}
          ${field('地域', req.prefecture)}
          ${field('業種', req.industry)}
          ${field('従業員数', req.employees)}
          ${field('予算', req.budget)}
        </table>
        <h3 style="color:#1e3a5f;margin-top:16px">相談内容</h3>
        <p style="white-space:pre-line;background:#f7f7f7;padding:12px;border-radius:8px">${req.message}</p>
        <p style="color:#999;font-size:12px;margin-top:16px">このメールに返信すると相談者へ直接返信できます。</p>
      </div>
    `,
  }).catch(err => console.error('Admin notify error:', err.message));
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
    where: { status: { in: ['considering', 'preparing'] }, user: { notifyProgress: true } },
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

  const yen = (n: number | bigint | null) => n ? `¥${Math.round(Number(n)).toLocaleString()}` : '－';
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
    const unsubscribeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/alerts/unsubscribe?token=${alert.token}`;
    await transporter.sendMail({
      from: `"補助金ナビ" <${process.env.SMTP_USER || 'noreply@subsidy-nav.jp'}>`,
      to: alert.email,
      subject: '【補助金ナビ】申請締切が近い補助金があります',
      html: `<div style="font-family:sans-serif"><h2 style="color:#c0392b">締切アラート</h2><ul>${rows}</ul>
        <p style="color:#999;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:12px">
          配信を停止する場合は<a href="${unsubscribeUrl}" style="color:#999">こちら</a>。
        </p></div>`,
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
    html: emailLayout(`
      <h2 style="color:#1e3a5f;margin-top:0">メールアドレスの確認</h2>
      <p>補助金ナビへのご登録ありがとうございます。以下のボタンをクリックしてメール認証を完了してください。</p>
      <a href="${url}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">メールアドレスを確認する</a>
    `, 'このメールに心当たりがない場合は無視してください。'),
  }).catch(err => console.error('Mail error:', err.message));
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"補助金ナビ" <${process.env.SMTP_USER || 'noreply@subsidy-nav.jp'}>`,
    to: email,
    subject: '【補助金ナビ】パスワードリセット',
    html: emailLayout(`
      <h2 style="color:#1e3a5f;margin-top:0">パスワードリセット</h2>
      <p>パスワードリセットのリクエストを受け付けました。以下のボタンをクリックして新しいパスワードを設定してください。</p>
      <a href="${url}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">パスワードをリセットする</a>
    `, 'このリンクは1時間で無効になります。心当たりがない場合は無視してください。'),
  }).catch(err => console.error('Mail error:', err.message));
}
