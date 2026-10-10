import fs from 'fs';
import path from 'path';
import { SocialAccount, VideoPost } from './types';
import { supabaseAdmin } from './supabase';

const isVercel = !!process.env.VERCEL;
const DB_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const ACCOUNTS_FILE = path.join(DB_DIR, 'accounts.json');
const POSTS_FILE = path.join(DB_DIR, 'posts.json');

function ensureDbDir() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  } catch (e) {
    // Ignore read-only filesystem errors
  }
}

export async function getAccountsAsync(): Promise<SocialAccount[]> {
  try {
    const { data, error } = await supabaseAdmin.from('accounts').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data as SocialAccount[];
    }
  } catch (e) {
    console.warn('Supabase não disponível, usando storage local:', e);
  }
  return getAccountsLocal();
}

export async function saveAccountAsync(account: SocialAccount): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('accounts').upsert(account);
    if (error) console.error('Erro ao salvar conta no Supabase:', error);
  } catch (e) {
    console.warn('Erro Supabase upsert:', e);
  }
  const accounts = getAccountsLocal();
  const idx = accounts.findIndex((a) => a.id === account.id);
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.push(account);
  }
  saveAccountsLocal(accounts);
}

export async function deleteAccountAsync(id: string): Promise<void> {
  try {
    await supabaseAdmin.from('accounts').delete().eq('id', id);
  } catch (e) {
    console.warn('Erro Supabase delete:', e);
  }
  const accounts = getAccountsLocal().filter((a) => a.id !== id);
  saveAccountsLocal(accounts);
}

export async function getPostsAsync(): Promise<VideoPost[]> {
  try {
    const { data, error } = await supabaseAdmin.from('posts').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data as VideoPost[];
    }
  } catch (e) {
    console.warn('Supabase posts não disponível, usando storage local:', e);
  }
  return getPostsLocal();
}

export async function savePostAsync(post: VideoPost): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('posts').upsert(post);
    if (error) console.error('Erro ao salvar post no Supabase:', error);
  } catch (e) {
    console.warn('Erro Supabase post upsert:', e);
  }
  const posts = getPostsLocal();
  const idx = posts.findIndex((p) => p.id === post.id);
  if (idx >= 0) {
    posts[idx] = post;
  } else {
    posts.unshift(post);
  }
  savePostsLocal(posts);
}

export async function deletePostAsync(id: string): Promise<void> {
  try {
    await supabaseAdmin.from('posts').delete().eq('id', id);
  } catch (e) {
    console.warn('Erro Supabase delete post:', e);
  }
  const posts = getPostsLocal().filter((p) => p.id !== id);
  savePostsLocal(posts);
}

// Fallback Local Storage
export function getAccounts(): SocialAccount[] {
  return getAccountsLocal();
}

export function saveAccounts(accounts: SocialAccount[]): void {
  saveAccountsLocal(accounts);
}

export function getPosts(): VideoPost[] {
  return getPostsLocal();
}

export function savePosts(posts: VideoPost[]): void {
  savePostsLocal(posts);
}

function getAccountsLocal(): SocialAccount[] {
  ensureDbDir();
  try {
    if (!fs.existsSync(ACCOUNTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveAccountsLocal(accounts: SocialAccount[]): void {
  ensureDbDir();
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Não foi possível gravar localmente:', e);
  }
}

function getPostsLocal(): VideoPost[] {
  ensureDbDir();
  try {
    if (!fs.existsSync(POSTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function savePostsLocal(posts: VideoPost[]): void {
  ensureDbDir();
  try {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Não foi possível gravar posts localmente:', e);
  }
}
