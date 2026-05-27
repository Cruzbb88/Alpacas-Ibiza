# Generator Patterns Reference

Common generator patterns organized by type, with JavaScript/TypeScript and Python variants.

Use this reference during L1 pattern recognition to match user requests against known replicable patterns.

---

## Pattern Catalog

### 1. CRUD Endpoint Generator

**What it generates:** REST API endpoints with full create, read, update, delete operations.

**Replication potential:** High — most APIs have multiple entities that all need CRUD.

**Config shape:**
```yaml
entity_name: "Product"          # PascalCase
table_name: "products"          # snake_case, plural
fields:
  - name: "title"
    type: "string"
    required: true
    max_length: 255
  - name: "price"
    type: "decimal"
    required: true
    min: 0
  - name: "category_id"
    type: "foreign_key"
    references: "categories"
relationships:
  - type: "belongsTo"
    entity: "Category"
  - type: "hasMany"
    entity: "Review"
auth: "required"                # public | required | admin
pagination: true
soft_delete: true
```

**Typical output files:**

| Language | Files Generated |
|----------|----------------|
| **TypeScript (Express/Fastify)** | `src/routes/{entity}.routes.ts`, `src/controllers/{entity}.controller.ts`, `src/models/{entity}.model.ts`, `src/validators/{entity}.validator.ts`, `src/tests/{entity}.test.ts` |
| **Python (FastAPI/Flask)** | `app/routes/{entity}.py`, `app/models/{entity}.py`, `app/schemas/{entity}.py`, `app/tests/test_{entity}.py` |

**JS/TS Example (config in, files out):**

Config: `{ entity_name: "Product", fields: [{ name: "title", type: "string", required: true }], auth: "required" }`

Generated `src/routes/product.routes.ts`:
```typescript
import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { productSchema } from '../validators/product.validator';

const router = Router();
const controller = new ProductController();

router.get('/', authMiddleware, controller.list);
router.get('/:id', authMiddleware, controller.getById);
router.post('/', authMiddleware, validate(productSchema.create), controller.create);
router.put('/:id', authMiddleware, validate(productSchema.update), controller.update);
router.delete('/:id', authMiddleware, controller.delete);

export default router;
```

**Python Example:**

Config: `{ entity_name: "product", fields: [{ name: "title", type: "str", required: True }], auth: "required" }`

Generated `app/routes/product.py`:
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.deps import get_db, get_current_user

router = APIRouter(prefix="/products", tags=["products"])

@router.get("/", response_model=list[ProductResponse])
def list_products(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Product).all()

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/", response_model=ProductResponse, status_code=201)
def create_product(data: ProductCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product
```

---

### 2. Component Factory

**What it generates:** UI components with consistent structure, props, styling, and tests.

**Replication potential:** High — design systems require dozens of components with the same structure.

**Config shape:**
```yaml
component_name: "Button"          # PascalCase
props:
  - name: "variant"
    type: "enum"
    values: ["primary", "secondary", "danger"]
    default: "primary"
  - name: "size"
    type: "enum"
    values: ["sm", "md", "lg"]
    default: "md"
  - name: "disabled"
    type: "boolean"
    default: false
  - name: "onClick"
    type: "function"
    required: true
slots:
  - name: "children"
    required: true
  - name: "icon"
    required: false
styling: "css-modules"            # css-modules | tailwind | styled-components
has_stories: true
has_tests: true
```

**Typical output files:**

| Language | Files Generated |
|----------|----------------|
| **TypeScript (React)** | `src/components/{Name}/{Name}.tsx`, `src/components/{Name}/{Name}.module.css`, `src/components/{Name}/{Name}.stories.tsx`, `src/components/{Name}/{Name}.test.tsx`, `src/components/{Name}/index.ts` |
| **Python (Jinja/Django)** | `templates/components/{name}.html`, `static/components/{name}.css`, `tests/test_{name}_template.py` |

**React/TS Example:**

Generated `src/components/Button/Button.tsx`:
```tsx
import styles from './Button.module.css';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  icon,
  children,
}: ButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
      disabled={disabled}
      onClick={onClick}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  );
}
```

---

### 3. Service Scaffolder

**What it generates:** Backend services with dependency injection, interface contracts, and tests.

**Replication potential:** High — microservice architectures need many services with the same structure.

**Config shape:**
```yaml
service_name: "NotificationService"
interface_methods:
  - name: "send"
    params:
      - name: "recipient"
        type: "string"
      - name: "message"
        type: "NotificationPayload"
    return_type: "Promise<SendResult>"
  - name: "getStatus"
    params:
      - name: "notificationId"
        type: "string"
    return_type: "Promise<NotificationStatus>"
