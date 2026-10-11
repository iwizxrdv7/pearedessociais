import { NextResponse } from 'next/server';
import { MetaAPIClient } from '@/lib/meta_api';
import { saveAccountAsync } from '@/lib/storage';
import { SocialAccount } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userToken } = await req.json();

    if (!userToken) {
      return NextResponse.json({ error: 'Token de acesso não fornecido.' }, { status: 400 });
    }

    const appId = process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID || '4536635626610868';
    const appSecret = process.env.META_APP_SECRET || 'a6ea3a04536bcc3dde31f7214a91bf74';

    const { longLivedToken, pages } = await MetaAPIClient.discoverAccounts(userToken.trim(), appId, appSecret);

    if (!pages || pages.length === 0) {
      return NextResponse.json({
        error: 'Nenhuma página ou conta do Instagram encontrada para este usuário. Certifique-se de que seu usuário administra ao menos uma Página do Facebook.',
      }, { status: 404 });
    }

    const imported: SocialAccount[] = [];

    for (const page of pages) {
      const pageId = page.id;
      const pageName = page.name;
      const pageToken = page.access_token || longLivedToken;
      const ig = page.instagram_business_account;

      // Buscar foto da página
      let avatar = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop';
      try {
        const picRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/picture?type=large&redirect=false&access_token=${pageToken}`);
        const picData = await picRes.json();
        if (picData.data?.url) avatar = picData.data.url;
      } catch {}

      const account: SocialAccount = {
        id: `meta-${pageId}`,
        name: pageName,
        platform: ig ? 'instagram' : 'facebook',
        avatar: ig?.profile_picture_url || avatar,
        facebook_page_id: pageId,
        facebook_page_name: pageName,
        facebook_page_token: pageToken,
        instagram_account_id: ig?.id,
        instagram_username: ig?.username,
        instagram_name: ig?.name,
        status: 'active',
        default_caption: 'Confira nosso novo vídeo! 🔥🚀\n\n#viral #reels #explore',
        default_hashtags: ['viral', 'reels', 'explore'],
        schedule_times: ['06:00', '12:00', '18:00', '21:00'],
        post_to_facebook: true,
        post_to_instagram: !!ig?.id,
        created_at: new Date().toISOString(),
      };

      await saveAccountAsync(account);
      imported.push(account);
    }

    return NextResponse.json({
      success: true,
      importedCount: imported.length,
      accounts: imported,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao importar contas da Meta.' }, { status: 500 });
  }
}
