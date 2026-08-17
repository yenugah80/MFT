/**
 * Invokes the actual registered /correlations Express route handler
 * directly (via router.stack), with mock req/res, to remove all ambiguity
 * about whether the live HTTP route behaves differently from calling the
 * underlying functions directly.
 */
import insightsRouter from './src/routes/insights.js';

const layer = insightsRouter.stack.find(
  (l) => l.route && l.route.path === '/correlations' && l.route.methods.get
);

if (!layer) {
  console.error('Could not find /correlations route in router.stack');
  process.exit(1);
}

const handler = layer.route.stack[layer.route.stack.length - 1].handle;

const req = {
  auth: () => ({ userId: 'user_3HgUj90Az5gLi0FTw95ADqHijw2' }),
  query: {},
};

const res = {
  json(body) {
    console.log('res.json called with:');
    console.log(JSON.stringify(body, null, 2));
  },
  status(code) {
    console.log(`res.status(${code}) called`);
    return this;
  },
};

await handler(req, res);
process.exit(0);
