import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getAppUrl() {
  return String(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.FRONTEND_URL ||
      "https://fielchat.com"
  ).replace(/\/$/, "");
}

function getInviteUrl() {
  const inviteUrl = String(
    process.env.WHATSAPP_GROUP_INVITE_URL ||
      process.env.NEXT_PUBLIC_WHATSAPP_GROUP_INVITE_URL ||
      ""
  ).trim();

  if (/^https:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]{20,}$/.test(inviteUrl)) {
    return inviteUrl;
  }

  return `${getAppUrl()}/cadastro-free`;
}

export function GET() {
  return NextResponse.redirect(getInviteUrl(), 302);
}
