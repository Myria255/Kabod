// supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
/*import AsyncStorage from '@react-native-async-storage/async-storage';*/
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = 'https://bddzxoucvycndpkbxiwa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHp4b3VjdnljbmRwa2J4aXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjQ0MzAsImV4cCI6MjA4MjYwMDQzMH0.Hjyhwo5QKBgIt4k6SN33SF9TLn-1Lh9DI2D1b_YnIK0';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      async getItem(key: string) {
        return await SecureStore.getItemAsync(key);
      },
      async setItem(key: string, value: string) {
        await SecureStore.setItemAsync(key, value);
      },
      async removeItem(key: string) {
        await SecureStore.deleteItemAsync(key);
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
