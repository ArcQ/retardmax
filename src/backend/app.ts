import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

app.get('/api', (context) => context.json({ name: 'retardmax API', version: '1.0.0' }));
app.get('/api/health', (context) => context.json({ ok: true, stack: 'astro+react+hono+workers+d1' }));
app.all('/api/*', (context) => context.json({ error: 'Not found' }, 404));

export default app;
