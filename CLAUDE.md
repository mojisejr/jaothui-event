## Project Overview

**Project Name**: Jaothui Event Management System

**Repository**: https://github.com/mojisejr/jaothui-event 

**Description**: แพลตฟอร์มจัดการงานสำหรับสัตว์เลี้ยง ให้บริการการลงทะเบียนเข้าร่วมงาน ระบบโหวตประกวด และการจัดการข้อมูลสัตว์เลี้ยงครบครัน รองรับการจัดงานประเภทต่างๆ พร้อมระบบลงทะเบียนขั้นสูงและการจัดการเมตาดาต้า

**Project Goals**:

- สร้างแพลตฟอร์มจัดการงานสัตว์เลี้ยงที่ครบครันและใช้งานง่าย
- รองรับการลงทะเบียนเข้าร่วมงานพร้อมข้อมูลสัตว์เลี้ยงแบบละเอียด
- จัดเตรียมระบบโหวตประกวดสำหรับการแข่งขัน
- จัดการข้อมูลผู้ใช้และสัตว์เลี้ยงอย่างมีประสิทธิภาพ

---

### Development Guidelines

**⚠️ CRITICAL: Synchronize Time Before Any File Operations**

Before creating a new file or saving any timestamps, you **MUST** use the following command to retrieve the current date and time from the system:

```bash
date +"%Y-%m-%d %H:%M:%S"
```

#### File Naming Conventions

- **Log Files**: `YYYY-MM-DD-[type].log`
- **Backup Files**: `backup-YYYY-MM-DD-HHMM.sql`
- **Migration Files**: Follow Prisma naming conventions

#### Important Notes

- **ALL timestamps** in documentation, logs, and file names must use your local timezone
- **Year format** must be consistent
- **Development sessions** should reference local time

---

## Architecture Overview

### Core Structure

- **Framework**: Next.js 14 (App Router)
- **Frontend/Framework**: React 18 with TypeScript
- **API Layer**: Next.js API Routes with tRPC
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: AWS S3
- **Styling**: Tailwind CSS with DaisyUI
- **Content Management**: Sanity CMS

### Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, DaisyUI, Framer Motion
- **Backend**: Node.js (Next.js Serverless), Prisma ORM, PostgreSQL
- **API**: tRPC for type-safe API calls
- **File Storage**: AWS S3 for image uploads
- **Content**: Sanity CMS for content management
- **Authentication**: Custom user management
- **Real-time**: React Query for data fetching

### Database Schema

#### Core Models

- **User**: ผู้ใช้งานระบบ (userId, name, email, tel, role)
- **Event**: งานต่างๆ (name, description, startAt, endAt, eventAt, location)
- **EventRegister**: การลงทะเบียนเข้าร่วมงาน (eventId, userId, pet details)
- **VoteEvent**: งานโหวตประกวด (id, name)
- **Votes**: รายการสัตว์เลี้ยงที่เข้าร่วมโหวต (name, microchip, imageUrl, eventId)
- **Voters**: ผู้โหวต (userId, voteFor)

### Frontend User Journeys

- **Event Registration Flow**: Browse Events → Event Details → Pet Registration → Confirmation
- **Voting Flow**: View Voting Events → Select Pet → Cast Vote → View Results
- **Event Management Flow**: Create Event → Manage Registrations → Track Participation
- **User Profile Flow**: Login → View Registered Events → Manage Pet Information

---

## 🗄️ Database Architecture

### PostgreSQL with Prisma ORM

#### Key Features

- **Type-safe Database Access**: Prisma Client with full TypeScript support
- **Database Migrations**: Automated schema migrations with version control
- **Data Validation**: Zod schemas for API input validation
- **Relationship Management**: Proper foreign key relationships between models

#### Database Models Structure

```typescript
// User Management
User -> EventRegister (One-to-Many)
User -> Voters (One-to-Many)

// Event Management  
Event -> EventRegister (One-to-Many)

// Voting System
VoteEvent -> Votes (One-to-Many)
Votes -> Voters (One-to-Many)
```

---

