# QB Release Gate Checklist

Status: working

## Required pre-release checks
- [ ] `npm run build` passed
- [ ] Regression checklist completed for touched flows
- [ ] Schema health check passed (`/api/health/schema`)
- [ ] Dispatch acceptance criteria passed
- [ ] Rollback owner assigned
- [ ] Rollback command path verified
