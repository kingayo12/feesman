# Feesman - Business Requirements Document

**Version 1.0** | **Last Updated**: April 2026

---

## Executive Summary

**Feesman** (Fee Management System) is a comprehensive school administration platform designed to streamline financial operations, student management, and fee collection across educational institutions. It provides role-based access control, real-time financial dashboards, offline-first capability, and automated reporting for schools of any size.

### Key Value Propositions

- 📊 **Real-time Finance Visibility**: Dashboard with instant fee collection, outstanding balance, and revenue trends
- 👨‍👩‍👧‍👦 **Family-Centric Management**: Unified view of multi-student families with shared billing and sibling discounts
- 🔐 **Role-Based Access**: Granular permissions for Super Admin, Admin, IT Admin, Admin Officer, Accountant, and basic Users
- 📱 **Offline-First**: Full functionality offline with automatic sync when reconnected
- 💰 **Flexible Fees & Discounts**: Class-based fees, per-student overrides, family discounts, and sibling benefits
- 📈 **Comprehensive Reports**: Payment history, collection trends, class breakdown, per-method analytics

---

## Product Overview

### Target Users

1. **Super Admins**: Full system control, user management, role configuration
2. **School Admins**: Oversee all operations, settings, system configuration
3. **IT Admins**: Technical support, system maintenance, data integrity
4. **Admin Officers**: Student/family/class management, day-to-day operations
5. **Accountants**: Payment recording, financial reporting, collection tracking
6. **Basic Users**: Restricted data viewing (depends on role permissions)

### Core Modules

#### 1. **Dashboard & Analytics**

- **Overview**: Real-time financial metrics and trends
- **Metrics Displayed**:
  - Total fees expected for current session/term
  - Total payments received
  - Outstanding balances
  - Collection rate by percentage
  - Total arrears (previous balances)
  - Total discounts applied
- **Visualizations**:
  - Recent transactions (last 5 payments)
  - Class-wise fee breakdown
  - Term-by-term payment trends
  - Collection by payment method (pie chart)
  - Daily collection stats
- **Filters**: Academic year, term selection
- **Access Level**: Varies by role (accountant/admin officer see restricted view)

#### 2. **Family Management**

- **Entities**: Family records with parent/guardian contact info
- **Operations**:
  - ✅ Create/read/update/delete families
  - View all students in family
  - Real-time family financial summary:
    - Term fees (net of discounts)
    - Amount paid
    - Outstanding balance
  - Track discounts applied to family
  - View payment history for all students in family
- **Relationships**: Family → Students (1 family: N students)
- **Calculations**: Sibling discount benefits, family-level discount assignments

#### 3. **Student Management**

- **Entities**: Student records with identity, contact, and family reference
- **Identity Fields**: firstName, lastName, email, phone, dateOfBirth, gender (implied)
- **Operations**:
  - ✅ Create/read/update/delete students
  - Assign to family (required field)
  - Manage current & historical enrollments
  - View student payment history
  - Track student's total fees and balances
  - Record fee overrides (per-student fee customization)
- **Relationships**:
  - Student → Family (many-to-one)
  - Student → Class (many-to-many through StudentEnrollments)
- **Enrollment**: Separate collection tracks class placement per session/term

#### 4. **Class Management**

- **Entities**: Class records (level, section, capacity)
- **Operations**:
  - ✅ Create/read/update/delete classes
  - View enrolled students per class
  - Bulk student promotions (to new class + session)
  - Class-level fee definitions
- **Relationships**: Class → Students (via StudentEnrollments)

#### 5. **Fee Management**

- **Entities**: Fee structures defined per class/session/term
- **Fee Types**: Tuition, exam, uniform, transportation, activity, etc.
- **Operations**:
  - ✅ Define fees by class/session/term
  - Per-student fee overrides (disable certain fees for a student)
  - View class fee breakdown
  - Total term fees calculation (sum of active fees minus overrides)
- **Calculations**:
  - Class total = sum of all enabled fees for the class
  - Student total = class total - overridden fees + previous balance - discounts

#### 6. **Payment Management**

- **Entities**: Payment records with student, family, amount, method, date
- **Operations**:
  - ✅ Record payments (via PaymentForm)
  - View payment history (global, by family, by student)
  - Delete payments (with audit trail)
  - Filter by session, term, payment method
