import { Link, Route, Routes, useParams } from 'react-router-dom';
import { posts, getPost } from './content/posts';
import { EigCalculator } from './widgets/EigCalculator';
import { QuestionToBitmask } from './widgets/QuestionToBitmask';
import { AndTape } from './widgets/AndTape';
import { BitmaskElimination } from './widgets/BitmaskElimination';

export function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-prose items-baseline justify-between px-4 py-4">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            UQ · 20 Questions
          </Link>
          <nav className="flex gap-4 text-xs text-ink/60">
            <Link to="/" className="hover:text-ink">
              Posts
            </Link>
            <Link to="/sandbox" className="hover:text-ink">
              Widget sandbox
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-prose px-4 py-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/p/:slug" element={<Post />} />
          <Route path="/sandbox" element={<Sandbox />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function Home() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Uncertainty quantification for agentic AI
      </h1>
      <p className="mt-2 text-ink/70">
        A series on how agents should reason and act under uncertainty — built up
        from the simplest possible model.
      </p>
      <ul className="mt-8 space-y-6">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link to={`/p/${p.slug}`} className="group block">
              <h2 className="text-lg font-medium text-accent group-hover:underline">
                {p.title}
              </h2>
              <p className="mt-1 text-sm text-ink/70">{p.summary}</p>
              <p className="mt-1 text-xs text-ink/40">{p.date}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Post() {
  const { slug } = useParams();
  const post = slug ? getPost(slug) : undefined;
  if (!post) return <NotFound />;
  const { Component } = post;
  return (
    <article className="essay">
      <h1>{post.title}</h1>
      <Component />
      <p className="mt-12 text-sm">
        <Link to="/" className="text-accent hover:underline">
          ← All posts
        </Link>
      </p>
    </article>
  );
}

// §9: widgets must render correctly in isolation so essay copy can change freely.
function Sandbox() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Widget sandbox</h1>
      <p className="mt-2 text-sm text-ink/60">
        Each widget rendered standalone, decoupled from the post prose.
      </p>
      <EigCalculator />
      <QuestionToBitmask />
      <AndTape />
      <BitmaskElimination />
    </div>
  );
}

function NotFound() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <p className="mt-2 text-sm text-ink/60">
        <Link to="/" className="text-accent hover:underline">
          ← Back to posts
        </Link>
      </p>
    </div>
  );
}