## 📁 File Storage System

### AWS S3 Integration

- **Image Uploads**: Pet photos, event images, vaccine documents
- **File Types**: JPEG, PNG for images; PDF for documents
- **Access Control**: Public read access with secure upload endpoints
- **URL Generation**: Presigned URLs for secure uploads

---

## 🎨 UI/UX Design System

### Tailwind CSS + DaisyUI

- **Component Library**: DaisyUI components for consistent design
- **Responsive Design**: Mobile-first approach with Tailwind utilities
- **Animation**: Framer Motion for smooth transitions
- **Typography**: Consistent font hierarchy and spacing

### Sanity CMS Integration

- **Content Management**: Dynamic content for events and pages
- **Image Management**: Integrated with Sanity image handling
- **Real-time Updates**: Live content updates without deployment

### Visual Design Validation Requirements

**CRITICAL**: Visual design quality is equally important as functional implementation, especially for customer-facing features.

#### Pre-Implementation Design Checklist

✅ Color contrast validation (WCAG 2.1 AA compliance)
✅ Accessibility standards verification
✅ Responsive design across device sizes
✅ Typography hierarchy consistency
✅ Animation performance optimization
✅ Reduced motion preference support

#### Design Quality Assurance Process

**3-Phase Approach**:

1. **Design System Integration**: Follow component patterns, centralized utilities (60% duplication reduction)
2. **Accessibility Implementation**: WCAG 2.1 AA compliance (4.5:1 contrast), keyboard navigation, screen reader support, reduced motion
3. **Performance Optimization**: 60fps animations, bundle size monitoring, critical CSS, responsive images

### Centralized Styling Architecture

- **Utility-Based System**: Centralized styling utilities for consistent design
- **TypeScript Interfaces**: Proper typing for styling configurations
- **Accessibility Integration**: Built-in WCAG compliance and reduced motion support
- **Duplication Reduction**: Proven efficiency through centralized approach

### Design Review Integration

**Visual Review Steps**: Browser preview, contrast analysis, multi-device testing, accessibility testing, motion testing

**Common Pitfalls to Avoid**: Poor color choices, inconsistent spacing, animation overuse, desktop-only thinking, accessibility afterthoughts

---

## 🛠️ Development Commands

### Core Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Database Management

```bash
# Push schema changes to database
npm run db:push

# Open Prisma Studio
npm run db:studio

# Generate Prisma client
npx prisma generate
```

### Sanity CMS

```bash
# Start Sanity development server
npm run sanity:dev

# Build Sanity studio
npm run sanity:build

# Deploy Sanity studio
npm run sanity:deploy
```

---

## 🔄 Development Workflow

### Shortcut Commands (Agent-Driven Workflow)

These commands streamline development with GitHub-based context tracking:

- **`=fcs > [topic-name]`**: Creates new GitHub issue `[XXXX] [topic-name]` for context tracking
- **`=fcs > [XXXX]`**: Updates existing context issue by number  
- **`=fcs list`**: Shows all active context issues
- **`=fcs recent`**: Shows recent context issues
- **`=plan > [question/problem]`**: Creates/Updates GitHub Task Issue with detailed action plan
- **`=impl > [message]`**: Iterative implementation workflow (creates feature branch, executes from GitHub issue)
- **`=pr > [feedback]`**: Pull request and integration workflow
- **`=stage > [message]`**: Staging deployment workflow
- **`=prod > [message]`**: Production deployment workflow
- **`=rrr > [message]`**: Creates daily retrospective file and GitHub Issue

### GitHub Context Tracking Features

- **Pure GitHub Storage**: No local context files needed
- **Issue Naming**: `[XXXX] [topic-name]` format for easy identification
- **Stateless**: Works from any machine with GitHub access
- **Collaborative**: Team members can view and contribute to context
- **Searchable**: Full GitHub search capabilities for context history

### Workflow Features

- **GitHub Context + Task Issue Pattern**: All context lives in GitHub issues
- **Automated Branch Management**: Feature branches created from staging
- **Iteration Tracking**: Progress tracking with TodoWrite integration
- **Staging-First Deployment**: All features go through staging before production

