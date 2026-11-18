/* global module, require, process, __dirname */
// StyleX build setup, copied from apps/example-nextjs-stylex in github.com/meta/astryx.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('node:path');

const dev = process.env.NODE_ENV !== 'production';

module.exports = {
  presets: ['next/babel'],
  plugins: [
    [
      '@stylexjs/babel-plugin',
      // https://stylexjs.com/docs/api/configuration/babel-plugin/
      {
        dev,
        runtimeInjection: false,
        enableInlinedConditionalMerge: true,
        treeshakeCompensation: true,
        aliases: {
          '@/*': [path.join(__dirname, '*')],
        },
        classNamePrefix: 'p',
        unstable_moduleResolution: {
          type: 'commonJS',
        },
      },
    ],
  ],
};
