// Renders admin-published French blog posts (language='fr' in Supabase) on
// the French blog list page. Separate dedicated script, same pattern as
// blog-live.js and ar-blog-live.js — filter bar and badge colors are built
// dynamically from the real categories table.
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('dynamic-posts-grid-fr');
  const filterBar = document.getElementById('blog-filter-bar-fr');
  if (!grid) return;

  const BADGE_PALETTE = ['badge-info', 'badge-danger', 'badge-amber', 'badge-success'];
  function badgeFor(category) {
    let hash = 0;
    for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
    return BADGE_PALETTE[hash % BADGE_PALETTE.length];
  }

  let posts = [];
  let categories = [];
  try { posts = await EP.posts({ publishedOnly: true, language: 'fr' }); } catch (e) { console.warn('Could not load posts (check SUPABASE_URL/ANON_KEY in data.js):', e); }
  try { categories = await EP.categories('fr'); } catch (e) { console.warn('Could not load categories:', e); }

  if (filterBar) {
    filterBar.innerHTML = `<button data-filter="all" aria-pressed="true" class="persona-tab">Tous</button>` +
      categories.map(c => `<button data-filter="${escapeHtmlLocal(c.name)}" aria-pressed="false" class="persona-tab">${escapeHtmlLocal(c.name)}</button>`).join('');
    filterBar.querySelectorAll('[data-filter]').forEach((chip) => {
      chip.addEventListener('click', () => {
        filterBar.querySelectorAll('[data-filter]').forEach((c) => c.setAttribute('aria-pressed', 'false'));
        chip.setAttribute('aria-pressed', 'true');
        const filter = chip.dataset.filter;
        document.querySelectorAll('[data-course-category]').forEach((card) => {
          card.style.display = (filter === 'all' || card.dataset.courseCategory === filter) ? '' : 'none';
        });
      });
    });
  }

  if (!posts.length) {
    grid.innerHTML = `<p class="text-sm text-center col-span-3" style="color:var(--text-secondary)">Aucun article publi\u00e9 pour le moment — revenez bient\u00f4t.</p>`;
    return;
  }

  grid.innerHTML = posts.map(p => `
    <a href="blog-post.html?id=${p.id}" data-course-category="${escapeHtmlLocal(p.category)}" class="card card-hover overflow-hidden block">
      <div class="photo-placeholder aspect-[16/10] rounded-none relative">
        <i data-lucide="sparkles" class="w-10 h-10"></i>
        ${thumbnailFor(p) ? `<img src="${escapeHtmlLocal(thumbnailFor(p))}" alt="${escapeHtmlLocal(p.title)}" class="absolute inset-0 w-full h-full object-cover" loading="lazy" onerror="this.remove()">` : ''}
      </div>
      <div class="p-5">
        <span class="badge ${badgeFor(p.category)} mb-2">${escapeHtmlLocal(p.category)}</span>
        <p class="font-serif font-semibold" style="color:var(--navy-700)">${escapeHtmlLocal(p.title)}</p>
        <p class="text-xs mt-2" style="color:var(--text-secondary)">${escapeHtmlLocal(p.excerpt)}</p>
      </div>
    </a>`).join('');

  function thumbnailFor(post) {
    if (post.cover_image_url) return post.cover_image_url;
    const match = (post.body || '').match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : null;
  }

  if (window.lucide) lucide.createIcons();

  function escapeHtmlLocal(str) {
    return (str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
});
