import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Chybí VITE_SUPABASE_URL nebo VITE_SUPABASE_ANON_KEY v environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
