// Tree-shaking optimization configuration
// This file helps identify and configure packages for better tree-shaking

module.exports = {
  // Packages that support tree-shaking
  treeShakablePackages: [
    'lucide-react',
    'date-fns',
    'lodash-es',
    'ramda',
    '@radix-ui/react-icons',
    'framer-motion',
    'recharts'
  ],
  
  // Packages that need special handling for tree-shaking
  specialHandling: {
    'date-fns': {
      // Use specific imports instead of default import
      recommendation: "import { format, parseISO } from 'date-fns';"
    },
    'lucide-react': {
      // Already optimized in next.config.ts
      recommendation: "import { Calendar, Clock } from 'lucide-react';"
    },
    'framer-motion': {
      // Use specific imports for better tree-shaking
      recommendation: "import { motion, AnimatePresence } from 'framer-motion';"
    },
    'recharts': {
      // Import specific chart components
      recommendation: "import { PieChart, Pie, Cell } from 'recharts';"
    }
  },
  
  // Webpack optimization settings for tree-shaking
  webpackOptimization: {
    usedExports: true,
    sideEffects: false,
    concatenateModules: true,
    providedExports: true,
    innerGraph: true,
    mangleExports: 'deterministic'
  },
  
  // ESLint rules to enforce tree-shaking friendly imports
  eslintRules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['date-fns'],
            message: 'Use specific imports from date-fns for better tree-shaking: import { format } from "date-fns";'
          },
          {
            group: ['lodash'],
            message: 'Use lodash-es for better tree-shaking: import { debounce } from "lodash-es";'
          }
        ]
      }
    ]
  }
};