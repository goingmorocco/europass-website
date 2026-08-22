// Renders admin-published Arabic blog posts (language='ar' in Supabase) on the
// Arabic blog list page. Separate from blog-live.js by design — same pattern
// used for the rest of the Arabic site (dedicated scripts, not shared with
// runtime language-switching logic, to keep each page simple and low-risk).
// Filter bar and badge colors are built dynamically from the real
// categories table, same as the English version.
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('dynamic-posts-grid-ar');
  const filterBar = document.getElementById('blog-filter-bar-ar');
  if (!grid) return;

  // Backward-compat only: a handful of older Arabic posts may have been
  // saved with an English category name from before Arabic categories
  // existed. This just makes sure those still display something readable;
  // it is not used for any new post going forward.
  const legacyCategoryLabelAr = {
    'Career': '\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u0647\u0646\u064a',
    'Parenting': '\u0627\u0644\u0623\u0628\u0648\u0629',
    'IELTS': 'IELTS',
    'Vie Locale': '\u0627\u0644\u062d\u064a\u0627\u0629 \u0627\u0644\u0645\u062d\u0644\u064a\u0629',
    'Entertainment': '\u062a\u0631\u0641\u064a\u0647',
  };
  function displayCategory(name) { return legacyCategoryLabelAr[name] || name; }

  const BADGE_PALETTE = ['badge-info', 'badge-danger', 'badge-amber', 'badge-success'];
  function badgeFor(category) {
    let hash = 0;
    for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
    return BADGE_PALETTE[hash % BADGE_PALETTE.length];
  }

  let posts = [];
  let categories = [];
  try { posts = await EP.posts({ publishedOnly: true, language: 'ar' }); } catch (e) { console.warn('Could not load posts (check SUPABASE_URL/ANON_KEY in data.js):', e); }
  try { categories = await EP.categories('ar'); } catch (e) { console.warn('Could not load categories:', e); }

  if (filterBar) {
    // Mirrors the categories table directly — same as the English version.
    filterBar.innerHTML = `<button data-filter="all" aria-pressed="true" class="persona-tab">\u0627\u0644\u0643\u0644</button>` +
      categories.map(c => `<button data-filter="${escapeHtmlLocal(c.name)}" aria-pressed="false" class="persona-tab">${escapeHtmlLocal(displayCategory(c.name))}</button>`).join('');
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
    grid.innerHTML = `<p class="text-sm text-center col-span-3" style="color:var(--text-secondary)">\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0642\u0627\u0644\u0627\u062a \u0639\u0631\u0628\u064a\u0629 \u0645\u0646\u0634\u0648\u0631\u0629 \u0628\u0639\u062f.</p>`;
    return;
  }

  grid.innerHTML = posts.map(p => `
    <a href="blog-post.html?id=${p.id}" data-course-category="${escapeHtmlLocal(p.category)}" class="card card-hover overflow-hidden block">
      <div class="photo-placeholder aspect-[16/10] rounded-none relative">
        <i data-lucide="sparkles" class="w-10 h-10"></i>
        ${thumbnailFor(p) ? `<img src="${escapeHtmlLocal(thumbnailFor(p))}" alt="${escapeHtmlLocal(p.title)}" class="absolute inset-0 w-full h-full object-cover" loading="lazy" onerror="this.remove()">` : ''}
      </div>
      <div class="p-5">
        <span class="badge ${badgeFor(p.category)} mb-2">${escapeHtmlLocal(displayCategory(p.category))}</span>
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
