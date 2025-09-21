module.exports = {
  rules: {
    // Require using TimezoneBoundaryService instead of direct UTC date math
    'no-restricted-properties': [
      'error',
      {
        object: 'Date',
        property: 'prototype',
        message: 'Use TimezoneBoundaryService for date calculations'
      },
      {
        object: 'Date',
        property: 'getUTCHours',
        message: 'Use TimezoneBoundaryService.getStudyDayBoundary() instead'
      },
      {
        object: 'Date',
        property: 'getUTCDate',
        message: 'Use TimezoneBoundaryService.getStudyDayBoundary() instead'
      },
      {
        object: 'Date',
        property: 'getUTCMonth',
        message: 'Use TimezoneBoundaryService.getStudyDayBoundary() instead'
      },
      {
        object: 'Date',
        property: 'getUTCFullYear',
        message: 'Use TimezoneBoundaryService.getStudyDayBoundary() instead'
      }
    ],
    // Require timezone-aware formatting
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.object.name=/^(Date|date)$/][callee.property.name=/(toLocaleString|toLocaleTimeString|toLocaleDateString)/]',
        message: 'Use TimezoneBoundaryService.formatInIST() instead'
      }
    ]
  }
};