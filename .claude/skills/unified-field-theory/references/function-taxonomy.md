# Abstract Function Taxonomy

Standard categories for describing what code does in abstract terms, independent of implementation language or framework. Used by L2 (Abstract Function Mapping) to create a consistent vocabulary for cross-system comparison.

This taxonomy is a **starting vocabulary, not a closed set**. During L2 analysis, add project-specific categories when code does not fit these 14 standard categories.

## Standard Categories

### 1. Input Validation

Verifying data correctness before processing.

**Code signals:** `validate`, `check`, `assert`, `schema`, `zod`, `joi`, `yup`, `ajv`, `validator`, `sanitize`, `is_valid`, `parse_input`

**Examples:** Form validation, API request validation, schema enforcement, type checking at boundaries.

### 2. Authentication

Verifying identity -- confirming WHO a user or system is.

**Code signals:** `auth`, `login`, `logout`, `token`, `jwt`, `session`, `passport`, `oauth`, `credential`, `sign_in`, `verify_token`

**Examples:** Login flows, token generation/verification, session management, SSO integration.

### 3. Authorization

Verifying permissions -- confirming what an authenticated entity is ALLOWED to do.

**Code signals:** `permission`, `role`, `acl`, `can`, `allow`, `guard`, `policy`, `rbac`, `scope`, `capability`, `authorize`

**Examples:** Role-based access control, permission checks, route guards, resource-level authorization.

### 4. State Management

Maintaining and mutating application state.

**Code signals:** `store`, `reducer`, `state`, `context`, `atom`, `signal`, `dispatch`, `subscribe`, `useState`, `setState`, `reactive`

**Examples:** Redux/Zustand stores, React context providers, database-backed state, in-memory caches of mutable state.

### 5. Error Handling

Catching, transforming, and reporting errors.

**Code signals:** `catch`, `error`, `exception`, `fallback`, `retry`, `boundary`, `throw`, `Error`, `handle_error`, `on_error`, `error_handler`

**Examples:** Error boundaries, try/catch wrappers, retry logic, error transformation layers, global error handlers.

### 6. Logging

Recording events for observability and debugging.

**Code signals:** `log`, `logger`, `winston`, `pino`, `console`, `trace`, `debug`, `info`, `warn`, `bunyan`, `log4j`, `slog`

**Examples:** Structured logging, audit trails, debug output, performance logging, request logging middleware.

### 7. Data Access

Reading and writing persistent data (databases, files, external storage).

**Code signals:** `query`, `repository`, `dao`, `model`, `prisma`, `typeorm`, `sequelize`, `mongoose`, `knex`, `sql`, `SELECT`, `INSERT`, `find`, `save`, `delete`

**Examples:** ORM models, repository patterns, raw SQL queries, file I/O for persistence, API clients for data services.

### 8. Data Transform

Converting data between formats or shapes.

**Code signals:** `map`, `transform`, `serialize`, `deserialize`, `parse`, `convert`, `format`, `encode`, `decode`, `marshal`, `unmarshal`, `to_json`, `from_json`

**Examples:** JSON/XML parsing, DTO mapping, data normalization, format converters, ETL pipelines.

### 9. HTTP/API

Handling network requests and responses.

**Code signals:** `route`, `endpoint`, `controller`, `handler`, `middleware`, `express`, `fastify`, `flask`, `router`, `request`, `response`, `REST`, `graphql`

**Examples:** Route definitions, request handlers, middleware chains, API controllers, GraphQL resolvers.

### 10. Caching

Storing computed results for reuse to avoid redundant computation or I/O.

**Code signals:** `cache`, `memo`, `memoize`, `ttl`, `redis`, `lru`, `invalidate`, `cache_key`, `cached`, `stale`

**Examples:** In-memory caches, Redis integration, memoized functions, HTTP cache headers, query result caching.

### 11. Configuration

Managing application settings and environment variables.

**Code signals:** `config`, `env`, `settings`, `options`, `defaults`, `dotenv`, `process.env`, `os.environ`, `yaml`, `toml`, `ini`

**Examples:** Environment variable loading, config file parsing, feature flags, default value management.

### 12. Scheduling

Managing timed or recurring operations.

**Code signals:** `cron`, `schedule`, `interval`, `queue`, `worker`, `job`, `task`, `setTimeout`, `setInterval`, `celery`, `bull`, `agenda`

**Examples:** Cron jobs, background workers, task queues, delayed execution, periodic health checks.

### 13. Notification

Sending alerts or messages to users or external systems.

**Code signals:** `notify`, `email`, `sms`, `webhook`, `push`, `alert`, `sendgrid`, `twilio`, `slack`, `notification`, `mailer`

**Examples:** Email sending, push notifications, webhook dispatch, SMS alerts, in-app notifications.

### 14. Rendering

Producing visual or document output.

**Code signals:** `render`, `template`, `view`, `component`, `layout`, `jsx`, `html`, `pdf`, `svg`, `paint`, `draw`

**Examples:** Server-side rendering, template engines, React components, PDF generation, report formatting.

---

## Adding Project-Specific Categories

When L2 analysis encounters code that does not fit the 14 standard categories, create a custom category following this template:

```markdown
### N+1. {Category Name}

{One-line description of the abstract function.}

**Code signals:** `signal1`, `signal2`, `signal3`, ...

**Examples:** {2-3 concrete examples of this function in practice.}
```

Common project-specific categories that may emerge:
- **Feature Flags**: Managing runtime feature toggles
- **Internationalization**: Translating and localizing content
- **File Upload/Storage**: Managing binary asset lifecycle
- **Rate Limiting**: Throttling request throughput
- **Search/Indexing**: Full-text search and index management
- **Metrics/Telemetry**: Collecting performance and usage data
- **Migration**: Database or data schema evolution

---

## Using the Taxonomy in L2

For each system discovered in L1:

1. Grep the module for code signals from each category
2. Read entry points and key files to confirm functional intent
3. Assign one or more categories to the system
4. If a system matches 3+ categories, flag it as **overloaded**
5. If a category matches 2+ systems, flag it as a **potential overlap**
6. If no standard category fits, define a project-specific category

The function map matrix uses these categories as column headers, with systems as rows. Marks in the matrix indicate which systems perform which abstract functions.