- **Payment Methods Tracked**: Cash, Check, Bank Transfer, Mobile Money, etc.
- **Collections**:
  - Global payment tracking
  - Per-student tracking
  - Per-family tracking
- **Metrics**:
  - Total collected today
  - Today's payment count by method
  - Number of students/families paid today

#### 7. **Discount & Subsidy Management**

- **Discount Types**:
  - Fixed amount (e.g., 5000 NGN off)
  - Percentage (e.g., 10% off)
  - Full subsidy (100% discount)
- **Assignment Scopes**:
  - Family-level (all students in family benefit)
  - Individual student (only that student)
- **Triggers**:
  - Sibling discount (2+ siblings in family → automatic discount)
  - Staff children (staff status flag → automatic discount)
  - Scholarship/subsidy (manual assignment)
  - Promotional (time-based)
- **Operations**:
  - ✅ Create/edit/delete discount definitions
  - Assign discounts to families/students
  - Enable/disable per session
  - View discount breakdown by type

#### 8. **Previous Balance Management**

- **Purpose**: Carry forward unpaid fees from prior sessions
- **Entities**: Previous balance records (studentId, familyId, session, amount)
- **Operations**:
  - Record previous balance at session start
  - Track arrears through reports
  - Included in current fee calculations
- **Impact**: Adds to current term fees owed

#### 9. **Reports & Export**

- **Dashboard Reports**:
  - Finance summary (fees, payments, outstanding)
  - Class breakdown (by revenue)
  - Payment trends (by term)
  - Collection by method
  - Daily collections
- **Letter Generation**: Student receipts, family statements (in development)
- **Export Formats**:
  - PDF (via jsPDF)
  - Excel (via ExcelJS)
  - Word (via DOCX)
- **Audit Trail**: Payment deletion history implied

#### 10. **Role & Permission Management**

- **Roles**:
  - `super_admin`: All permissions
  - `admin`: Most permissions except user management
  - `it_admin`: System settings, data integrity
  - `admin_officer`: Student, family, class, payment CRUD
  - `accountant`: View payments, record payments, view reports
  - `user`: Basic access (limited by permissions)
- **Permission Granularity**: 30+ distinct permissions (CREATE_STUDENT, EDIT_FAMILY, VIEW_REPORTS, etc.)
- **Storage**: Role definitions in Firestore, linked to user profiles

---

## Data Model

### Firestore Collections

#### **students**

```firestore
students/{studentId}
  ├─ firstName (string)
  ├─ lastName (string)
  ├─ familyId (string) → families/{familyId}
  ├─ email (string)
  ├─ phone (string)
  ├─ dateOfBirth (timestamp)
  ├─ gender (string)
  ├─ status (string) // "active" | "inactive" | "graduated"
  ├─ createdAt (timestamp)
  └─ updatedAt (timestamp)
```

#### **studentEnrollments** ⭐ KEY

```firestore
studentEnrollments/{enrollmentId}
  ├─ studentId (string) → students/{studentId}
  ├─ classId (string) → classes/{classId}
  ├─ session (string) // "2025/2026"
  ├─ term (string) // "1st Term", "2nd Term", "3rd Term"
  ├─ status (string) // "active" | "dropped" | "promoted"
  ├─ enrolledAt (timestamp)
  ├─ promotedAt (timestamp)
  └─ metadata (object)
```

⚠️ **Critical**: Students collection contains **identity ONLY**. All session/class/term info is in this collection.

#### **families**

```firestore
families/{familyId}
  ├─ familyName (string)
  ├─ parentName (string)
  ├─ phone (string)
  ├─ email (string)
  ├─ address (string)
  ├─ status (string) // "active" | "inactive"
  ├─ createdAt (timestamp)
  └─ updatedAt (timestamp)
```

#### **classes**

```firestore
classes/{classId}
  ├─ name (string) // e.g., "JSS 1A", "Senior 3"
  ├─ level (string) // e.g., "JSS 1", "SS 3"
  ├─ section (string) // e.g., "A", "B"
  ├─ capacity (number)
  ├─ status (string)
  ├─ createdAt (timestamp)
  └─ updatedAt (timestamp)
```

#### **fees**

```firestore
fees/{feeId}
  ├─ classId (string) → classes/{classId}
  ├─ session (string) // "2025/2026"
  ├─ term (string) // "1st Term" (normalized)
  ├─ feeType (string) // "Tuition", "Exam", "Uniform", etc.
  ├─ amount (number) // in NGN
  ├─ status (string) // "active" | "inactive"
  ├─ createdAt (timestamp)
  └─ updatedAt (timestamp)
```

