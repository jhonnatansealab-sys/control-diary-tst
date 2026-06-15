const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isDemoMode = !(url && publishableKey);
export const supabaseUrl = url as string | undefined;
export const supabasePublishableKey = publishableKey as string | undefined;
