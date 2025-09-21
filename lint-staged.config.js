module.exports = {
  '*.{ts,tsx,js,jsx}': [
    'node ./scripts/check-remote-api-literals.js --files',
    'eslint --max-warnings=0 --fix'
  ]
};