#### **payments**

```firestore
payments/{paymentId}
  ├─ studentId (string) → students/{studentId}
  ├─ familyId (string) → families/{familyId}
  ├─ session (string) // "2025/2026" (not "academicYear")
  ├─ term (string) // "1st Term"
  ├─ amount (number)
  ├─ date (timestamp)
  ├─ method (string) // "Cash", "Bank Transfer", "Mobile Money", etc.
  ├─ receipt (string) // optional receipt number
  ├─ notes (string) // optional
  ├─ createdAt (timestamp)
  └─ createdBy (string) // UID of accountant who recorded
```

⚠️ **Critical**: Uses `session` field, **not** `academicYear`.

#### **discounts**

```firestore
discounts/{discountId}
  ├─ name (string)
  ├─ type (string) // "fixed" | "percentage" | "free"
  ├─ value (number) // amount or % depending on type
  ├─ description (string)
  ├─ active (boolean)
  ├─ session (string) // "2025/2026" or "all" for all sessions
  ├─ appliedTo (array) // e.g., ["tuition", "exam"]
  ├─ createdAt (timestamp)
  └─ updatedAt (timestamp)
```

#### **discountAssignments**

```firestore
discountAssignments/{assignmentId}
  ├─ discountId (string) → discounts/{discountId}
  ├─ targetType (string) // "family" | "student"
  ├─ targetId (string) // familyId or studentId
  ├─ session (string) // or null for all sessions
  ├─ assignedAt (timestamp)
  └─ assignedBy (string) // UID of admin
```

#### **previousBalances**

```firestore
previousBalances/{balanceId}
  ├─ studentId (string) → students/{studentId}
  ├─ familyId (string) → families/{familyId}
  ├─ session (string) // session where balance accrued
  ├─ amount (number) // arrears from prior term/session
  ├─ note (string)
  ├─ createdAt (timestamp)
  └─ updatedAt (timestamp)
```

#### **studentFeeOverrides**

```firestore
studentFeeOverrides/{overrideId}
  ├─ studentId (string) → students/{studentId}
  ├─ feeId (string) → fees/{feeId}
  ├─ session (string)
  ├─ term (string)
  ├─ overrideAmount (number) // null = disable fee
  ├─ reason (string)
  ├─ createdAt (timestamp)
  └─ updatedAt (timestamp)
```

#### **settings**

```firestore
settings/{docId} [singleton]
  ├─ academicYear (string) // "2025/2026"
  ├─ currentTerm (string) // "1st Term", "2nd Term", "3rd Term"
  ├─ schoolName (string)
  ├─ schoolAddress (string)
  ├─ phone (string)
  ├─ email (string)
  ├─ currency (string) // "NGN"
  ├─ locale (string) // "en-NG"
  ├─ updatedAt (timestamp)
  └─ updatedBy (string) // UID of admin
```

#### **users**

```firestore
users/{uid} [Firebase Auth UID]
  ├─ uid (string)
  ├─ email (string)
  ├─ displayName (string)
  ├─ photoURL (string)
  ├─ role (string) // "super_admin", "admin", "admin_officer", "accountant", "user"
  ├─ createdAt (timestamp)
  └─ updatedAt (timestamp)
```

#### **roles** (optional, for advanced RBAC)

```firestore
roles/{roleId}
  ├─ label (string)
  ├─ permissions (array) // ["VIEW_DASHBOARD", "CREATE_PAYMENT", ...]
  ├─ archived (boolean)
  ├─ createdAt (timestamp)
  └─ updatedAt (timestamp)
```

---

## Technical Architecture

### Technology Stack

- **Frontend**: React 19 + Vite
- **State Management**: React Context (Auth, App), Custom Hooks
- **Database**: Firebase Firestore (with persistent local cache)
- **Authentication**: Firebase Auth (Email/Password + Google OAuth)
- **UI Components**: React Icons, Chart.js, DataTables.net, Framer Motion
- **Export**: jsPDF, ExcelJS, DOCX, html-to-image
- **Offline**: Service Worker, IndexedDB (via Firestore), Background Sync
- **Styling**: CSS with dark mode support
- **Build**: Vite
- **Testing**: Vitest + React Testing Library