### Git Workflow

- **Main Branch**: Production-ready code
- **Staging Branch**: Pre-production validation
- **Feature Branches**: `feature/[issue-number]-[description]` for new features
- **Development**: Work on feature branches, create PRs to staging → main

### Code Quality

- **TypeScript**: Strict mode enabled for type safety
- **ESLint**: Code linting with Next.js configuration
- **Prettier**: Code formatting with consistent style
- **Prisma**: Type-safe database operations

---

## ⚠️ CRITICAL SAFETY RULES

### NEVER MERGE PRS YOURSELF

**DO NOT** use any commands to merge Pull Requests, such as `gh pr merge`. Your role is to create a well-documented PR and provide the link to the user or await user instructions.

**ONLY** provide the PR link to the user and **WAIT** for explicit user instruction to merge. The user will review and merge when ready.

### DO NOT DELETE CRITICAL FILES

You are **FORBIDDEN** from deleting or moving critical files and directories in the project. This includes, but is not limited to: `.env`, `.git/`, `node_modules/`, `package.json`, `prisma/schema.prisma`, and the main project root files.

### HANDLE SENSITIVE DATA WITH CARE

You must **NEVER** include sensitive information such as API keys, passwords, or user data in any commit messages, Pull Request descriptions, or public logs. Always use environment variables for sensitive data.

**Critical Environment Variables**:
- `DATABASE_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `NEXT_PUBLIC_SANITY_PROJECT_ID`, `SANITY_API_READ_TOKEN`
- Any other API keys and secrets

### STICK TO THE SCOPE

You are instructed to focus **ONLY** on the task described in the assigned task. Do not perform refactoring or new feature development unless explicitly part of the plan.

### BRANCH SAFETY

**MANDATORY STAGING BRANCH SYNC**: Before any implementation (`=impl`), you **MUST** ensure the local staging branch is synchronized with remote origin.

**STAGING-FIRST WORKFLOW**: All implementations work exclusively with staging branch. **NEVER** create PRs to main branch during implementation.

**FORCE PUSH RESTRICTIONS**: Only use `git push --force-with-lease` when absolutely necessary. **NEVER** use `git push --force`.

**HIGH-RISK FILE COORDINATION**: Files requiring team coordination include:
- `src/app/page.tsx`, `src/app/layout.tsx` (main app structure)
- `package.json`, `yarn.lock` (dependency management)
- `prisma/schema.prisma` (database schema)
- `.env.example`, configuration files

### AUTOMATED WORKFLOW SAFETY

**BRANCH NAMING ENFORCEMENT**: All feature branches **MUST** follow the pattern `feature/[issue-number]-[description]`.

**COMMIT MESSAGE STANDARDS**: All commits **MUST** include:
- Clear, descriptive subject line (max 50 characters)
- Reference to related issue number
- Type prefix: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`

**CRITICAL RULES**:
- **NEVER** work directly on main/staging branches
- **ALWAYS** create feature branches from staging
- **ALWAYS** deploy to staging before production

---

## 🌿 Enhanced Workflow Implementation

### Multi-Phase Implementation Strategy

**Proven 5-Phase Approach** (15-34 minute sessions):

1. **Analysis & Preparation** (5-8 min): Component analysis, dependency mapping
2. **Core Implementation** (8-15 min): Primary changes, API updates
3. **Integration & Testing** (3-8 min): Build validation, error resolution
4. **Documentation & Cleanup** (2-5 min): Commits, documentation
5. **Review & Validation** (1-2 min): Final validation

### TodoWrite Integration Patterns

**High-Impact Usage**: Complex refactoring (3+ files), multi-phase implementations, large system changes

**Workflow Pattern**:
1. Break into 5-12 manageable todos
2. Mark exactly ONE todo in_progress → completed
3. Provides real-time visibility and accountability
4. Enables accurate time estimation

**High-Impact TodoWrite Usage Patterns**:
✅ Complex multi-component refactoring (3+ files)
✅ Full-stack implementations (API + Frontend)
✅ Multi-phase system changes (Database + Application)
✅ Large refactoring with dependency management

