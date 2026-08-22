// Renders admin-published blog posts (from Supabase) on top of the static example posts.
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('dynamic-posts-grid');
  if (!grid) return;
  const categoryToFilterKey = { 'Career': 'career', 'Parenting': 'parenting', 'IELTS': 'ielts', 'Vie Locale': 'local-life', 'Entertainment': 'entertainment' };
  const badgeByCategory = { 'Career': 'badge-info', 'Parenting': 'badge-danger', 'IELTS': 'badge-amber', 'Vie Locale': 'badge-success', 'Entertainment': 'badge-info' };

  let posts = [];
  try { posts = await EP.posts({ publishedOnly: true, language: 'en' }); } catch (e) { console.warn('Could not load posts (check SUPABASE_URL/ANON_KEY in data.js):', e); }

  if (!posts.length) {
    grid.innerHTML = `<p class="text-sm text-center col-span-3" style="color:var(--text-secondary)">No articles published yet — check back soon.</p>`;
    return;
  }

  grid.innerHTML = posts.map(p => `
    <a href="blog-post.html?id=${p.id}" data-course-category="${categoryToFilterKey[p.category] || 'career'}" class="card card-hover overflow-hidden block">
      <div class="photo-placeholder aspect-[16/10] rounded-none relative">
        <i data-lucide="sparkles" class="w-10 h-10"></i>
        ${thumbnailFor(p) ? `<img src="${escapeHtmlLocal(thumbnailFor(p))}" alt="${escapeHtmlLocal(p.title)}" class="absolute inset-0 w-full h-full object-cover" loading="lazy" onerror="this.remove()">` : ''}
      </div>
      <div class="p-5">
        <span class="badge ${badgeByCategory[p.category] || 'badge-info'} mb-2">${p.category}</span>
        <p class="font-serif font-semibold" style="color:var(--navy-700)">${escapeHtmlLocal(p.title)}</p>
        <p class="text-xs mt-2" style="color:var(--text-secondary)">${escapeHtmlLocal(p.excerpt)}</p>
      </div>
    </a>`).join('');

  // Falls back to the first image found inside the post's own body content
  // when no cover photo was set — the grid then never has to fall back
  // further than that to the plain icon placeholder unless a post truly
  // has no images anywhere.
  function thumbnailFor(post) {
    if (post.cover_image_url) return post.cover_image_url;
    const match = (post.body || '').match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : null;
  }

  if (window.lucide) lucide.createIcons();
  if (posts.length && document.querySelectorAll('[data-filter]').length) {
    document.querySelectorAll('[data-filter]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const filter = chip.dataset.filter;
        document.querySelectorAll('[data-course-category]').forEach((card) => {
          card.style.display = (filter === 'all' || card.dataset.courseCategory === filter) ? '' : 'none';
        });
      });
    });
  }

  function escapeHtmlLocal(str) {
    return (str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
});
