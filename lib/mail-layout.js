import { site } from './site.js';

const GREEN = '#1F3912';
const GOLD = '#BFA066';
const CREAM = '#F3EBD6';
const INK = '#2E2414';
const MUTED = '#6B6355';
const FONT = "Arial,Helvetica,sans-serif";

export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const mailHeading = (text) =>
  `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:1.3;color:${GREEN}">${escapeHtml(text)}</h1>`;

export const mailParagraph = (html) =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.55;color:${INK}">${html}</p>`;

export const mailMuted = (html) =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:13px;line-height:1.5;color:${MUTED}">${html}</p>`;

export const mailCode = (code) =>
  `<div style="margin:8px 0 20px;padding:18px 12px;background:${CREAM};border-radius:8px;text-align:center;font-family:${FONT};font-size:34px;font-weight:700;letter-spacing:8px;color:${GREEN}">${escapeHtml(code)}</div>`;

export const mailButton = (href, label) =>
  `<p style="margin:8px 0 20px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;background:${GREEN};color:${CREAM};font-family:${FONT};font-size:15px;font-weight:700;text-decoration:none;border-radius:8px">${escapeHtml(label)}</a></p>`;

export function mailKeyValue(label, value) {
  return `<p style="margin:0 0 4px;font-family:${FONT};font-size:13px;color:${MUTED}">${escapeHtml(label)}</p><p style="margin:0 0 16px;font-family:${FONT};font-size:18px;font-weight:700;letter-spacing:1px;color:${GREEN}">${escapeHtml(value)}</p>`;
}

export function mailItems(items) {
  const rows = items
    .map(
      (item) => `<tr><td style="padding:9px 0;border-bottom:1px solid #E7DFC8;font-family:${FONT};font-size:14px;color:${INK}">${escapeHtml(item.title)}${item.article ? `<br><span style="font-size:12px;color:${MUTED}">Код: ${escapeHtml(item.article)}</span>` : ''}</td><td style="padding:9px 0 9px 12px;border-bottom:1px solid #E7DFC8;font-family:${FONT};font-size:14px;color:${INK};text-align:right;white-space:nowrap">×${escapeHtml(item.quantity)}</td></tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-collapse:collapse">${rows}</table>`;
}

function renderContacts() {
  const link = (href, text) =>
    `<a href="${escapeHtml(href)}" style="color:${CREAM};text-decoration:none">${escapeHtml(text)}</a>`;
  const cell = (align, label, valueHtml) =>
    `<td class="ft-cell" width="47%" align="${align}" style="font-family:${FONT};font-size:13px;line-height:1.9;color:${CREAM};text-align:${align}">${label}: <span style="white-space:nowrap">${valueHtml}</span></td>`;
  const dot = `<td class="ft-dot" width="6%" align="center" style="font-family:${FONT};font-size:13px;line-height:1.9;color:${GOLD};text-align:center">·</td>`;
  const row = (left, right) => `<tr>${cell('right', ...left)}${dot}${cell('left', ...right)}</tr>`;
  const phone = link(`tel:${site.phone}`, site.phoneDisplay);
  const email = link(`mailto:${site.email}`, site.email);
  const telegram = link(site.telegramUrl, site.telegramHandle);
  const viber = escapeHtml(site.viberDisplay);
  return `<table class="ft-table" role="presentation" width="100%" cellpadding="0" cellspacing="0">${row(['Телефон', phone], ['Email', email])}${row(['Telegram', telegram], ['Viber', viber])}</table>`;
}

export function renderMail({ preheader = '', bodyHtml }) {
  const logo = site.mailLogoUrl
    ? `<img src="${escapeHtml(site.mailLogoUrl)}" width="52" alt="" style="display:block;margin:0 auto 10px;border:0">`
    : '';
  return `<!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><style>@media only screen and (max-width:480px){.ft-table,.ft-table tbody,.ft-table tr,.ft-cell{display:block!important;width:100%!important;text-align:center!important}.ft-dot{display:none!important}.mail-pad{padding-left:20px!important;padding-right:20px!important}}</style></head>
<body style="margin:0;padding:0;background:${CREAM}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td align="center" style="background:${GREEN};padding:26px 20px 22px">${logo}<span style="font-family:${FONT};font-size:22px;font-weight:700;letter-spacing:5px;color:${CREAM}">${escapeHtml(String(site.name).toUpperCase())}</span></td></tr>
<tr><td class="mail-pad" style="padding:30px 32px 14px">${bodyHtml}</td></tr>
<tr><td style="background:${GREEN};padding:20px 16px 22px">${renderContacts()}</td></tr>
</table></td></tr></table></body></html>`;
}