### Branch Management Excellence

- **ALWAYS** create feature branches: `feature/[issue-number]-[description]`
- **NEVER** work directly on main branch
- **Workflow**: Analysis → Branch → Implementation → Build → Commit → PR → Updates

---

## 🔧 Key Features Implementation

### Event Registration System

- **Multi-step Registration**: User and pet information collection
- **Document Upload**: Vaccine records and pet photos via AWS S3
- **Metadata Support**: Flexible data storage for custom fields
- **Registration Status Tracking**: Active/inactive event management

### Voting Competition System

- **Event-based Voting**: Separate voting events from regular events
- **Unique Voter Identification**: Prevent duplicate voting
- **Pet Profile Management**: Microchip ID and photo management
- **Real-time Results**: Vote counting and display

### User Management

- **Role-based Access**: Different user roles (admin, participant, etc.)
- **Profile Management**: User and pet information management
- **Registration History**: Track all event participations
- **Secure Authentication**: Custom authentication system

---

## 📊 Data Models

### Event Types

- **Regular Events**: General gatherings and meetups
- **Competitions**: Structured competitions with judging
- **Voting Events**: Community voting competitions
- **Workshops**: Educational and training events

### Pet Information

- **Basic Info**: Name, gender, color, birthday
- **Identification**: Microchip number for unique identification
- **Health Records**: Vaccine documentation and certificates
- **Media**: Photos and documents stored in AWS S3

---

## 🚀 Deployment Architecture

### Next.js Deployment

- **Static Generation**: Optimized pages for better performance
- **API Routes**: Server-side API endpoints for data operations
- **Environment Variables**: Secure configuration management
- **Database**: PostgreSQL with connection pooling

### File Storage

- **AWS S3**: Scalable file storage for images and documents
- **CDN Integration**: Fast content delivery worldwide
- **Security**: Presigned URLs and access control

---

## 📈 Performance Optimization

### Frontend Optimizations

- **Code Splitting**: Automatic code splitting with Next.js
- **Image Optimization**: Next.js Image component for optimized loading
- **Caching Strategy**: React Query for intelligent data caching
- **Bundle Analysis**: Regular bundle size monitoring

### Backend Optimizations

- **Database Indexing**: Optimized queries with proper indexing
- **Connection Pooling**: Efficient database connection management
- **API Response Caching**: Cached responses for frequently accessed data
- **Prisma Optimization**: Efficient database queries with Prisma

---

## ⚡ Efficiency Patterns & Performance Optimization

### 15-Minute Implementation Strategy

**Results**: 15-minute implementations vs 34+ minute baseline

**Prerequisites**: Reference pattern, TodoWrite initialized, component structure analyzed, integration points identified

**Speed Optimization Techniques**:

1. **Pattern Recognition**: 56% faster when following proven patterns
2. **MultiEdit**: Batch multiple edits instead of sequential single edits
3. **Systematic Analysis**: 2-3 minute analysis of target areas and integration points
4. **Build Validation**: `npm run build` after major changes, `npx tsc --noEmit` for type checking

### High-Impact Optimization Areas

#### TodoWrite Integration ROI

- **Setup Time**: 2-3 minutes
- **Visibility Benefit**: Real-time progress tracking
- **Accountability**: Prevents skipping critical steps
- **Stakeholder Communication**: Clear progress indicators
- **Proven Results**: 56% faster implementations documented

#### Reference Pattern Utilization

- **Pattern Documentation**: Create detailed retrospectives for reusable approaches
- **Pattern Library**: Maintain reference files as implementation guides
- **Systematic Replication**: Follow proven approaches exactly
- **Context Adaptation**: Modify only necessary elements

#### Tool Optimization

- **Efficient Pattern**: Read (targeted) → MultiEdit (batch) → Build (validation)
- **Avoid**: Multiple single Edits → Multiple Reads → Late build testing

### Efficiency Factor Analysis

