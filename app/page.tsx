import { supabase, Post } from '@/lib/supabase'

export const revalidate = 60

async function getPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }
  return data ?? []
}

export default async function Home() {
  const posts = await getPosts()

  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <header className="mb-12">
        <h1 className="text-3xl font-bold mb-2">Anton Zaides</h1>
        <p className="text-gray-500">Writing about engineering, management, and building.</p>
      </header>

      <section className="mb-12">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Tools</h2>
        <a href="/posts" className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors font-medium">
          📊 LinkedIn Posts — 2023 analysis
        </a>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-6">Posts</h2>
        {posts.length === 0 ? (
          <p className="text-gray-400">No posts yet.</p>
        ) : (
          <ul className="space-y-8">
            {posts.map((post) => (
              <li key={post.id}>
                <time className="text-sm text-gray-400">
                  {new Date(post.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                <h3 className="text-xl font-semibold mt-1 mb-1">{post.title}</h3>
                {post.excerpt && (
                  <p className="text-gray-500">{post.excerpt}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
