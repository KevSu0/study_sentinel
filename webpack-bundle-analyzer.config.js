// Bundle analyzer configuration for detailed analysis
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
      defaultSizes: 'gzip',
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
      logLevel: 'info'
    })
  ]
};