**High Efficiency Sessions** (15-20 minutes):
- ✅ TodoWrite usage for progress tracking
- ✅ Reference pattern available
- ✅ Clear component structure understanding
- ✅ Systematic 5-phase approach
- ✅ Proactive build validation

**Low Efficiency Sessions** (45+ minutes):
- ❌ No reference pattern
- ❌ Schema assumptions without verification
- ❌ Working directly on main branch
- ❌ Build testing only at end
- ❌ Complex dependency analysis needed

---

## 🛡️ Security Considerations

### Data Protection

- **Input Validation**: Zod schemas for all API inputs
- **SQL Injection Prevention**: Prisma ORM parameterized queries
- **File Upload Security**: Type validation and size limits
- **Authentication**: Secure user authentication and authorization

### Privacy & Compliance

- **Data Encryption**: Sensitive data encryption in transit
- **Access Control**: Role-based access to different features
- **Audit Logs**: Track important system activities
- **Data Retention**: Proper data lifecycle management

---

## 🛡️ Security Implementation Methodology

### Systematic Security Audit Approach

**8-Phase Security Audit Process** (31-minute comprehensive audits):

1. **Infrastructure Analysis** (2-3 min): Environment variables, database schema, authentication
2. **Core Endpoint Analysis** (5-8 min): Input validation, rate limiting, error handling, authorization
3. **Data Integrity Analysis** (3-5 min): Transaction security, data flow assessment, logging
4. **Compliance Assessment** (3-5 min): Industry standards and regulations
5. **Vulnerability Testing** (5-8 min): Injection prevention, authentication bypass, authorization
6. **Security Implementation** (8-12 min): Rate limiting, input validation, error hardening
7. **Build Validation** (2-3 min): TypeScript compilation, dependency validation
8. **Documentation & Reporting** (3-5 min): Security audit report, compliance metrics

### Enterprise-Grade Security Measures

#### Critical Security Implementations

- **Rate Limiting**: 15-minute windows, configurable limits per endpoint
- **Input Validation**: Comprehensive Zod schemas for all API endpoints
- **Secure Error Handling**: Generic error responses prevent information disclosure
- **File Upload Security**: Type validation, size limits, and secure storage

### Security Best Practices

**Key Security Areas**:

- **Webhook Security**: Validate signatures, prevent replay attacks, never log secrets
- **File Upload System**: Server-side validation, secure storage, access control
- **Error Handling**: Generic error responses, sanitized logging
- **Data Protection**: Encryption in transit, secure storage of sensitive data

---

## 🔍 Monitoring & Debugging

### Error Handling

- **Global Error Boundaries**: React error boundaries for UI errors
- **API Error Handling**: Consistent error responses
- **Logging**: Structured logging for debugging
- **Performance Monitoring**: Track application performance

### Development Tools

- **Prisma Studio**: Database inspection and management
- **React DevTools**: Component state debugging
- **Network Tab**: API request/response monitoring
- **Console Logging**: Development-time debugging information

---

## 📝 Documentation Standards

### Code Documentation

- **TypeScript Comments**: JSDoc comments for functions and types
- **API Documentation**: tRPC auto-generated API documentation
- **Database Schema**: Prisma schema as source of truth
- **Component Documentation**: Storybook-style component documentation

### Project Documentation

- **README**: Project setup and usage instructions
- **CHANGELOG**: Track important changes and updates
- **CONTRIBUTING**: Guidelines for contributors
- **DEPLOYMENT**: Deployment instructions and checklists

---

## 📈 Retrospective Workflow

When you use the `=rrr` command, the agent will create a file and an Issue with the following sections and details:

### Retrospective Structure

**Required Sections**:

- **Session Details**: Date (YYYY-MM-DD local timezone), Duration, Focus, Issue/PR references
- **Session Summary**: Overall work accomplished
- **Timeline**: Key events with local timestamps
- **📝 AI Diary** (MANDATORY): First-person reflection on approach and decisions
- **💭 Honest Feedback** (MANDATORY): Performance assessment and improvement suggestions
- **What Went Well**: Successes achieved
- **What Could Improve**: Areas for enhancement
- **Blockers & Resolutions**: Obstacles and solutions
- **Lessons Learned**: Patterns, mistakes, and discoveries

