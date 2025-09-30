const DEPRECATE_ROUTER_NEXT_VERSION = [
  '/article',
  '/comment',
  '/db',
  '/oauth',
  '/token',
  '/user',
  '/verification',
  '/token/2fa',
  '/user/password',
];

module.exports = () => async (ctx, next) => {
  ctx.state.deprecated = DEPRECATE_ROUTER_NEXT_VERSION.some((prefix) => {
    const oldAPI = new RegExp(`${prefix}$`, 'i');
    const newAPI = new RegExp(`/api${prefix}$`, 'i');

    return !newAPI.test(ctx.path) && oldAPI.test(ctx.path);
  });

  if (ctx.state.deprecated) {
    think.logger.warn(
      `[Deprecated] ${ctx.path} API will be deprecated in the next major version, please don't use it anymore. `,
    );
  }

  await next();
};
