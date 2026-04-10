module.exports = function(api) {
  api && api.cache && api.cache(true);
  return {
    presets: [['babel-preset-expo', { 'react-compiler': false }]],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './',
          },
        },
      ],
    ],
  };
};