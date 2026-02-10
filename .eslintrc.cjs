module.exports = {
  root: true,
  extends: ['@nuxtjs/eslint-config-typescript', 'prettier'],
  overrides: [
    {
      files: ['src/functions/**/*.ts'],
      rules: {
        'import/namespace': 'off'
      }
    }
  ]
}
