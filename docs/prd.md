# Requirements Document

## 1. Application Overview

**Application Name:** Silver Jewellery ERP
**Type:** Windows Desktop Application (offline-first, local SQLite database)
**Description:** A production-ready, installable Windows desktop ERP for silver jewellery manufacturing businesses. Manages patterns/items, stones, customers/parties, orders, wax manufacturing, stone setting, karigars, calculations, reports, PDFs, JPG work slips, and WhatsApp sharing. 100% offline for all core functionality; internet required only for optional WhatsApp sharing.

**Installer:** SilverJewelleryERP-Setup.exe (via Electron Builder)
**Default App Data Location:** AppData/database/, AppData/backups/, AppData/images/, AppData/attachments/, AppData/generated/pdf/, AppData/generated/jpg/, AppData/logs/

---

## 2. Core Constraints

- 100% local/offline-first; no Firebase, Supabase, AWS, Azure, MongoDB Atlas, hosted DB, VPS, paid API, or subscription service
- SQLite local database; no mandatory server or cloud database
- Single administrator account; role-ready architecture for future multi-user
- Configurable business name and logo appear on all reports, PDFs, JPGs, and print outputs
- No WhatsApp Business API or paid messaging API
- Electron security: contextIsolation: true, nodeIntegration: false
- All core features must work with internet fully disconnected

---

## 3. User & Usage Context

**Target User:** Silver jewellery manufacturing business owner/administrator (non-technical)
**Core Scenarios:**

- Managing customer/party records and order history
- Creating and tracking manufacturing orders with gram/piece/mixed quantity types
- Calculating finished pieces, wax trees, and stone requirements automatically
- Assigning orders to wax and stone-setting karigars
- Generating and sharing work slip images (JPG/PNG) via WhatsApp
- Running production and consumption reports
- Backing up and restoring local data

---

## 4. Page Structure & Module Overview

```
Silver Jewellery ERP
├── Login Screen
├── First-Run Setup Wizard (6 steps)
├── Dashboard
├── Customers / Parties
│   └── Customer Detail Page
├── Items / Patterns
│   └── Pattern Detail Page
├── Stones
│   ├── Micro Diamond Master
│   ├── AD Diamond Master
│   └── Stone Category Management
├── Orders
│   ├── New Order
│   └── Order Detail Page
├── Karigars
├── Production
├── Reports
│   ├── Order Report
│   ├── Customer Report
│   ├── Pattern Usage Report
│   ├── Stone Consumption Report
│   ├── Wax Production Report
│   ├── Karigar Work Report
│   ├── Pending Orders
│   ├── Completed Orders
│   ├── Date-wise Report
│   ├── Customer-wise Report
│   └── Pattern-wise Report
├── Backup & Restore
└── Settings
```

**Left Sidebar Navigation (collapsible, 10 items):**
Dashboard, Customers, Items/Patterns, Stones, Orders, Karigars, Production, Reports, Backup & Restore, Settings

**Top Bar:** Global Search (Ctrl+K), Notifications, Current User, Settings shortcut

---

## 5. Module Functional Specifications

### 5.1 Login & First-Run Setup Wizard

**Login Screen:**

- Fields: User ID, Password, Remember Me checkbox
- Password stored with bcrypt hashing; no hard-coded production credentials
- On first launch, redirect to Setup Wizard instead of login

**First-Run Setup Wizard (6 steps):**

1. Business Information: Name, Address, City, State, Country, Mobile, WhatsApp, Email, GST Number, Other Info
2. Create Login: Set User ID and Password
3. Upload Business Logo: local file, stored in AppData/images/
4. Configure Basic Categories: item categories (Ring, Pendant, Earring, Bracelet, Chain, Necklace, Nose Pin, Other + custom), stone categories for Micro and AD
5. Choose Backup Folder: local directory picker
6. Finish: summary and open Dashboard

### 5.2 Dashboard

**KPI Cards:**
Total Customers, Total Patterns, Total Stones, Active Orders, Pending Orders, Orders In Production, Completed Orders, Wax Work Pending, Stone Setting Pending, Today's Orders, Monthly Orders

**Charts (Recharts):**
Orders by month, Orders by status, Orders by customer, Grams ordered, Pieces ordered, Stone consumption, Production status

**Recent Activity Log:** last N events (customer added, pattern added, stone added, order created, order assigned, order completed, backup completed)

