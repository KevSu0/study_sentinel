# Contributing

Thank you for contributing to Firebase Studio! This document provides guidelines for contributing to the project.

## Development Workflow

### 1. Pre-commit Hooks (Fast Checks)
When you commit code, the following fast checks run automatically:
- ESLint with auto-fix
- Remote API literal scanner
- Service worker artifact check

These should complete in under 5 seconds.

### 2. Pre-push Hooks (Related Tests)
Before pushing to remote:
- Jest runs related tests for your changed files
- Only tests that could be affected by your changes run

### 3. CI/PR Pipeline (Full Suite)
When opening a PR:
- Complete Jest test suite
- TypeScript type checking
- All linting and security scans
- Build verification

## Emergency Bypass

If you need to skip hooks in an emergency:

```bash
# Skip pre-commit hooks
HUSKY_BYPASS=true git commit -m "Your message"

# Skip pre-push hooks
HUSKY_BYPASS=true git push
```

**Important:**
- Only use bypass in genuine emergencies
- You MUST disclose any bypass usage in your PR description
- CI must pass before merges, regardless of bypass usage
- Reviewers will reject PRs with undocumented bypasses

## Code Quality

### Selector Policy
- Prefer ARIA roles and accessible names for DOM queries
- Use `data-testid` only when no accessible hook exists
- One well-named `data-testid` per surface maximum

### Dependency Management
- All `react-hooks/exhaustive-deps` warnings must be resolved
- Use `useMemo`/`useCallback` or explicit dependency lists
- Scoped disables require a comment explaining why + ticket reference

### Testing
- New tests should use existing harness patterns
- Avoid brittle text-based selectors
- Centralize mocks in `jest.setup.js` and `src/test/mocks/sync-fixtures.ts`

## Remote API Policy

By default, `remote_apis=false` in development and CI.

### Allowlist
- Remote API usage must be added to `scripts/remote-api-allowlist.json`
- PRs expanding the allowlist must include rationale
- Static scanner fails fast on unapproved `/api/` literals

## Pull Request Process

1. Fork and create a feature branch
2. Make your changes
3. Ensure all checks pass locally
4. Push your branch and open a PR
5. Disclose any bypass usage in the PR description
6. Address review feedback
7. Ensure CI passes before merge

## Getting Help

- Check existing [Architecture Decision Records](docs/adr/)
- Review the [Testing Guide](docs/testing-guide.md)
- Ask questions in PR discussions or issues

## Reviewer Checklist

- [ ] All automated checks pass
- [ ] Code follows project conventions
- [ ] Tests are included and appropriate
- [ ] Documentation is updated if needed
- [ ] Any bypass usage is documented and justified