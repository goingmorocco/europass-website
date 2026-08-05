// Renders admin-published Arabic blog posts (language='ar' in Supabase) on the
// Arabic blog list page. Separate from blog-live.js by design — same pattern
// used for the rest of the Arabic site (dedicated scripts, not shared with
// runtime language-switching logic, to keep each page simple and low-risk).
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('dynamic-posts-grid-ar');
  if (!grid) return;

  const categoryLabelAr = {
    'Career': '\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u0647\u0646\u064a',
    'Parenting': '\u0627\u0644\u0623\u0628\u0648\u0629',
    'IELTS': 'IELTS',
    'Vie Locale': '\u0627\u0644\u062d\u064a\u0627\u0629 \u0627\u0644\u0645\u062d\u0644\u064a\u0629',
    'Entertainment': '\u062a\u0631\u0641\u064a\u0647',
  };
  const categoryToFilterKey = { 'Career': 'career', 'Parenting': 'parenting', 'IELTS': 'ielts', 'Vie Locale': 'local-life', 'Entertainment': 'entertainment' };
  const badgeByCategory = { 'Career': 'badge-info', 'Parenting': 'badge-danger', 'IELTS': 'badge-amber', 'Vie Locale': 'badge-success', 'Entertainment': 'badge-info' };

  let posts = [];
  try { posts = await EP.posts({ publishedOnly: true, language: 'ar' }); } catch (e) { console.warn('Could not load posts (check SUPABASE_URL/ANON_KEY in data.js):', e); }

  if (!posts.length) {
    grid.innerHTML = `<p class="text-sm text-center col-span-3" style="color:var(--text-secondary)">لا توجد مقالات عربية منشورة بعد.</p>`;
    return;
  }

  grid.innerHTML = posts.map(p => `
    <a href="blog-post.html?id=${p.id}" data-course-category="${categoryToFilterKey[p.category] || 'career'}" class="card card-hover overflow-hidden block">
      <div class="photo-placeholder aspect-[16/10] rounded-none"><i data-lucide="sparkles" class="w-10 h-10"></i></div>
      <div class="p-5">
        <span class="badge ${badgeByCategory[p.category] || 'badge-info'} mb-2">${categoryLabelAr[p.category] || p.category}</span>
        <p class="font-serif font-semibold" style="color:var(--navy-700)">${escapeHtmlLocal(p.title)}</p>
        <p class="text-xs mt-2" style="color:var(--text-secondary)">${escapeHtmlLocal(p.excerpt)}</p>
      </div>
    </a>`).join('');

  if (window.lucide) lucide.createIcons();
  document.querySelectorAll('[data-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      const filter = chip.dataset.filter;
      document.querySelectorAll('[data-course-category]').forEach((card) => {
        card.style.display = (filter === 'all' || card.dataset.courseCategory === filter) ? '' : 'none';
      });
    });
  });

  function escapeHtmlLocal(str) {
    return (str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
});