### 5.3 Customer / Party Management

**Fields:** Customer ID (auto), Party Name, Contact Person, Mobile, Alternate Number, WhatsApp, Address, City, State, Email, GST Number, Notes, Active/Inactive

**Functions:** Add, Edit, View, Search (by Party Name / Mobile / WhatsApp / Customer ID), Filter, Deactivate, Delete (with confirmation), Export

**Customer Detail Page:** customer info, total orders, pending orders, completed orders, total grams, total pieces, order history, recent orders, notes

**Empty state:** \"No customers added yet.\" with Add Customer button

### 5.4 Stone Module

**Landing:** two visually prominent cards — MICRO (Micro Diamond Collection) and AD DIAMONDS (AD Diamond Collection)

**Micro Diamond Master Fields:** Stone ID, Stone Name, Category, Size (user-configurable, e.g. 1.00-2.00 mm; not hard-coded), Shape, Grade/Type, Colour, Individual Weight, Weight Unit, Stones per Gram, Supplier, Notes, Active/Inactive

**AD Diamond Master Fields:** Stone ID, Stone Name, Category, Shape (Oval/Round/Square/Pear/Marquise/Princess/Custom), Size, Length, Width, Weight, Supplier, Notes, Active/Inactive

**Stone Category Management:** separate categories for Micro and AD; Add, Edit, Deactivate, Delete if unused

### 5.5 Item / Pattern Master

**Fields:** Pattern ID (auto), Pattern Number (e.g. P-9001), Pattern Name, Category, Subcategory, Pattern Size, Weight per Finished Piece (grams), Weight Unit, Tree Size (pieces per wax tree — NOT finished pieces), Stone Configuration (multiple entries), Total Stones per Piece (auto-calculated), Images (multiple, stored locally in AppData/images/), Notes, Active/Inactive, Created Date, Updated Date

**Pattern Stone Configuration:** per pattern, multiple stone entries each with: Stone Category, Stone Type, Stone Size, Shape, Qty per finished piece. Total Stones per Piece = sum of all Qty per finished piece entries (auto-calculated).

**Pattern Categories:** configurable — Ring, Pendant, Earring, Bracelet, Chain, Necklace, Nose Pin, Other + custom; Add, Edit, Deactivate

**Image handling:** upload JPG/JPEG/PNG/WEBP; stored locally; preview, replace, remove, multiple images supported

**Empty state:** \"No patterns added yet.\" with Add Pattern button

### 5.6 Orders Module

**Order Number:** auto-generated ORD-YYYY-XXXX (e.g. ORD-2026-0001); no duplicates; configurable prefix

**New Order flow:**

1. Select Party via autocomplete (search by name/mobile/WhatsApp/ID); auto-populates Party Name, Mobile, WhatsApp, Address, Customer ID
2. Select Order Type: GRAMS / PIECES / GRAMS+PIECES (prominent card/button selection)
3. Excel-style editable order table

**Order Table Columns:** Sr.No, Pattern No, Pattern Name, Pattern Size, Pattern Weight, Tree Size, Order Quantity, Quantity Type, Finished Pieces, Wax Trees Required, Total Stones, Status, Actions

**Pattern Autocomplete:** search by P-9001 / p9001 / 9001 / pattern name; auto-fills Pattern Number, Pattern Name, Pattern Size, Weight per Piece, Tree Size, Stone Configuration, Stones per Piece, Pattern Image

**Order Snapshot:** at order creation, store snapshot of Pattern Number, Pattern Name, Pattern Weight, Tree Size, Stone Configuration, Stone Qty per Piece. This snapshot is immutable — changes to Pattern Master do not affect existing orders.

**Order Statuses:** Draft, Confirmed, Pending, Assigned, Wax In Progress, Wax Completed, Stone Setting Pending, Stone Setting In Progress, Stone Setting Completed, Production Completed, Ready, Delivered, Cancelled

**Status history tracking:** every status change recorded with timestamp and user

**Duplicate Order:** creates new Draft with new order number; original order unchanged

### 5.7 Calculation Engine

Centralized calculation service (NOT embedded in UI components). Reused by: Order page, Order Detail, Reports, Wax Work Orders, Stone Work Orders, PDF, JPG/PNG image generation, Excel, WhatsApp image. Uses decimal-safe arithmetic (not raw JS floats).

