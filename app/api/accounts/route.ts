import { NextResponse } from 'next/server';
import { getAccounts, saveAccounts } from '@/lib/storage';
import { SocialAccount } from '@/lib/types';

export async function GET() {
  const accounts = getAccounts();
  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  try {
    const newAccount: SocialAccount = await req.json();
    if (!newAccount.name) {
      return NextResponse.json({ error: 'Nome do perfil é obrigatório.' }, { status: 400 });
    }

    const accounts = getAccounts();
    const id = newAccount.id || newAccount.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Checar se já existe
    const existingIndex = accounts.findIndex((a) => a.id === id);
    if (existingIndex >= 0) {
      accounts[existingIndex] = { ...accounts[existingIndex], ...newAccount };
    } else {
      accounts.push({
        ...newAccount,
        id,
        created_at: new Date().toISOString(),
        status: newAccount.status || 'active',
      });
    }

    saveAccounts(accounts);
    return NextResponse.json({ success: true, account: accounts.find((a) => a.id === id) });
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

    const accounts = getAccounts();
    const filtered = accounts.filter((a) => a.id !== id);
    saveAccounts(filtered);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