### Architecture Layers

```
┌─────────────────────────────────────────────┐
│         React Components (Pages/Forms)      │
├─────────────────────────────────────────────┤
│       Custom Hooks (useAuth, useRole,       │
│         useSettings, useFirestore, etc.)    │
├─────────────────────────────────────────────┤
│      Service Layer (*Service.js files)      │
│   (dashboardService, familyService, etc.)   │
├─────────────────────────────────────────────┤
│  Firebase SDK (Auth, Firestore, Storage)    │
│   + Offline Cache + Background Sync         │
└─────────────────────────────────────────────┘
```

### Data Flow

1. **Component** mounts → calls hook
2. **Hook** calls service function with parameters
3. **Service** queries Firestore or returns cached data
4. **Firestore SDK** handles persistence, offline, sync
5. **Component** re-renders with data

### Offline Strategy

- **Persistent Cache**: Firestore SDK caches reads/writes to IndexedDB
- **Multi-Tab Manager**: Coordinates cache across browser tabs
- **Background Sync**: `backgroundSync.js` re-syncs collections when online
- **Memory Cache**: `offlineDataManager.js` keeps frequent queries in RAM (TTL: 5-15 min)

---

## Key Features & Workflows

### Workflow 1: Student Registration & Enrollment

```
1. Admin creates family record
2. Admin creates student (linked to family)
3. System auto-enrolls student in current session/term with classId
4. Student appears in class roster
5. Fees calculated based on class
6. Ready for payment tracking
```

### Workflow 2: Payment Recording

```
1. Accountant records payment (amount, method, date)
2. Payment linked to student + family + session + term
3. Dashboard updated instantly (or after sync if offline)
4. Outstanding balance recalculated
5. Receipt can be generated
```

### Workflow 3: Fee Calculation (Per Student, Per Term)

```
1. Get student's classId from current enrollment
2. Get all fees for class + session + term
3. Apply student fee overrides (disable certain fees)
4. Sum active fees = "Term Fees"
5. Add previous balance (arrears)
6. Subtract all applicable discounts:
   - Student-specific discounts
   - Family-level discounts (sibling discount, etc.)
7. Final amount = Term Fees + Arrears - Discounts
8. Outstanding = Final Amount - Payments Received
```

### Workflow 4: Discount Assignment

```
1. Admin creates discount (e.g., "10% Family Discount")
2. Admin assigns to target (family or individual student)
3. Discount automatically applied in fee calculations
4. Can be scoped to specific session or "all"
5. Can be enabled/disabled per session
```

### Workflow 5: Student Promotion (Term/Session Change)

```
1. System administrator initiates bulk promotion
2. Select students + new class + new session + new term
3. Creates new enrollmentRecord for each student
4. Previous enrollments preserved as historical record
5. New fees calculated based on new class
```

---

## Current Alignment Issues

### ⚠️ Critical Issues (Resolved)

- ✅ **Students collection queried with `session` field** (fixed)
  - Dashboard & family list were returning 0 students
  - Solution: Query students + enrollments separately, enrich with classId

### ⚠️ Medium-Priority Issues

#### 1. **Term Normalization Spread**

- **Problem**: Term string format inconsistent across codebase
  - Some places use "1st Term", others use "first term"
  - Multiple `normalizeTerm()` functions doing same work
- **Locations**: `dashboardService.js`, `paymentService.js`, multiple components
- **Impact**: Risk of query mismatches, hard to maintain
- **Solution**: Centralize in `src/utils/termNormalizer.js`

#### 2. **Student-Enrollment Join Logic Duplicated**

- **Problem**: Logic to fetch students + enrollments + enrich repeats in 3+ places
- **Locations**: `dashboardService.js`, `offlineDataManager.js`, `FamilyDetails.jsx`
- **Impact**: Maintenance burden, risk of divergent logic
- **Solution**: Extract to `src/utils/studentWithEnrollments.js`

#### 3. **Discount Calculation Logic Fragmented**

- **Problem**: No single source for computing discounts
- **Locations**: `discountService.js`, `dashboardService.js`, `FamilyList.jsx`
- **Impact**: Hard to audit, risk of inconsistent calculations
- **Solution**: Centralize in `discountService.js` with unified API

#### 4. **File Naming Inconsistencies**

