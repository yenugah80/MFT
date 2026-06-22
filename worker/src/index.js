export default {
  async scheduled(event, env) {
    const url = env.BACKEND_URL;      // https://api.my-food-tracker.com/api/health
    const token = env.HEALTH_TOKEN;   // my-health-secret-124

    if (!url) {
      console.error('Scheduled ping skipped: BACKEND_URL not set');
      return;
    }

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: token ? { 'x-health-token': token } : {},
      });
      console.log('Worker: ping', url, 'status', res.status);
      await res.text();
    } catch (err) {
      console.error('Worker: ping failed', err);
    }
  },

  async fetch(request, env) {
    // For Cloudflare Access protected workers, validate the Access JWT
    // Scheduled jobs don't need to validate, only HTTP requests do
    return new Response('Worker is healthy', { status: 200 });
  },
};
