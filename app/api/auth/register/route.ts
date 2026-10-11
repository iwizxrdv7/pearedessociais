import { NextResponse } from 'next/server';
import { registerUser, createSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve conter no mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    const { user, error } = await registerUser(name, email, password);

    if (error || !user) {
      const friendlyError = error?.includes('already registered')
        ? 'Este email já está cadastrado. Faça login ou use outro email.'
        : (error || 'Não foi possível criar a conta.');

      return NextResponse.json(
        { error: friendlyError },
        { status: 400 }
      );
    }

    // Criar sessão autenticada diretamente
    const token = createSessionToken(user);
    const maxAge = 30 * 24 * 60 * 60; // 30 dias

    const res = NextResponse.json({
      success: true,
      user,
    });

    res.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro interno ao processar cadastro.' },
      { status: 500 }
    );
  }
}
