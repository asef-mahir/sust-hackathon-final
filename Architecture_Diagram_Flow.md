## Architecture Diagram & Flow

```text
+-------------------------------------------------------------------------+
|                        USER INTERFACES (Frontend)                       |
|  +-----------------------+                   +-----------------------+  |
|  |   Agent Client View   |                   |  Ops/Risk Dashboard   |  |
|  | (Read-Only Advisories)|                   | (Alert Coordination)  |  |
|  +-----------+-----------+                   +-----------+-----------+  |
+--------------|-------------------------------------------|--------------+
               | (Real-time Sync via Supabase WebSockets)  |
+--------------v-------------------------------------------v--------------+
|                   BACKEND & API LAYER (Next.js)                         |
|  +-----------------------+                   +-----------------------+  |
|  |  Data Aggregation     |                   |  Simulation Engine    |  |
|  |  (Agent & Provider)   |                   |  (Anomaly Injection)  |  |
|  +-----------+-----------+                   +-----------+-----------+  |
+--------------|-------------------------------------------|--------------+
               |                                           |
+--------------v-------------------------------------------v--------------+
|             ANALYTICS, AI SERVICES & MONITORING                         |
|  +-----------------------+                   +-----------------------+  |
|  | Deterministic Rules   |                   |  AI Advisory Service  |  |
|  | (Velocity, Shortage,  |<----------------->| (OpenAI + Fallback)   |  |
|  |  Area Profile Math)   |                   | (Localized Context)   |  |
|  +-----------+-----------+                   +-----------+-----------+  |
|              |                                           |              |
|              +-------> Alert Coordination Flow <---------+              |
|                 (Pending -> Acknowledged -> Resolved)                   |
+--------------|----------------------------------------------------------+
               | (Prisma ORM / Database Transactions)
+--------------v----------------------------------------------------------+
|             DATA LAYER & STRICT PROVIDER BOUNDARIES                     |
|  +--------------------+  +-------------------+  +--------------------+  |
|  |  SHARED RESOURCE   |  | PROVIDER BOUNDARY |  | PROVIDER BOUNDARY  |  |
|  | +----------------+ |  | +---------------+ |  | +----------------+ |  |
|  | | Physical Cash  | |  | | bKash E-Money | |  | | Nagad E-Money  | |  |
|  | | (Drawer Pool)  | |  | | (Isolated)    | |  | | (Isolated)     | |  |
|  | +----------------+ |  | +---------------+ |  | +----------------+ |  |
|  +--------------------+  +-------------------+  +--------------------+  |
+-------------------------------------------------------------------------+

```

### Component Breakdown

* **Main Interfaces:**
* **Agent Client View:** A localized dashboard where the agent can view their shared physical cash, isolated provider balances, transaction trends, and read-only AI advisories regarding projected shortages.
* **Ops/Risk Dashboard:** The command center for Operations and Risk teams to inject simulations, monitor network-wide liquidity, and manage the lifecycle of flagged alerts.


* **Backend & Data Flow:**
* Built on the Next.js App Router, the backend orchestrates data flow. The `Simulation Engine` injects synthetic transaction data into the database. This state change immediately triggers the analytics pipeline, pushing the results to the frontend in real-time via Supabase WebSockets.


* **Analytics & AI Services (Hybrid Model):**
* **Deterministic Rule Engine (Math):** Handles all risk calculations (e.g., burn rates, 15-minute velocity clustering, Area Profile threshold checks). It is strictly mathematical to ensure auditability and zero false positives stemming from AI hallucinations.
* **AI Advisory Service (LLM):** Accepts the mathematical findings and generates localized (Bengali, Banglish, English), empathetic, and non-accusatory advice for the agent. It operates strictly as a translation and context layer.


* **Monitoring & Alert Coordination Flow:**
* Alerts are managed through a strict state machine (`PENDING` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`). Operations users must explicitly claim and resolve alerts, creating a fully auditable paper trail of human-in-the-loop decision-making.


* **Strict Provider Boundaries:**
* The database schema (via Prisma ORM) ensures absolute isolation. While the `Agent` table holds a single `physicalCash` value, the `ProviderBalance` and `Transaction` tables mandate a `providerId` foreign key. The backend logic enforces that one provider's data can never mutate or evaluate another's, honoring real-world API boundaries.