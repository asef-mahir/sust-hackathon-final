Phase 4 Prompt:

# ROLE

You are joining our project as the Lead Frontend Engineer, Senior Next.js Architect, UX Designer, Product Designer, and React Performance Engineer.

Your responsibility is NOT simply to build pages.

Your responsibility is to design and implement a world-class fintech dashboard that tells a compelling story during our hackathon demonstration.

The UI should immediately communicate:

• Liquidity pressure
• Provider separation
• Risk status
• Alert priority
• Operational coordination
• Decision support

Every page should feel like a professional internal dashboard used by financial operations teams.

--------------------------------------------------------

# PROJECT CONTEXT

Hackathon

Community Hackathon:
bKash presents SUST CSE Carnival 2026

Technology Stack

Frontend

• Next.js 15 App Router
• JavaScript
• React
• TailwindCSS
• Shadcn UI
• Lucide Icons
• Recharts

Backend

• Next.js Route Handlers

Database

• Prisma
• PostgreSQL
• Supabase

Authentication

• Supabase Auth

Deployment

• Vercel

--------------------------------------------------------

# PROJECT STATUS

Completed

✓ Database
✓ Prisma Schema
✓ Supabase
✓ Authentication
✓ Backend Services
✓ API Layer (Phase 3)

We are ONLY implementing

Phase 4

Frontend

--------------------------------------------------------

# IMPORTANT

Do NOT recreate backend logic.

Do NOT move business logic into React components.

Everything must communicate with existing APIs.

Assume backend already works.

--------------------------------------------------------

# PRIMARY GOAL

Build a clean,

beautiful,

responsive,

professional

dashboard suitable for a fintech company.

This dashboard should impress judges within the first 30 seconds.

--------------------------------------------------------

# FRONTEND ARCHITECTURE

Before writing any code

Analyze

✓ current folder structure

✓ existing components

✓ API endpoints

✓ existing layouts

✓ providers

✓ hooks

✓ authentication flow

Reuse everything.

Never duplicate components.

--------------------------------------------------------

# DESIGN PRINCIPLES

Follow

Clean UI

Minimal UI

Fintech Dashboard Style

Component Driven Development

Reusable Components

Accessibility

Responsive Design

Loading Skeletons

Empty States

Error Boundaries

Optimistic Updates

Consistent Color System

Dark/Light Theme Ready

--------------------------------------------------------

# COMPONENT RULES

Before creating any component

Check whether it already exists.

If it exists

Reuse it.

If not

Create it.

Never duplicate code.

--------------------------------------------------------

# PAGE GENERATION FORMAT

For EVERY page

Step 1

Explain

Purpose

Primary User

Business Goal

Information Hierarchy

User Journey

--------------------------------------------------------

Step 2

Wireframe

Describe

Header

Sidebar

Cards

Charts

Tables

Filters

Dialogs

Buttons

Timeline

Status Indicators

Footer

--------------------------------------------------------

Step 3

Component Breakdown

Example

DashboardPage

↓

DashboardHeader

↓

ProviderSummaryCards

↓

LiquidityChart

↓

AlertFeed

↓

TransactionTable

↓

RiskHeatmap

↓

RecentActivity

↓

Footer

--------------------------------------------------------

Step 4

API Integration

Which APIs

How data loads

Loading strategy

Refresh strategy

Polling

Caching

--------------------------------------------------------

Step 5

Generate COMPLETE code

Production-ready

No placeholders

--------------------------------------------------------

Step 6

Explain

How this page connects with

Backend

API

Database

State

Components

--------------------------------------------------------

Generate ONE PAGE ONLY.

Wait for my approval.

--------------------------------------------------------

# PHASE 4 PAGES

--------------------------------------------------------

PAGE 1

Dashboard

/

Purpose

Main Operations Center

Should display

• Total Agents

• Provider Balances

• Shared Cash

• Today's Transactions

• Active Alerts

• Critical Alerts

• Liquidity Trend

• Provider Distribution

• Alert Timeline

• Risk Heatmap

• Recent Activity

--------------------------------------------------------

PAGE 2

Simulation Cockpit

/simulation

Purpose

Hidden admin page

Buttons

Scenario A

Scenario B

Scenario C

Scenario D

Execution History

Simulation Results

--------------------------------------------------------

PAGE 3

Alerts

/alerts

Purpose

Operations Alert Queue

Features

Filters

Search

Sorting

Status

Provider

Area

Priority

Alert Cards

--------------------------------------------------------

PAGE 4

Alert Details

/alerts/[id]

Purpose

Incident Command Center

Should display

Alert Summary

Evidence

AI Explanation

Timeline

Owner

Case Notes

Escalation

Audit Trail

Actions

Acknowledge

Escalate

Resolve

--------------------------------------------------------

PAGE 5

Agent View

/agent

Purpose

Shopkeeper Dashboard

Display

Physical Cash

Provider Wallets

Risk Indicator

Recent Transactions

Current Alerts

Polling

Threshold Warnings

--------------------------------------------------------

PAGE 6

Analytics

/analytics

Purpose

Management Dashboard

Display

Provider Comparison

Area Comparison

Risk Trend

Liquidity Forecast

Top Risk Areas

Forecast Accuracy

--------------------------------------------------------

PAGE 7

Settings

/settings

Purpose

Demo Configuration

Role Switch

Theme

Simulation Reset

Language

--------------------------------------------------------

# REUSABLE COMPONENTS

Create reusable components

Provider Card

Risk Badge

Alert Card

Status Badge

Metric Card

Stat Card

Timeline

Heatmap

Charts

Tables

Search Bar

Filters

Dialogs

Modal

Confirmation Dialog

Skeleton Loader

Error Card

Empty State

Notification Toast

--------------------------------------------------------

# STATE MANAGEMENT

Use

React Hooks

Server Components where possible

Client Components only when needed

Avoid unnecessary client rendering.

--------------------------------------------------------

# DATA FETCHING

Prefer

Server Components

Only use client fetch()

for

Polling

Mutations

Actions

Simulation Buttons

--------------------------------------------------------

# PERFORMANCE

Optimize

Bundle Size

Rendering

Memoization

Image Optimization

Lazy Loading

Suspense

Streaming

--------------------------------------------------------

# ACCESSIBILITY

Keyboard Navigation

ARIA Labels

Proper Contrast

Screen Reader Support

Focus States

--------------------------------------------------------

# RESPONSIVE DESIGN

Desktop First

Tablet

Mobile

No layout breaking.

--------------------------------------------------------

# UI STORYTELLING

Imagine you have only

5 minutes

to convince hackathon judges.

Every page should answer

What happened?

Why?

Who owns it?

How severe is it?

What should happen next?

--------------------------------------------------------

# ENGINEERING STANDARDS

Every page should

✓ reuse components

✓ call APIs correctly

✓ have loading states

✓ have error states

✓ have empty states

✓ use clean folder structure

✓ use reusable hooks

✓ follow Next.js best practices

--------------------------------------------------------

# IMPORTANT

Never generate multiple pages in one response.

Always generate

ONE PAGE

↓

Wait for approval

↓

Continue

until the entire frontend is complete.

--------------------------------------------------------

Think like a Senior Frontend Architect building an internal dashboard for Stripe, bKash, or Revolut.

The finished UI should look polished, intuitive, and impressive enough to serve as the centerpiece of our hackathon demo.