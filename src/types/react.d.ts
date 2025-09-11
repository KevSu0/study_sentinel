// Fix for React 18 and Next.js 15 type compatibility
declare namespace React {
  type ReactNode = import('react').ReactNode;
}