dependencies:
  - name: "emailProvider"
    type: "EmailProvider"
  - name: "logger"
    type: "Logger"
error_strategy: "result-type"      # throw | result-type | either
has_retry: true
has_circuit_breaker: false
```

**Typical output files:**

| Language | Files Generated |
|----------|----------------|
| **TypeScript** | `src/services/{name}.interface.ts`, `src/services/{name}.service.ts`, `src/services/{name}.test.ts`, `src/services/{name}.types.ts` |
| **Python** | `app/services/{name}_interface.py`, `app/services/{name}_service.py`, `app/services/{name}_types.py`, `tests/test_{name}_service.py` |

**TS Example:**

Generated `src/services/notification.interface.ts`:
```typescript
import { NotificationPayload, SendResult, NotificationStatus } from './notification.types';

export interface INotificationService {
  send(recipient: string, message: NotificationPayload): Promise<SendResult>;
  getStatus(notificationId: string): Promise<NotificationStatus>;
}
```

**Python Example:**

Generated `app/services/notification_interface.py`:
```python
from abc import ABC, abstractmethod
from app.services.notification_types import NotificationPayload, SendResult, NotificationStatus

class NotificationServiceInterface(ABC):
    @abstractmethod
    async def send(self, recipient: str, message: NotificationPayload) -> SendResult:
        ...

    @abstractmethod
    async def get_status(self, notification_id: str) -> NotificationStatus:
        ...
```

---

### 4. Migration Generator

**What it generates:** Database migration files (up + down) for schema changes.

**Replication potential:** High — every new table or schema change needs a migration pair.

**Config shape:**
```yaml
migration_name: "create_products"
action: "create_table"             # create_table | add_columns | modify_column | create_index
table_name: "products"
columns:
  - name: "id"
    type: "serial"
    primary_key: true
  - name: "title"
    type: "varchar(255)"
    nullable: false
  - name: "price"
    type: "decimal(10,2)"
    nullable: false
    default: "0.00"
  - name: "category_id"
    type: "integer"
    foreign_key: "categories.id"
    on_delete: "CASCADE"
indices:
  - columns: ["category_id"]
  - columns: ["title"]
    unique: true
