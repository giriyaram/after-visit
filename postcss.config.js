/* global module, require */
// StyleX build setup, copied from apps/example-nextjs-stylex in github.com/meta/astryx.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const babelConfig = require('./babel.config');

module.exports = {
  plugins: {
    '@stylexjs/postcss-plugin': {
      // Only app code is compiled; Astryx ships pre-built CSS.
      include: ['app/**/*.{js,jsx,ts,tsx}', 'components/**/*.{js,jsx,ts,tsx}'],
      babelConfig: {
        babelrc: false,
        parserOpts: {
          plugins: ['typescript', 'jsx'],
        },
        plugins: babelConfig.plugins,
      },
      useCSSLayers: {
        // Declare Astryx dist layers before StyleX app layers so
        // product styles always win over component defaults.
        before: ['reset', 'astryx-base', 'astryx-theme'],
      },
    },
    autoprefixer: {},
  },
};