**File Naming**: `session-YYYY-MM-DD-[description].md` with local date

---

## 📚 Best Practices from Retrospectives

### TodoWrite Integration Best Practices

**Results**: **15-minute implementations** vs 34+ minute sessions

**When to Use**: Complex multi-step tasks (3+ phases), multi-component refactoring, full-stack implementations, large refactoring projects, security audits, database migrations

**Workflow Pattern**:

1. Break into 5-12 manageable todos
2. Mark exactly ONE todo in_progress → completed
3. Provides real-time visibility and accountability
4. Enables accurate time estimation

**Proven Benefits**: 56% faster implementation, reduces context switching, prevents missing steps, ensures comprehensive testing

### Pattern Replication Strategy

#### Reference Implementation Approach

1. **Document Successful Patterns**: Create detailed retrospectives for reusable approaches
2. **Systematic Replication**: Use previous session files as implementation guides
3. **Adapt, Don't Recreate**: Modify proven patterns for new contexts
4. **Measure Efficiency**: Track implementation time improvements

### Build Validation Checkpoints

#### Critical Validation Points

- **Schema Changes**: `npm run build && npx tsc --noEmit`
- **API Modifications**: `npm run build 2>&1 | grep -A 5 "error"`
- **Large Refactoring**: `npx prisma generate && npm run build`

#### Proactive Testing Strategy

- **Incremental Builds**: Test builds after each major change, not just at the end
- **TypeScript Validation**: Run `npx tsc --noEmit` for pure type checking
- **Dependency Verification**: Check imports and exports after file restructuring
- **Database Sync**: Verify `npx prisma generate` after schema changes

### Schema Investigation Protocol

#### Before Implementation Checklist

1. **Verify Database Schema**: Always check actual Prisma schema definitions
2. **Trace Data Structures**: Follow interface definitions through the codebase
3. **Validate Field Names**: Don't assume field naming conventions
4. **Check Relationships**: Understand model relationships before querying

#### Common Schema Pitfalls

- **Assumption Errors**: Making assumptions about field names/structures
- **Interface Misalignment**: Frontend interfaces not matching database schema
- **Relationship Complexity**: Not understanding foreign key relationships
- **Type Mismatches**: TypeScript interfaces not reflecting actual data structures

### Multi-Phase Implementation Approach

#### Systematic Phase Breakdown

- **Phase 1**: Analysis & Preparation (10-15%)
- **Phase 2**: Core Implementation (40-50%)
- **Phase 3**: Integration & Testing (25-30%)
- **Phase 4**: Documentation & Cleanup (10-15%)

#### Phase Management Best Practices

- **Clear Phase Objectives**: Define specific deliverables for each phase
- **Dependency Mapping**: Identify cross-phase dependencies upfront
- **Progress Checkpoints**: Validate phase completion before proceeding
- **Issue Tracking**: Update GitHub issues after each phase completion

### Database Best Practices

#### PostgreSQL Sequence Management

- **Check Sequence**: `SELECT last_value FROM "TableName_id_seq";`
- **Reset Sequence**: `SELECT setval('"TableName_id_seq"', COALESCE(MAX(id), 0) + 1) FROM "TableName";`
- **Common Issue**: Auto-increment sequences become desynchronized after manual insertions

### Documentation Standards

#### PR Description Requirements

- **Implementation Summary**: Clear overview of changes made
- **Technical Details**: Specific technical implementation notes
- **Before/After Analysis**: Impact assessment and improvement metrics
- **Testing Validation**: Build success and functionality verification
- **Iteration Note Summary**: Key decisions and hurdles from development

#### Retrospective Documentation

- **AI Diary**: First-person reflection on approach and decision-making
- **Honest Feedback**: Critical assessment of session efficiency and quality
- **Pattern Recognition**: Identification of reusable patterns and approaches
- **Lessons Learned**: Specific insights for future implementation improvement
