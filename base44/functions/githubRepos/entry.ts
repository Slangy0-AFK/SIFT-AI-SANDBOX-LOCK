import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const OWNER = 'Slangy0-AFK';
const REPOS = ['mathmesh-governor', 'omnibase-ai', 'deterministic-rag-governor', 'computer-crash-fix-'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { action = 'list', repo, path = '', ref } = await req.json().catch(() => ({}));
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');

    const gh = async (url) => {
      const r = await fetch(`https://api.github.com${url}`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'SiftAI' },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(`GitHub ${r.status}: ${data.message}`);
      return data;
    };

    if (action === 'list') {
      const repos = await Promise.all(REPOS.map(async (name) => {
        const d = await gh(`/repos/${OWNER}/${name}`);
        return { name: d.name, description: d.description, private: d.private, default_branch: d.default_branch, language: d.language, updated_at: d.updated_at, url: d.html_url };
      }));
      return Response.json({ repos });
    }

    if (!REPOS.includes(repo)) return Response.json({ error: `repo must be one of: ${REPOS.join(', ')}` }, { status: 400 });
    const base = `/repos/${OWNER}/${repo}`;
    const refQ = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const safePath = path.split('/').map(encodeURIComponent).join('/');

    if (action === 'contents') {
      const d = await gh(`${base}/contents/${safePath}${refQ}`);
      if (Array.isArray(d)) return Response.json({ type: 'dir', items: d.map(i => ({ name: i.name, path: i.path, type: i.type, size: i.size })) });
      const content = d.encoding === 'base64' ? new TextDecoder().decode(Uint8Array.from(atob(d.content.replace(/\n/g, '')), c => c.charCodeAt(0))) : d.content;
      return Response.json({ type: 'file', path: d.path, size: d.size, content });
    }
    if (action === 'readme') {
      const d = await gh(`${base}/readme${refQ}`);
      return Response.json({ content: new TextDecoder().decode(Uint8Array.from(atob(d.content.replace(/\n/g, '')), c => c.charCodeAt(0))) });
    }
    if (action === 'commits') {
      const d = await gh(`${base}/commits?per_page=20`);
      return Response.json({ commits: d.map(c => ({ sha: c.sha, message: c.commit.message, author: c.commit.author?.name, date: c.commit.author?.date })) });
    }
    if (action === 'releases') {
      const d = await gh(`${base}/releases?per_page=20`);
      return Response.json({ releases: d.map(r => ({ tag: r.tag_name, name: r.name, published_at: r.published_at, body: r.body })) });
    }
    return Response.json({ error: 'action must be list, contents, readme, commits, or releases' }, { status: 400 });
  } catch (error) {
    console.error('githubRepos error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}