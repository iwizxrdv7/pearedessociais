import crypto from 'crypto';
import { cookies } from 'next/headers';
import { supabase } from './supabase';

export const AUTH_COOKIE_NAME = 'pea_auth_token';

// Secret key para assinatura HMAC do token de sessão
const AUTH_SECRET = process.env.NEXTAUTH_SECRET || 'p_and_a_redes_sociais_super_secret_key_2026';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

/**
 * Gera um token de sessão assinado HMAC
 */
export function createSessionToken(user: AuthUser): string {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 dias
  });
  const base64Payload = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(base64Payload)
    .digest('base64url');

  return `${base64Payload}.${signature}`;
}

/**
 * Valida e decodifica o token de sessão
 */
export function verifySessionToken(token: string): AuthUser | null {
  if (!token || !token.includes('.')) return null;

  try {
    const [base64Payload, signature] = token.split('.');
    const expectedSignature = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(base64Payload)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const json = Buffer.from(base64Payload, 'base64url').toString('utf-8');
    const data = JSON.parse(json);

    if (data.exp && data.exp < Date.now()) {
      return null; // Token expirado
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role || 'admin',
    };
  } catch {
    return null;
  }
}

/**
 * Autentica o usuário com Supabase ou credenciais de Administrador
 */
export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Verificar credenciais de Admin Master configuradas no ambiente
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@pearedessociais.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (cleanEmail === adminEmail && password === adminPassword) {
    return {
      id: 'admin_master',
      email: cleanEmail,
      name: 'Administrador P&A',
      role: 'admin',
    };
  }

  // 2. Tentar autenticar via Supabase Auth se o Supabase estiver configurado
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data?.user) {
        return {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          name: data.user.user_metadata?.name || cleanEmail.split('@')[0],
          role: 'admin',
        };
      }
    } catch (e) {
      console.warn('Erro ao autenticar com Supabase Auth:', e);
    }
  }

  return null;
}

/**
 * Obtém o usuário da sessão a partir dos cookies do servidor
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}
