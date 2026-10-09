export interface SocialAccount {
  id: string;
  name: string;
  avatar?: string;
  platform: 'facebook' | 'instagram' | 'tiktok' | 'youtube';
  facebook_page_id?: string;
  facebook_page_name?: string;
  facebook_page_token?: string;
  instagram_account_id?: string;
  instagram_username?: string;
  instagram_name?: string;
  status: 'active' | 'disconnected' | 'warning';
  default_caption?: string;
  default_hashtags?: string[];
  schedule_times?: string[];
  created_at: string;
  post_to_facebook: boolean;
  post_to_instagram: boolean;
}

export interface VideoPost {
  id: string;
  account_id: string;
  account_name: string;
  title: string;
  caption: string;
  hashtags: string[];
  video_url: string;
  video_filename: string;
  file_size_mb: number;
  duration_seconds?: number;
  thumbnail_url?: string;
  status: 'draft' | 'queued' | 'processing' | 'scheduled' | 'published' | 'failed';
  scheduled_for?: string; // ISO string
  published_at?: string;
  error_message?: string;
  meta_video_id?: string;
  meta_media_id?: string;
  post_urls?: {
    instagram?: string;
    facebook?: string;
  };
  created_at: string;
}

export interface DashboardStats {
  total_accounts: number;
  active_accounts: number;
  scheduled_posts: number;
  published_today: number;
  total_published: number;
  failed_posts: number;
}
