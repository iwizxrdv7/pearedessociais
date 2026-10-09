import fs from 'fs';
import path from 'path';
import { SocialAccount, VideoPost } from './types';

const DB_DIR = path.join(process.cwd(), 'data');
const ACCOUNTS_FILE = path.join(DB_DIR, 'accounts.json');
const POSTS_FILE = path.join(DB_DIR, 'posts.json');

// Garantir diretório de dados
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export function getAccounts(): SocialAccount[] {
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    saveAccounts([]);
    return [];
  }
  try {
    const raw = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler accounts.json:', err);
    return [];
  }
}

export function saveAccounts(accounts: SocialAccount[]): void {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
}

export function getPosts(): VideoPost[] {
  if (!fs.existsSync(POSTS_FILE)) {
    savePosts([]);
    return [];
  }
  try {
    const raw = fs.readFileSync(POSTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler posts.json:', err);
    return [];
  }
}

export function savePosts(posts: VideoPost[]): void {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
}
