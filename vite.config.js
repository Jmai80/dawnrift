import { defineConfig } from 'vite';

// Tvinga Vite att förbunta Supabase OCH dess hjälpbibliotek tslib tillsammans.
// Supabase-paketen importerar { __awaiter, __rest } från "tslib"; utan detta
// kan Vites förbuntning lämna "tslib" oupplöst och dev-servern kraschar med
// "Failed to resolve import 'tslib'".
export default defineConfig({
  optimizeDeps: {
    include: ['@supabase/supabase-js', 'tslib'],
  },
});