- **Problem**: Hook files mixed casing
  - `Usecacheconsent.js` vs `useAuth.js`
  - `UseReceipt.js` vs `useSettings.js`
- **Impact**: Harder to find files, unprofessional codebase
- **Solution**: Rename to camelCase:
  - `Usecacheconsent.js` → `useCacheConsent.js`
  - `UseReceipt.js` → `useReceipt.js`
  - `Discountservice.js` → `discountService.js`

#### 5. **Service Function Naming Inconsistency**

- **Problem**: Service files mixed casing
  - `Discountservice.js` vs `familyService.js`
- **Impact**: Unprofessional, hard to search
- **Solution**: All lowercase: `discountService.js`

#### 6. **Empty AppContext**

- **Problem**: `AppContext.jsx` initialized but unused
- **Impact**: Missed opportunity for global state (settings, user permissions, active discounts)
- **Solution**: Implement with app-level data

### 🟡 Low-Priority Issues

#### 7. **No Input Validation Layer**

- **Problem**: Services don't validate before writing to Firestore
- **Impact**: Potential data corruption, bad user input
- **Solution**: Create `src/utils/validators.js` with schema validation

#### 8. **Missing Error Boundaries**

- **Problem**: Components don't consistently catch/handle service errors
- **Impact**: Unhandled rejections in console
- **Solution**: Wrap service calls in try-catch, show user-friendly toasts

#### 9. **Hardcoded Term Array**

- **Problem**: `["1st Term", "2nd Term", "3rd Term"]` array in multiple places
- **Impact**: Hard to change term structure
- **Solution**: Store in constants/settings

---

## Non-Functional Requirements

### Performance

- Dashboard should load < 3 seconds (with caching)
- List views (families, students) should render 100+ records responsively
- Offline cache should enable instant load of recently accessed data
- Batch queries to minimize Firestore read count

### Scalability

- Supports 1000+ students + 500+ families without degradation
- Firestore indexes needed for complex queries (class + session + term)
- Pagination/lazy-loading for large lists

### Security

- Firebase Auth handles user authentication
- Firestore rules enforce role-based read/write access
- Sensitive data (passwords, PII) encrypted in transit
- Audit trail for payment deletions

### Reliability

- Offline-first: Full functionality without internet
- Auto-sync when reconnected (via background sync)
- Multi-tab coordination (prevent data conflicts)
- Error recovery without data loss

### Accessibility

- Dark mode support (CSS: `darkmode.css`)
- Responsive design for mobile/tablet/desktop
- Semantic HTML for screen readers
- Keyboard navigation for forms

### Usability

- Intuitive navigation (sidebar, navbar)
- Role-specific views (accountant sees payments, admin officer sees students)
- Quick actions (floating buttons, context menus)
- Drag-and-drop for promotions (student assignment)

---

## Future Roadmap

### Phase 2 (Q3 2026)

- [ ] Complete letter generation module (student receipts, family statements)
- [ ] Implement validation layer in all services
- [ ] Add error boundaries in components
- [ ] Centralize term & discount logic
- [ ] Create comprehensive audit trail

### Phase 3 (Q4 2026)

- [ ] Multi-school support (if needed)
- [ ] Advanced reporting (custom date ranges, filtering)
- [ ] SMS/email notifications (payment reminders, receipts)
- [ ] Mobile app (React Native)
- [ ] API for third-party integrations

### Phase 4 (2027)

- [ ] Accounting GL integration (for auditors)
- [ ] Student portal (parents view payments/receipts)
- [ ] Scheduled payment plans (installment support)
- [ ] Predictive analytics (collection forecasting)

---

## Conclusion

**Feesman** is a well-architected school fee management system with strong foundations:

- ✅ Clean separation of concerns (service layer, hooks, components)
- ✅ Offline-first design with background sync
- ✅ Role-based security with granular permissions
- ✅ Comprehensive feature set (9 major modules)

**Immediate recommendations**:

1. Fix file naming inconsistencies (low effort, high clarity)
2. Centralize term normalization (medium effort, medium impact)
3. Extract student-enrollment join logic (medium effort, high impact)
4. Consolidate discount calculations (medium effort, high impact)
5. Implement AppContext for global state (medium effort, enables future features)

**Next Steps**: Prioritize architectural cleanup in upcoming sprint to improve maintainability and reduce technical debt.

---

**Document Owner**: Development Team  
**Last Review**: April 2026  
**Next Review**: July 2026
