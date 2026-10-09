import { NextResponse } from 'next/server';
import { getAccountsAsync, saveAccountAsync, deleteAccountAsync } from '@/lib/storage';
import { SocialAccount } from '@/lib/types';

export async function GET() {
  const accounts = await getAccountsAsync();
  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  try {
    const newAccount: SocialAccount = await req.json();
    if (!newAccount.name) {
      return NextResponse.json({ error: 'Nome do perfil é obrigatório.' }, { status: 400 });
    }

    const id = newAccount.id || newAccount.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const accountToSave: SocialAccount = {
      ...newAccount,
      id,
      created_at: newAccount.created_at || new Date().toISOString(),
      status: newAccount.status || 'active',
      post_to_facebook: newAccount.post_to_facebook ?? true,
      post_to_instagram: newAccount.post_to_instagram ?? !!newAccount.instagram_account_id,
    };

    await saveAccountAsync(accountToSave);
    return NextResponse.json({ success: true, account: accountToSave });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID do perfil é obrigatório.' }, { status: 400 });
    }

    await deleteAccountAsync(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