timestamps: true                   # adds created_at, updated_at
```

**Typical output files:**

| Language | Files Generated |
|----------|----------------|
| **TypeScript (Knex/TypeORM)** | `migrations/{timestamp}_{name}.ts` (single file with up/down) |
| **Python (Alembic)** | `alembic/versions/{rev}_{name}.py` |

**Knex Example:**

Generated `migrations/20240115120000_create_products.ts`:
```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('products', (table) => {
    table.increments('id').primary();
    table.string('title', 255).notNullable();
    table.decimal('price', 10, 2).notNullable().defaultTo('0.00');
    table.integer('category_id').unsigned()
      .references('id').inTable('categories')
      .onDelete('CASCADE');
    table.timestamps(true, true);

    table.index(['category_id']);
    table.unique(['title']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('products');
}
```

**Alembic Example:**

Generated `alembic/versions/abc123_create_products.py`:
```python
"""create products table"""
from alembic import op
import sqlalchemy as sa

revision = 'abc123'
down_revision = None

def upgrade():
    op.create_table(
        'products',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('price', sa.Numeric(10, 2), nullable=False, server_default='0.00'),
        sa.Column('category_id', sa.Integer, sa.ForeignKey('categories.id', ondelete='CASCADE')),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_products_category_id', 'products', ['category_id'])
    op.create_unique_constraint('uq_products_title', 'products', ['title'])

def downgrade():
    op.drop_table('products')
```

---

### 5. CLI Command Generator

**What it generates:** CLI subcommands with argument parsing, help text, and tests.

**Replication potential:** Medium — CLI tools accumulate commands over time.

**Config shape:**
```yaml
command_name: "deploy"
description: "Deploy the application to a target environment"
arguments:
  - name: "environment"
    type: "string"
    required: true
    choices: ["staging", "production"]
    help: "Target deployment environment"
flags:
  - name: "dry-run"
    short: "d"
    type: "boolean"
    default: false
    help: "Show what would be deployed without deploying"
  - name: "tag"
    short: "t"
    type: "string"
    required: false
    help: "Specific version tag to deploy"
subcommands: []
```

**Typical output files:**

| Language | Files Generated |
|----------|----------------|
| **TypeScript (Commander/Yargs)** | `src/commands/{name}.ts`, `src/commands/{name}.test.ts` |
| **Python (Click/Typer)** | `cli/commands/{name}.py`, `tests/test_cmd_{name}.py` |

**Commander Example:**

Generated `src/commands/deploy.ts`:
```typescript
import { Command } from 'commander';

export const deployCommand = new Command('deploy')
  .description('Deploy the application to a target environment')
  .argument('<environment>', 'Target deployment environment')
  .option('-d, --dry-run', 'Show what would be deployed without deploying', false)
  .option('-t, --tag <tag>', 'Specific version tag to deploy')
  .action(async (environment: string, options) => {
    if (!['staging', 'production'].includes(environment)) {
      console.error(`Invalid environment: ${environment}. Must be staging or production.`);
      process.exit(1);
    }
    // Implementation here
  });
```

**Click Example:**

Generated `cli/commands/deploy.py`:
```python
import click

@click.command()
@click.argument('environment', type=click.Choice(['staging', 'production']))
@click.option('--dry-run', '-d', is_flag=True, default=False, help='Show what would be deployed without deploying')
@click.option('--tag', '-t', type=str, default=None, help='Specific version tag to deploy')
def deploy(environment: str, dry_run: bool, tag: str | None):
    """Deploy the application to a target environment."""
    # Implementation here
    pass
```

---

## Quick Reference Table

| Pattern | Replication | Key Signal | Dimensions to Extract |
|---------|------------|------------|----------------------|
| CRUD Endpoint | High | "endpoint", "API", "route" | Entity, fields, relationships, auth, pagination |
| Component Factory | High | "component", "widget", "page" | Name, props, variants, slots, styling approach |
| Service Scaffolder | High | "service", "worker", "handler" | Name, methods, dependencies, error strategy |
| Migration Generator | High | "migration", "table", "schema" | Table, columns, indices, foreign keys |
| CLI Command | Medium | "command", "CLI", "subcommand" | Name, args, flags, subcommands |
| Config File | Medium | "config", "env", "settings" | Keys, types, defaults, environment overrides |
| Infrastructure | Medium | "terraform", "docker", "deploy" | Resource name, provider, region, scaling |
| Utility/Helper | Medium | "util", "helper", "wrapper" | Function name, input/output types, error handling |
| One-off Script | Low | "one-time", "seed", "fix" | Few — usually not worth a generator |

---

## When NOT to Generate

Not everything benefits from a generator. Skip Gigafactory when:

- The pattern will only be used 1-2 times total
- The variations between instances are so large that the config would be as complex as the code
- The codebase already has an adequate generator/scaffolder for this pattern
- The request is for unique business logic with no structural pattern