**Gram-based calculation:**

- Theoretical Finished Pieces = Order Grams / Pattern Weight (display decimal)
- Manufacturing Qty = apply configurable rounding (Ceiling default / Floor / Round)
- Wax Trees = ceil(Finished Pieces / Tree Size) [ceiling default]
- Total Stones per stone type = Finished Pieces x Stone Qty per Piece

**Piece-based calculation:**

- Finished Pieces = Entered Pieces (no re-conversion)
- Expected Weight = Pieces x Pattern Weight (informational only; must NOT change requested piece quantity)
- Wax Trees = ceil(Finished Pieces / Tree Size)
- Total Stones per stone type = Finished Pieces x Stone Qty per Piece

**Grams+Pieces:** each row calculates independently based on its own Quantity Type

**Stone calculation rule:** ALWAYS based on Finished Pieces; NEVER on wax tree count or order grams directly

**Mandatory test cases:**

- Test 1 (Grams): 200g / 0.50g = 400 pieces; 400/10 = 40 trees; 400x8 = 3,200 stones
- Test 2 (Pieces): 500 pcs; expected weight 250g; 500/10 = 50 trees; 500x8 = 4,000 stones
- Test 3 (Mixed): P-9001 200g->400 pcs, 40 trees; P-9002 500 pcs, 50 trees — each row independent

**Rounding display:** show theoretical decimal (e.g. 363.636) and manufacturing quantity separately

### 5.8 Order Detail Page

Sections:

1. Order Information: Order Number, Party, Date, Status
2. Pattern Details (from snapshot)
3. Quantity Calculation: prominent display of ORDER / PATTERN WEIGHT / FINISHED PIECES / TREE SIZE / WAX TREES / TOTAL STONES
4. Wax Tree Calculation
5. Stone Requirement Table (see 5.9)
6. Karigar Assignment
7. Production Status with history
8. Attachments (local files: design images, reference images, production images, documents)
9. Notes
10. Activity History

### 5.9 Stone Summary Table (per order)

Columns: Stone Category, Stone Size, Shape, Qty/Piece, Finished Pieces, Required Qty
Includes totals row. Professional ERP table style.

### 5.10 Karigar Management

**Fields:** Karigar ID (auto), Name, Mobile, WhatsApp, Type (Wax Karigar / Stone Setting Karigar / Other + custom), Address, Notes, Active/Inactive

**Assignment:** from Order Detail page, assign to Wax Karigar or Stone Setting Karigar

**Empty state:** \"No karigars added yet.\" with Add Karigar button

### 5.11 Work Orders & Work Slips

**Wax Work Order content:** Business Logo, Party, Pattern No/Name, Order No, Order Qty, Qty Type, Finished Pieces, Pattern Weight, Tree Size, Wax Trees Required, Notes, Date

**Stone Work Order content:** Business Logo, Party, Pattern, Finished Pieces, Stone table with totals (Stone Category, Size, Shape, Qty/Piece, Total Required), Notes, Date

**Output formats:** PDF, JPG/PNG (WhatsApp-optimized vertical format), Print

**Print modes:** Full Order, Wax Work Order only, Stone Work Order only

### 5.12 WhatsApp Image Sharing

