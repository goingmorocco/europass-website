// If the URL has ?id=<postId> matching a published post, swap the static
// example article for the real one fetched from Supabase.
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const staticBody = document.getElementById('post-live-static-body');
  const liveBody = document.getElementById('post-live-body');
  if (!id) { if (liveBody) liveBody.classList.add('hidden'); return; }

  let post = null;
  try { post = await EP.postById(id); } catch (e) { console.warn('Could not load post:', e); }
  if (!post) { if (liveBody) liveBody.classList.add('hidden'); return; }

  document.getElementById('post-live-badge').textContent = post.category;
  document.getElementById('post-live-title').textContent = post.title;
  document.title = post.title + ' | EuroPass';
  document.getElementById('post-live-byline').innerHTML = `
    <div class="photo-placeholder w-10 h-10 rounded-full"><i data-lucide="user" class="w-4 h-4"></i></div>
    <div><p class="text-sm font-semibold" style="color:var(--navy-700)">EuroPass Team</p><p class="text-xs" style="color:var(--text-secondary)">${post.category}</p></div>`;
  liveBody.textContent = post.body;
  liveBody.classList.remove('hidden');
  if (staticBody) staticBody.classList.add('hidden');
  if (window.lucide) lucide.createIcons();
});
