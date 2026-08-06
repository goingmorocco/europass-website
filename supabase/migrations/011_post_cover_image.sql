-- Adds a cover image to blog posts, shown in the posts grid on the public
-- blog list and at the top of the individual post page. Stored as a plain
-- URL (same pattern as every other image on the site — no upload handling,
-- just paste a link), and optional so existing posts keep working without one.

alter table public.posts
  add column if not exists cover_image_url text;
