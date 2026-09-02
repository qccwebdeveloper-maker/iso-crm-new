// Dev-only proxy. The `proxy` field in package.json does NOT forward full-page
// navigations (requests with an `Accept: text/html` header), so opening a file via
// <a href="/api/files/..."> or "/uploads/..." in `npm start` would otherwise hit the
// React dev server instead of the backend. This forwards those paths explicitly.
// In production, nginx handles the same proxying (see frontend/nginx.conf).
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    ['/api', '/uploads'],
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
    })
  );
};
