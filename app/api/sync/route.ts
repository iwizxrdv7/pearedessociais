import { NextResponse } from 'next/server';
import { getAccountsAsync, saveAccountAsync } from '@/lib/storage';

export async function POST(req: Request) {
  try {
    const { accountId } = await req.json();
    const accounts = await getAccountsAsync();
    const targetAccount = accounts.find((a) => a.id === accountId);

    if (!targetAccount) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
    }

    const pageId = targetAccount.facebook_page_id;
    const token = targetAccount.facebook_page_token;

    if (!pageId || !token) {
      return NextResponse.json({ error: 'Page ID ou Token não configurados.' }, { status: 400 });
    }

    // Consulta Meta Graph API
    const url = `https://graph.facebook.com/v20.0/${pageId}?fields=id,name,instagram_business_account{id,username,name,profile_picture_url},connected_instagram_account&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    targetAccount.facebook_page_name = data.name || targetAccount.facebook_page_name;
    
    if (data.instagram_business_account) {
      targetAccount.instagram_account_id = data.instagram_business_account.id;
      targetAccount.instagram_username = data.instagram_business_account.username;
      targetAccount.instagram_name = data.instagram_business_account.name;
      if (data.instagram_business_account.profile_picture_url) {
        targetAccount.avatar = data.instagram_business_account.profile_picture_url;
      }
      targetAccount.post_to_instagram = true;
      targetAccount.status = 'active';
    }

    await saveAccountAsync(targetAccount);
    return NextResponse.json({ success: true, account: targetAccount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
