# @avenire/database - Data Persistence Layer

## Overview

The `@avenire/database` package was designed as the central data persistence layer for the Avenire monorepo. This README details its architecture, showcasing how it utilized the Drizzle ORM to interact with a PostgreSQL database, aiming for a type-safe and efficient way to manage application data. It demonstrates how database schemas were defined, how migrations were managed, and how clients and query functions were structured for use by other services. This package serves as a case study in designing a modular database layer.

## Core Technologies Showcased

The choice of technologies for this package illustrates a modern approach to data management:

-   **Drizzle ORM:** Selected for its TypeScript-first approach, SQL-like query builder, strong type safety, and performance characteristics. It demonstrates how developers can write database queries using familiar JavaScript/TypeScript syntax while maintaining type integrity.
-   **PostgreSQL:** Chosen as the underlying relational database due to its robustness, feature set, and open-source nature. The package's design would rely on a library like `node-postgres` for establishing a connection to a PostgreSQL server instance. For this package to function in a live environment, connection details (like a database URL) would need to be configured.
-   **Drizzle Kit:** This companion CLI tool for Drizzle ORM was integral to the development workflow. It was used for generating and managing database migrations, introspecting database schemas, and providing a GUI for database management (Drizzle Studio), showcasing a comprehensive toolkit for schema evolution.

## Data Modeling Examples: Schema Overview

All database table schemas are defined within the `packages/database/schema/` directory, with each file typically representing a distinct domain. This structure provides examples of data modeling for key application features:

-   **`auth-schema.ts`**: Illustrates tables essential for user authentication and account management, designed to support the `@avenire/auth` package. This includes schemas for `users`, `accounts` (for different authentication methods), `email_verifications`, and `passkeys`.

-   **`chat-schema.ts`**: Contains table designs to support chat functionalities, primarily for use by `apps/web`. This includes `chat` (for individual conversations) and `message` (for individual messages).

-   **`user-settings.ts`**: Defines a table structure for storing user-specific preferences and settings.

## Architectural Insights via Key Files & Exports

Understanding the structure of this package provides insight into its design:

-   **`index.ts`**: Serves as the main entry point. It demonstrates how a Drizzle client instance could be initialized (conceptually using a connection string from environment variables) and exported as a `database` object. It also re-exports the aggregated schemas, showing a pattern for making database clients and schemas available to other packages.

-   **`drizzle.config.ts`**: This configuration file for Drizzle Kit specifies the schema location, output directory for migrations, database driver, and connection details (which would typically reference a `DB_URL`). It's crucial for understanding how Drizzle Kit was integrated into the development workflow.

-   **`schema/`**: This directory houses all Drizzle schema definitions, showcasing a modular approach to defining database tables.
    -   `schema/index.ts`: Aggregates all individual schema files and exports them as a single, consolidated schema object. This illustrates a method for organizing and consuming multiple schema parts.

-   **`queries/`**: This directory demonstrates a pattern for creating pre-defined, reusable query functions that encapsulate common database operations.
    -   `queries/index.ts`: Exports specific query functions, particularly for chat-related operations (e.g., `saveChat`, `getMessagesByChatId`). These functions illustrate how an abstracted data access layer can be provided for specific tasks, accessible via an export path like `@avenire/database/queries`.

## Schema Management and Migration Strategy with Drizzle Kit

Drizzle Kit was the chosen tool for managing database schema changes and keeping the database synchronized with the schema definitions in code. The typical workflow involved using Drizzle Kit commands for various purposes:

-   **Generating Migrations (e.g., `drizzle-kit generate`):**
    -   This command was used to compare the current schema definitions in `schema/` with the last applied migration or the database state.
    -   It would then generate new SQL migration files containing the necessary commands to update the database schema. This demonstrates a code-first approach to schema evolution.

-   **Applying Migrations (e.g., `drizzle-kit migrate`):**
    -   This command was responsible for applying any pending migration files to the target database, thereby updating the actual database structure to match the defined schemas.

-   **Introspecting Existing Databases (e.g., `drizzle-kit pull`):**
    -   This capability allowed for introspection of an existing database schema to generate corresponding Drizzle schema definitions, useful for integrating Drizzle with pre-existing databases.

-   **Database GUI (e.g., `drizzle-kit studio`):**
    -   Drizzle Studio provided a web-based GUI for browsing, querying, and managing database tables and data, aiding in development and debugging.

This approach to schema management highlights a robust strategy for evolving database structures in a controlled and versioned manner.

## Architectural Patterns for Data Interaction

The design of `@avenire/database` illustrates two primary patterns for interacting with the database:

1.  **Direct Drizzle Operations:**
    The architecture allowed for the `database` instance (the Drizzle client) and schema definitions to be imported directly from `@avenire/database`. This pattern enables direct use of Drizzle ORM's query builder for flexible and complex database queries.
    ```typescript
    // Conceptual example of direct Drizzle operation
    // import { database, usersTable } from '@avenire/database';
    // const allUsers = await database.select().from(usersTable);
    ```

2.  **Pre-defined Query Functions:**
    For common operations, particularly those related to specific features like chat, the package demonstrates the use of query functions exported from `queries/index.ts` (via the `@avenire/database/queries` path). This pattern offers a more abstracted and reusable way to interact with the database for specific tasks.
    ```typescript
    // Conceptual example of using pre-defined query functions
    // import { getMessagesByChatId } from '@avenire/database/queries';
    // const messages = await getMessagesByChatId('some-chat-id');
    ```

**Note:** This package was designed for server-side use. In a real application, database credentials and direct database access would not be exposed to client-side applications.

This README provides an overview of the `@avenire/database` package's design, illustrating its data modeling, ORM implementation, migration strategy, and data access patterns for educational and demonstrative purposes.