- No WhatsApp Business API, no Meta API, no paid provider, no subscription service
- Method: generate a styled order card image (JPG/PNG) using html2canvas to render an in-app HTML/CSS order card to canvas, then export as image file
- The generated image includes: business logo, business name, order details (Order Number, Party, Date, Order Qty, Finished Pieces, Wax Trees, Tree Size, Pattern details), karigar assignment info, stone work summary table — formatted as a professional, visually clean order card suitable for sending as a photo in WhatsApp
- Sharing flow:
  1. Application renders the styled order card in a hidden/offscreen HTML element
  2. html2canvas captures the rendered element and produces a canvas
  3. Canvas is exported as JPG or PNG and saved to AppData/generated/jpg/
  4. Application triggers a file download of the generated image to the user's local machine
  5. Application opens WhatsApp Web (https://web.whatsapp.com) in the default browser
  6. User manually attaches the downloaded image and sends it in WhatsApp; application does not send automatically
- Separate image templates for Wax Work Order card and Stone Setting Work Order card
- Image card layout is configurable (business logo position, color scheme) via Settings
- All image generation is 100% local/offline; internet required only for opening WhatsApp Web
- Configurable message templates with placeholders remain available for optional text copy: {{party}}, {{pattern}}, {{orderQuantity}}, {{finishedPieces}}, {{treeSize}}, {{waxTrees}}, {{stoneTable}}
- Default Wax template and Stone Setting template provided; editable in Settings

### 5.13 Reports

Reports: Order Report, Customer Report, Pattern Usage Report, Stone Consumption Report, Wax Production Report, Karigar Work Report, Pending Orders, Completed Orders, Date-wise, Customer-wise, Pattern-wise

**Filters (where applicable):** date range, customer, order, pattern, status, karigar, category

**Stone Consumption Report columns:** Stone Category, Stone, Size, Shape, Qty/Piece, Finished Pieces, Required Quantity

**Export formats:** PDF (with business logo, details, title, date, filters, data, totals), Excel/XLSX (with business name, logo where practical, title, date, filters, data, totals, professional formatting), CSV

### 5.14 Backup & Restore

**Functions:** Backup Now, Restore Backup (with confirmation dialog), Choose Backup Folder, Automatic Backup (triggered if last backup > 24 hours), Backup History, Database Health check

**Backup filename format:** SilverERP_Backup_YYYY-MM-DD_HHmmss.db

**Configurable:** backup folder path, retention settings

### 5.15 Settings

- Business info: Name, Logo, Address, City, State, Country, Mobile, WhatsApp, Email, GST Number, Other Info
- Change login credentials (User ID + Password)
- Message templates editor (Wax and Stone Setting templates with placeholder support)
- WhatsApp image card layout configuration (logo position, color scheme)
- Rounding mode: Ceiling (default) / Floor / Round
- Backup folder path
- Categories management: item categories, stone categories (Micro and AD)

### 5.16 Activity Log

Records: Login, Customer created/edited, Pattern created/edited, Stone added/edited, Order created/edited, Status changed, Karigar assigned, PDF generated, JPG/PNG generated, WhatsApp opened, Backup created, Restore performed

Displayed in Dashboard recent activity and accessible as full log view.

### 5.17 Global Search (Ctrl+K)

Searches across: Customers, Patterns, Orders, Stones, Karigars, Order Numbers, Mobile Numbers
Fast SQLite full-text queries; debounced input

---

## 6. UI/UX Requirements — Native Desktop Application Conventions

The application must feel and behave like a native Windows desktop ERP, not a web application with popup dialogs.

### 6.1 Core Desktop Navigation Paradigm

- All form views (create, edit, detail) open as full-page views or dedicated side panels within the main application window — NOT as Dialog/Modal popups
- Navigation follows a panel-based layout: left sidebar for module navigation, main content area for list/master views, right or full-width panel for detail/form views
- Transitions between list and detail/form views use in-place panel replacement or split-pane layouts, not overlays
- The application window always shows meaningful content in all visible areas; no content is obscured by floating overlays for primary workflows

### 6.2 Layout Structure

- **Main Shell:** fixed left sidebar (collapsible) + top bar + main content area
- **List Views:** master list occupies the main content area with toolbar (Add, Filter, Export, Search) above the table
- **Detail/Form Views:** open as a full-page replacement of the main content area, with a breadcrumb trail and Back button to return to the list; OR as a persistent right-side detail panel in a split-pane layout where the list remains visible on the left
- **Split-Pane Option:** for modules such as Customers, Patterns, Karigars — list on left, detail panel on right; selecting a record updates the right panel inline without navigation
- **New/Edit Forms:** open as a dedicated full-page form view with a top toolbar containing Save, Cancel, and relevant action buttons; no modal overlays

### 6.3 Desktop ERP Conventions

- **Toolbars:** each page/view has a contextual toolbar with relevant actions (Save, Cancel, Edit, Delete, Export, Print, Generate Image, Share)
- **Status Bar:** application-level status bar at the bottom of the window showing current user, database status, last backup time, and brief status messages
- **Inline Editing:** where appropriate (e.g. order table rows, stone configuration rows), support inline cell editing directly in the table without opening a separate form
- **Dense Information Display:** tables and detail views display maximum relevant information with compact row heights and efficient use of screen space; avoid excessive whitespace
- **Breadcrumb Navigation:** all detail and form pages show a breadcrumb trail (e.g. Orders > ORD-2026-0001 > Edit) with clickable segments
- **Keyboard Navigation:** full keyboard navigation support; Tab through form fields, Enter to confirm, Esc to cancel/go back (not close modal)
- **Context Menus:** right-click context menus on table rows for common actions (Edit, View, Duplicate, Delete, Change Status, Generate Image)
- **Resizable Panels:** split-pane dividers are draggable to resize list and detail panels

### 6.4 Confirmation & Feedback

- Destructive actions (delete, deactivate, restore database, cancel order) use an inline confirmation bar or a small non-blocking confirmation panel within the current view — not a floating modal overlay
- Toast notifications for non-critical feedback (save success, export complete, image generated) appear in the status bar or as a non-intrusive corner notification
- Form validation errors display inline next to the relevant field, not in a popup dialog

### 6.5 Additional UI Requirements

- Theme: light mode, premium desktop ERP look and feel, jewellery/manufacturing-inspired
- Typography: professional, modern; icons throughout
- Components: cards, tables with horizontal scroll, status badges, tooltips, smooth subtle animations, excellent spacing, visual hierarchy
- Responsive to window sizes: 1366x768, 1440x900, 1920x1080, 2560x1440
- Empty states with action buttons in all modules
- Keyboard shortcuts: Ctrl+K = Global Search, Ctrl+N = New, Ctrl+S = Save, Ctrl+P = Print, Esc = Cancel/Go Back
- No broken layouts, text overflow, overlapping elements, cropped views, or broken navigation
- Error messages: user-friendly (e.g. \"Unable to save this order. Please check the entered information.\"); technical errors stored in local logs only
- Input validation: required fields, positive weights/quantities/tree size, no duplicate pattern numbers/customer IDs/order numbers, mobile number format

---

## 7. Business Rules & Logic

### 7.1 Key Definitions

| Term                 | Definition                                                               |
| -------------------- | ------------------------------------------------------------------------ |
| Order Quantity       | What customer requested (grams or pieces)                                |
| Finished Pieces      | Jewellery pieces represented by order                                    |
| Pattern Weight       | Expected weight of one finished piece (grams)                            |
| Tree Size            | Number of finished pieces per one wax tree (manually entered on pattern) |
| Wax Trees Required   | Finished Pieces / Tree Size (ceiling default)                            |
| Stone Qty per Piece  | Stones required for one finished piece                                   |
| Total Stone Quantity | Finished Pieces x Stone Qty per Piece                                    |
| Expected Weight      | Pieces x Pattern Weight (informational only for piece orders)            |

### 7.2 Order Snapshot Rule

At order creation, snapshot of pattern data (Pattern Number, Pattern Name, Pattern Weight, Tree Size, Stone Configuration, Stone Qty per Piece) is stored immutably in order_calculations / order_item_stones tables. Subsequent edits to Pattern Master do not affect existing orders.

### 7.3 Rounding Rule

Theoretical Finished Pieces (decimal) is always displayed. Manufacturing Quantity applies configurable rounding (Ceiling default). Wax Trees always use ceiling unless overridden.

### 7.4 Stone Calculation Rule

Stone Required = Finished Pieces x Stone Qty per Piece. Never calculated from wax tree count or order grams directly.

### 7.5 Order Number Uniqueness

ORD-YYYY-XXXX auto-incremented per year; no duplicates; duplicate order creates new number.

### 7.6 Automatic Backup

On application start, if last backup timestamp > 24 hours ago, trigger automatic backup to configured folder.

### 7.7 Demo Data

Optional \"Load Demo Data\" action (not auto-inserted). Demo includes: Customers (ABC Jewellers, Rajesh Jewellers), Patterns (P-9001: weight 0.50g, tree size 10, stones 1.30mmx2 + 1.60mmx4 + 1.90mmx1 + AD Oval 3x2mmx1; P-9002), Stones (Micro 1.30mm, 1.60mm, 1.90mm; AD Oval 3x2mm), Karigars (Demo Wax Karigar, Demo Stone Karigar).

---

## 8. Database Schema (SQLite, normalized)

**Tables:** users, business_settings, app_settings, customers, customer_contacts, categories, subcategories, stones, stone_categories, stone_sizes, stone_shapes, items, item_images, item_stones, orders, order_items, order_item_stones, order_calculations, order_stone_requirements, karigars, karigar_types, karigar_assignments, work_orders, work_order_items, order_status_history, attachments, activity_logs, message_templates, backups

**Constraints:** primary keys, foreign keys, indexes on frequently queried columns, unique constraints (order numbers, pattern numbers, customer IDs), timestamps (created_at, updated_at), soft deletion (is_deleted / is_active flags) where appropriate

**Migrations:** versioned migrations; application updates must never destroy existing business data

**Future-ready architecture:**

- Inventory tables ready for: Silver, Stones, Wax, Finished Goods, Karigar Material, Material Issue/Return
- Billing tables ready for: Quotations, Invoices, Payments, Customer Ledger, Purchase, Sales, GST

---

## 9. Security

- bcrypt password hashing
- Protected routes (redirect to login if not authenticated)
- SQL-safe ORM queries
- Input validation on all forms
- Safe file handling and safe filenames
- Electron IPC: contextIsolation: true, nodeIntegration: false
- Secure IPC APIs for: DB operations, Files, PDF, JPG/PNG image generation, Excel, Backup, Restore, Settings, WhatsApp URL opening
- No arbitrary filesystem access exposed to renderer

---

## 10. Performance Requirements

- Must remain responsive with 10,000+ customers, 50,000+ patterns, 100,000+ orders
- SQLite indexes on all frequently queried columns
- Pagination on all list views
- Debounced search inputs
- Virtualized tables for large datasets
- Lazy loading where applicable

---

## 11. Offline Capability

All of the following must work with internet fully disconnected:
Login, Add/Edit Customer, Add/Edit Stone, Add/Edit Pattern, Configure Stone Configuration, Create/Edit Order, All calculations (finished pieces, wax trees, stones), Generate PDF, Generate JPG/PNG image, Export Excel, Search (global and per-module), All Reports, Backup, Restore

Internet required only for: WhatsApp sharing (opening WhatsApp Web in browser)

---

## 12. Acceptance Criteria

1. Complete first-run setup wizard (6 steps) and reach Dashboard
2. Add customer \"ABC Jewellers\" and verify it appears in customer list and autocomplete
3. Add stones: Micro 1.30mm, 1.60mm, 1.90mm and AD Oval 3x2mm
4. Create pattern P-9001 (weight 0.50g, tree size 10, stone config: 1.30mmx2 + 1.60mmx4 + 1.90mmx1 + AD Oval x1 = 8/piece)
5. Create gram order for ABC Jewellers: 200g of P-9001; verify Finished Pieces=400, Wax Trees=40, Total Stones=3,200
6. Create piece order for ABC Jewellers: 500 pcs of P-9001; verify Finished Pieces=500, Expected Weight=250g, Wax Trees=50, Total Stones=4,000
7. Assign Wax Karigar to order; generate Wax Work Order PDF; generate Wax Work Order JPG/PNG image card (with business logo, order details, karigar info); verify image is saved to AppData/generated/jpg/ and download is triggered; verify WhatsApp Web opens in browser
8. Assign Stone Setting Karigar; generate Stone Work Order PDF; generate Stone Work Order JPG/PNG image card; verify image download and WhatsApp Web opens
9. Export order report to Excel; verify business name, logo, data, and totals present
10. Search for \"ABC Jewellers\" via Ctrl+K global search and navigate to customer detail
11. Perform Backup Now; verify backup file created as SilverERP_Backup_YYYY-MM-DD_HHmmss.db
12. Close application, disconnect internet, reopen, login, verify all data intact and all offline functions operational
13. Open any create/edit form (e.g. New Customer, Edit Pattern, New Order) and verify it opens as a full-page view or side panel — not as a modal/dialog popup
14. Verify breadcrumb navigation is present on all detail and form pages and Back navigation returns to the list view without data loss
15. Verify the application status bar is visible at the bottom of the window showing current user, database status, and last backup time

---

## 13. Out of Scope (Not Implemented in This Version)

- Silver/Stone/Wax/Finished Goods inventory management
- Quotations, Invoices, Payments, Customer Ledger, GST billing
- Multi-user roles and permissions (architecture ready, not activated)
- Cloud backup or multi-PC synchronization
- Karigar payment tracking
- Production cost calculation
- Stock transfers
- Purchase and sales modules
- Automatic WhatsApp message sending (user must press Send manually in WhatsApp Web)
- Direct WhatsApp text-link sharing (replaced by image card sharing)
- Any paid cloud service, hosted database, or subscription feature
