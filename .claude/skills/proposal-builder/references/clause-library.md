# Clause Library

Reusable assumptions, exclusions, and terms organized by project type. Copy and customize for each proposal.

This file is designed to be **user-editable** — add your own clauses as you build more proposals.

---

## Universal Assumptions

These apply to most consulting engagements regardless of type.

### Client Responsibilities
- Client designates a single point of contact with decision-making authority for the duration of the engagement
- Client provides timely access to relevant systems, environments, and stakeholders as needed
- Client provides feedback on deliverables within 5 business days of submission
- Client is responsible for obtaining any internal approvals required to proceed

### Availability & Access
- Project team has access to necessary development/staging environments
- Required accounts, credentials, and permissions are provisioned before work begins
- Remote access is available unless on-site is explicitly required

### Scope & Timeline
- Scope is as defined in this proposal; changes require written agreement
- Timeline estimates assume no major scope changes after kickoff
- Delays caused by client availability may extend the timeline proportionally
- All timelines are estimates and subject to adjustment based on discovery findings

### Communication
- Weekly status updates provided via email or agreed channel
- Milestone reviews scheduled at the end of each phase
- Issues and blockers communicated within 1 business day of identification

---

## Universal Exclusions

These are commonly excluded from consulting engagements.

### Cost Exclusions
- Third-party software licensing, subscription, or SaaS fees
- Hardware procurement or infrastructure costs beyond agreed scope
- Travel and accommodation expenses (unless pre-approved)
- Data migration from systems not specified in scope

### Scope Exclusions
- Training beyond what is explicitly listed in deliverables
- Ongoing maintenance or support after project completion (unless retainer agreed)
- Content creation (copywriting, graphic design) unless specified
- Integration with systems not mentioned in the scope of work
- Performance optimization beyond functional requirements
- Legacy system decommissioning

### Legal & Compliance
- Legal review of contracts or regulatory filings
- Compliance certification or audit preparation (unless specified)
- Data privacy impact assessments (unless specified)

---

## Consulting Engagements

### Additional Assumptions — Consulting
- Recommendations are advisory; implementation decisions rest with the client
- Assessment findings are based on information available during the engagement period
- Benchmarks and industry comparisons use publicly available data
- Client stakeholders are available for interviews/workshops as scheduled

### Additional Exclusions — Consulting
- Implementation of recommendations (unless included in scope)
- Organizational change management beyond advisory recommendations
- Recruitment or HR activities related to recommended staffing changes

### Common Terms — Consulting
- Deliverables are provided in draft form for client review before finalization
- Final deliverables incorporate one round of client feedback
- Additional revision rounds available at agreed hourly rate

---

## Development Engagements

### Additional Assumptions — Development
- Existing codebase is in a buildable, functional state
- Technical stack and architecture decisions are finalized before development begins
- Client provides test data and test scenarios for validation
- Code repository and CI/CD pipeline access provided before kickoff
- API documentation for third-party integrations is available and current

### Additional Exclusions — Development
- Refactoring or fixing existing codebase issues not related to project scope
- Performance testing and load testing (unless specified)
- App store submission and review processes
- SSL certificates, domain registration, and DNS configuration
- Database administration and ongoing monitoring

### Common Terms — Development
- Source code delivered via agreed repository (GitHub, GitLab, etc.)
- Code meets agreed-upon quality standards (linting, testing, documentation)
- 30-day warranty period for defect fixes after final delivery
- Warranty covers defects in delivered code, not feature enhancements

---

## Strategy Engagements

### Additional Assumptions — Strategy
- Client leadership is aligned on the need for strategic planning
- Existing business data (financials, metrics, KPIs) is available for analysis
- Key stakeholders participate in discovery workshops
- Competitive and market data is sourced from publicly available information

### Additional Exclusions — Strategy
- Market research requiring proprietary databases or paid surveys
- Financial modeling beyond high-level projections
- Board-level presentations (unless specified)
- Ongoing strategic advisory after deliverable handoff

### Common Terms — Strategy
- Strategy deliverables are recommendations, not guarantees of outcomes
- Implementation roadmap provided as guidance; actual execution may vary
- Findings are confidential and not shared with third parties

---

## Automation & Integration Engagements

### Additional Assumptions — Automation
- Current manual processes are documented or can be observed
- Process owners are available to validate automated workflows
- Test environments available for integration testing
- API rate limits and quotas are sufficient for intended use
- Existing data is clean and consistently formatted (or data cleanup is in scope)

### Additional Exclusions — Automation
- Ongoing monitoring and alerting for automated workflows
- Error handling beyond standard retry and notification patterns
- Custom connector development for systems without APIs
- Data cleanup or normalization of historical records (unless specified)
- Workflow modifications after acceptance sign-off

### Common Terms — Automation
- Automated workflows tested in staging before production deployment
- Rollback plan documented for each automation
- Client trained on monitoring and basic troubleshooting of automated workflows
- 14-day hypercare period after go-live for issue resolution

---

## How to Use This Library

1. **Start with Universal** — always include universal assumptions and exclusions
2. **Add project-type sections** — pick the type that matches your engagement
3. **Customize** — modify language to fit the specific client and scope
4. **Remove irrelevant items** — don't include clauses that don't apply
5. **Add new clauses** — when you discover a new assumption or exclusion during an engagement, add it here for future use

### Adding Custom Clauses

Add your own clauses to any section. Format:

```markdown
### Additional Assumptions — {Your Category}
- {Your assumption}
- {Your assumption}
```

Or create entirely new sections:

```markdown
## {New Project Type} Engagements

### Additional Assumptions — {Type}
- ...

### Additional Exclusions — {Type}
- ...
```
