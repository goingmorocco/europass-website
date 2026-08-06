// Loads the real post matching ?id=<postId> from Supabase. If there's no id,
// or no published post matches it, shows an honest "not available" state
// instead of falling back to placeholder demo content pretending to be real.
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const liveBody = document.getElementById('post-live-body');
  const notFound = document.getElementById('post-live-notfound');

  function showNotFound() {
    if (notFound) notFound.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  if (!id) { showNotFound(); return; }

  let post = null;
  try { post = await EP.postById(id); } catch (e) { console.warn('Could not load post:', e); }
  if (!post || post.status !== 'published') { showNotFound(); return; }

  try {
    document.getElementById('post-live-badge').textContent = post.category;
    document.getElementById('post-live-badge').classList.remove('hidden');
    document.getElementById('post-live-title').textContent = post.title;
    document.getElementById('post-live-crumb').textContent = post.title;
    document.title = post.title + ' | EuroPass';
    const cover = document.getElementById('post-live-cover');
    if (cover && post.cover_image_url) {
      cover.src = post.cover_image_url;
      cover.alt = post.title;
      cover.classList.remove('hidden');
    }
    document.getElementById('post-live-byline').innerHTML = `
      <div class="photo-placeholder w-10 h-10 rounded-full"><i data-lucide="user" class="w-4 h-4"></i></div>
      <div><p class="text-sm font-semibold" style="color:var(--navy-700)">EuroPass Team</p><p class="text-xs" style="color:var(--text-secondary)">${post.category}</p></div>`;
    // Post body is admin-authored rich text (from the Quill editor in the
    // admin portal), not public user input, so rendering it as HTML here is
    // the correct and standard approach — same trust boundary as any CMS.
    liveBody.innerHTML = post.body;
    liveBody.classList.add('post-body-rendered');
    if (post.language === 'ar') {
      liveBody.setAttribute('dir', 'rtl');
      liveBody.setAttribute('lang', 'ar');
    }
    liveBody.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error('Post loaded but the page could not render it (template mismatch?):', err);
    showNotFound();
  }
});
