// Renders admin-published blog posts (from Supabase) on top of the static example posts.
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('dynamic-posts-grid');
  if (!grid) return;
  const categoryToFilterKey = { 'Career': 'career', 'Parenting': 'parenting', 'IELTS': 'ielts', 'Vie Locale': 'local-life', 'Entertainment': 'entertainment' };
  const badgeByCategory = { 'Career': 'badge-info', 'Parenting': 'badge-danger', 'IELTS': 'badge-amber', 'Vie Locale': 'badge-success', 'Entertainment': 'badge-info' };

  let posts = [];
  try { posts = await EP.posts({ publishedOnly: true }); } catch (e) { console.warn('Could not load posts (check SUPABASE_URL/ANON_KEY in data.js):', e); }

  grid.innerHTML = posts.map(p => `
    <a href="blog-post.html?id=${p.id}" data-course-category="${categoryToFilterKey[p.category] || 'career'}" class="card card-hover overflow-hidden block">
      <div class="photo-placeholder aspect-[16/10] rounded-none"><i data-lucide="sparkles" class="w-10 h-10"></i></div>
      <div class="p-5">
        <span class="badge ${badgeByCategory[p.category] || 'badge-info'} mb-2">${p.category}</span>
        <p class="font-serif font-semibold" style="color:var(--navy-700)">${escapeHtmlLocal(p.title)}</p>
        <p class="text-xs mt-2" style="color:var(--text-secondary)">${escapeHtmlLocal(p.excerpt)}</p>
      </div>
    </a>`).join('');

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
