# BUILD A COMPLETE WINDOWS DESKTOP APPLICATION — SILVER JEWELLERY MANUFACTURING ERP

Build a complete, production-ready **Windows Desktop Application** for a silver jewellery manufacturing business.

This is NOT a simple website, dashboard mockup, CRUD demo, or browser application.

Build a real, installable Windows desktop ERP application that can be packaged into a `.exe`.

The application must be:

- Professional
- Premium
- Modern
- Highly attractive
- Extremely user-friendly
- Fast
- Offline-first
- Fully responsive for different desktop/laptop resolutions
- Easy for non-technical users
- Secure
- Maintainable
- Modular
- Lifetime-free for core functionality
- Local database based
- No mandatory server
- No mandatory hosting
- No mandatory cloud database
- No monthly subscription
- No paid WhatsApp API

The application is for managing silver jewellery patterns/items, stones, customers/parties, orders, wax manufacturing, stone setting, karigars, calculations, reports, PDFs, JPG work slips and WhatsApp sharing.

---

# 1. MOST IMPORTANT REQUIREMENT — 100% LOCAL / LIFETIME-FREE

The core application MUST NOT depend on any paid or hosted backend.

Do NOT use:

- Firebase
- Supabase
- AWS
- Azure
- Google Cloud
- MongoDB Atlas
- Hosted MySQL
- Hosted PostgreSQL
- VPS
- Paid server
- Paid hosting
- SaaS database
- Paid API
- Subscription service

Use a local SQLite database.

Recommended technology:

- Electron
- React
- TypeScript
- Vite
- SQLite
- Prisma ORM or Drizzle ORM
- Tailwind CSS
- shadcn/ui
- Recharts
- Electron Builder

Architecture:

Windows Desktop App
↓
Electron
↓
React UI
↓
Secure IPC
↓
SQLite
↓
Local PC storage

The application must work completely offline for all core functionality.

The database must be stored locally on the user's computer.

No internet connection should be required for:

- Login
- Customer management
- Pattern management
- Stone management
- Order management
- Calculations
- Karigar management
- Reports
- PDF generation
- JPG generation
- Excel export
- Backup
- Restore
- Searching
- Viewing history

Internet should only be required for optional WhatsApp sharing/opening.

---

# 2. WINDOWS DESKTOP APPLICATION

Build a genuine Electron desktop application.

It must generate a Windows installer such as:

SilverJewelleryERP-Setup.exe

Include:

- Installation
- Desktop shortcut
- Start Menu shortcut
- Uninstaller
- Application icon
- Proper application name
- Version number

The application must not simply open a website in Chrome.

---

# 3. APPLICATION NAME

Use a professional configurable application name.

Default:

Silver Jewellery ERP

Allow the business name to be configured from Settings.

The title bar and generated reports should use the configured business name.

---

# 4. PREMIUM UI/UX

The application must have a premium jewellery/manufacturing ERP design.

Do NOT make it look like a generic admin template.

Design style:

- Premium
- Elegant
- Clean
- Modern
- Professional
- Manufacturing-focused
- Jewellery-inspired
- Easy to understand
- Minimal unnecessary elements

Use:

- Modern typography
- Professional icons
- Cards
- Tables
- Status badges
- Tooltips
- Toast notifications
- Confirmation dialogs
- Search
- Filters
- Tabs
- Drawers
- Modals
- Smooth but subtle animations
- Excellent spacing
- Proper visual hierarchy

The application must be very easy for a normal business user to operate.

---

# 5. RESPONSIVE DESKTOP UI

The UI must work correctly on:

- 1366×768
- 1440×900
- 1920×1080
- 2560×1440
- Laptop displays
- Smaller Windows displays

Tables should use horizontal scrolling when necessary.

Do not allow:

- Broken layouts
- Text overflow
- Overlapping buttons
- Cropped modals
- Broken navigation

Use responsive grids and flexible layouts.

---

# 6. APPLICATION NAVIGATION

Use a professional left sidebar.

Main navigation:

1. Dashboard
2. Customers / Parties
3. Items / Patterns
4. Stones
5. Orders
6. Karigars
7. Production
8. Reports
9. Backup & Restore
10. Settings

Top navigation:

- Global Search
- Notifications
- Current User
- Settings
- Window controls where appropriate

Sidebar should be collapsible.

---

# 7. LOGIN

Create a professional login screen.

Fields:

- User ID
- Password
- Remember Me

Use secure password hashing.

Do not expose a hard-coded production password.

On first launch, show setup wizard to create:

- User ID
- Password

Allow changing credentials from Settings.

Since this is initially a single-user application, use one administrator account.

Keep architecture ready for future multi-user roles.

---

# 8. FIRST-RUN SETUP WIZARD

On first launch:

Step 1:
Business Information

Step 2:
Create Login

Step 3:
Upload Business Logo

Step 4:
Configure Basic Categories

Step 5:
Choose Backup Folder

Step 6:
Finish Setup

Then open Dashboard.

---

# 9. BUSINESS SETTINGS

Settings should contain:

Business Name
Logo
Address
City
State
Country
Mobile
WhatsApp Number
Email
GST Number
Other Information

These details should automatically appear on:

- PDF
- JPG
- Print
- Reports

---

# 10. DASHBOARD

Create an attractive dashboard.

Show cards:

- Total Customers
- Total Patterns
- Total Stones
- Active Orders
- Pending Orders
- Orders in Production
- Completed Orders
- Wax Work Pending
- Stone Setting Pending
- Today's Orders
- Monthly Orders

Charts:

- Orders by month
- Orders by status
- Orders by customer
- Grams ordered
- Pieces ordered
- Stone consumption
- Production status

Recent activity:

- Customer added
- Pattern added
- Stone added
- Order created
- Order assigned
- Order completed
- Backup completed

---

# 11. CUSTOMER / PARTY MANAGEMENT

Create complete Customer / Party Master.

Fields:

- Customer ID
- Party Name
- Contact Person
- Mobile Number
- Alternate Number
- WhatsApp Number
- Address
- City
- State
- Email
- GST Number
- Notes
- Active/Inactive

Allow:

- Add
- Edit
- View
- Search
- Filter
- Delete/deactivate
- Export

Search by:

- Party Name
- Mobile
- WhatsApp
- Customer ID

Customer detail page:

- Customer information
- Total orders
- Pending orders
- Completed orders
- Total grams
- Total pieces
- Order history
- Recent orders
- Notes

---

# 12. STONE MODULE

When the user clicks:

## STONES

Show two large attractive cards/buttons:

### MICRO

Micro Diamond Collection

### AD DIAMONDS

AD Diamond Collection

These must be visually prominent.

---

# 13. MICRO DIAMOND MASTER

Create Micro Diamond management.

Fields:

- Stone ID
- Stone Name
- Category
- Size
- Shape
- Grade/Type
- Colour
- Individual Weight if required
- Weight Unit
- Stones per Gram if required
- Supplier
- Notes
- Active/Inactive

Allow unlimited sizes.

Examples:

1.00 mm
1.10 mm
1.20 mm
1.30 mm
1.40 mm
1.50 mm
1.60 mm
1.70 mm
1.80 mm
1.90 mm
2.00 mm

These must NOT be hard-coded.

The user must be able to add custom sizes.

---

# 14. AD DIAMOND MASTER

Fields:

- Stone ID
- Stone Name
- Category
- Shape
- Size
- Length
- Width
- Weight
- Supplier
- Notes
- Active/Inactive

Allow custom shapes:

- Oval
- Round
- Square
- Pear
- Marquise
- Princess
- Custom

Example:

AD Oval
3 × 2 mm

Allow adding unlimited custom AD diamond sizes/shapes.

---

# 15. STONE CATEGORY MANAGEMENT

Create configurable categories.

Separate categories for:

- Micro
- AD Diamonds

Allow:

- Add
- Edit
- Deactivate
- Delete if unused

---

# 16. ITEM / PATTERN MASTER

Create complete Pattern / Item Master.

Fields:

- Pattern ID
- Pattern Number
- Pattern Name
- Category
- Subcategory
- Pattern Size
- Weight per Finished Piece
- Weight Unit
- Tree Size
- Stone Configuration
- Total Stones per Piece
- Image
- Multiple Images
- Notes
- Active/Inactive
- Created Date
- Updated Date

Example:

Pattern Number:
P-9001

Pattern Name:
Designer Silver Pendant

Weight:
0.50 gram

Tree Size:
10

---

# 17. IMPORTANT — TREE SIZE

Tree Size means:

**How many finished pieces can be produced from one wax tree.**

Examples:

- 2 pieces/tree
- 3 pieces/tree
- 4 pieces/tree
- 5 pieces/tree
- 10 pieces/tree
- etc.

This value must be manually entered while creating the pattern.

It must automatically appear in orders.

Do NOT confuse:

Tree Size

with

Number of finished pieces.

---

# 18. PATTERN IMAGE

Allow uploading:

- JPG
- JPEG
- PNG
- WEBP

Store images locally.

No cloud storage.

Allow:

- Preview
- Replace
- Remove
- Multiple images if required

---

# 19. PATTERN STONE CONFIGURATION

Every pattern can contain multiple stone types.

For each stone configuration store:

- Stone category
- Stone type
- Stone size
- Shape
- Quantity per finished piece

Example P-9001:

| Stone |        Size | Quantity/Piece |
| ----- | ----------: | -------------: |
| Micro |     1.30 mm |              2 |
| Micro |     1.60 mm |              4 |
| Micro |     1.90 mm |              1 |
| AD    | Oval 3×2 mm |              1 |

Total:

8 stones per finished piece.

The system must automatically calculate total stones per piece.

---

# 20. NEW ORDER

Create a professional New Order page.

First section:

## SELECT PARTY

Provide a powerful autocomplete search.

User types:

Rajesh

Show matching customers.

When selected, automatically populate:

- Party Name
- Mobile
- WhatsApp
- Address
- Customer ID

Do not make the user re-enter customer information.

---

# 21. ORDER TYPE

Provide three large selectable options:

### GRAMS

### PIECES

### GRAMS + PIECES

Use premium cards/buttons.

---

# 22. ORDER TABLE

After selecting order type, show an Excel-style editable table.

Columns:

1. Sr. No.
2. Pattern No.
3. Pattern Name
4. Pattern Size
5. Pattern Weight
6. Tree Size
7. Order Quantity
8. Quantity Type
9. Finished Pieces
10. Wax Trees Required
11. Total Stones
12. Status
13. Actions

For GRAMS:

Order Quantity means grams.

For PIECES:

Order Quantity means pieces.

For GRAMS + PIECES:

Each row can independently choose:

- Grams
- Pieces

---

# 23. PATTERN AUTOCOMPLETE

When typing:

P-9001

search Items / Patterns.

Support:

- P-9001
- p9001
- 9001
- Pattern name

When selected automatically populate:

- Pattern Number
- Pattern Name
- Pattern Size
- Weight per Piece
- Tree Size
- Stone Configuration
- Stones per Piece
- Pattern Image

---

# 24. CRITICAL CALCULATION LOGIC

THIS IS EXTREMELY IMPORTANT.

Do not mix:

- Order grams
- Order pieces
- Finished pieces
- Tree size
- Wax tree quantity
- Stone quantity

They are separate concepts.

---

# 25. GRAM-BASED ORDER CALCULATION

Example:

Order:

200 grams

Pattern:

P-9001

Pattern weight:

0.50 gram/piece

Tree size:

10 pieces/tree

Calculation:

200 ÷ 0.50 = 400 finished pieces

Then:

400 ÷ 10 = 40 wax trees

Therefore:

Order = 200 g

Finished Pieces = 400

Wax Trees Required = 40

---

# 26. PIECE-BASED ORDER CALCULATION

Example:

Customer orders:

500 pieces

Pattern:

P-9001

Pattern weight:

0.50 gram

Tree size:

10 pieces/tree

Calculation:

Finished Pieces = 500

Then:

500 ÷ 10 = 50 wax trees

Therefore:

Order = 500 pieces

Finished Pieces = 500

Wax Trees Required = 50

IMPORTANT:

Do NOT calculate:

500 × 0.50

and then convert back to pieces.

For piece-based orders, the customer has directly requested 500 finished pieces.

Use 500 as the finished-piece quantity.

Pattern weight can be used to calculate expected total silver weight:

500 × 0.50 = 250 grams expected weight

But it must NOT change the requested piece quantity.

---

# 27. GRAMS + PIECES ORDER

Each row can have its own quantity type.

Example:

| Pattern | Type   | Order Qty | Finished Pieces | Wax Trees |
| ------- | ------ | --------: | --------------: | --------: |
| P-9001  | Grams  |     200 g |             400 |        40 |
| P-9002  | Pieces |   500 pcs |             500 |        50 |

For GRAM:

Finished Pieces =
Order Grams ÷ Pattern Weight

For PIECES:

Finished Pieces =
Entered Piece Quantity

Then:

Wax Trees =
Finished Pieces ÷ Tree Size

---

# 28. TREE CALCULATION

Tree calculation is ONLY used to determine how many wax trees need to be crafted.

Formula:

Wax Trees Required =
Finished Pieces ÷ Tree Size

Example:

500 finished pieces

Tree Size = 10

500 ÷ 10 = 50 trees

If the result is not a whole number, apply configurable manufacturing rounding.

Example:

503 pieces ÷ 10 = 50.3

Actual Wax Trees Required = 51

Allow configurable rounding:

- Ceiling
- Floor
- Round

Default manufacturing setting should be:

Ceiling

---

# 29. STONE CALCULATION — CRITICAL

Stone calculation is ALWAYS based on FINISHED PIECES.

It is NOT based on wax tree quantity.

It is NOT based on order grams directly.

It is NOT based on number of trees.

Formula:

Stone Required =
Finished Pieces × Stone Quantity Per Piece

---

# 30. STONE CALCULATION EXAMPLE — PIECE ORDER

Pattern P-9001:

1.30 mm Micro = 2/piece

1.60 mm Micro = 4/piece

1.90 mm Micro = 1/piece

AD Oval 3×2 mm = 1/piece

Total = 8 stones/piece

Customer order:

500 pieces

Tree Size:

10

Wax Trees:

500 ÷ 10 = 50

Stone calculation:

1.30 mm:

500 × 2 = 1,000

1.60 mm:

500 × 4 = 2,000

1.90 mm:

500 × 1 = 500

AD Oval:

500 × 1 = 500

Total:

4,000 stones.

The 50 wax trees MUST NOT be used to calculate stones.

---

# 31. STONE CALCULATION EXAMPLE — GRAM ORDER

Order:

200 grams

Pattern weight:

0.50 g/piece

Tree Size:

10

Finished Pieces:

200 ÷ 0.50 = 400

Wax Trees:

400 ÷ 10 = 40

Stone calculation is based on 400 finished pieces:

1.30 mm:

400 × 2 = 800

1.60 mm:

400 × 4 = 1,600

1.90 mm:

400 × 1 = 400

AD Oval:

400 × 1 = 400

Total:

3,200 stones.

---

# 32. STONE SUMMARY TABLE

Every order must have:

| Stone Category | Stone Size | Shape | Qty/Piece | Finished Pieces | Required Qty |
| -------------- | ---------- | ----- | --------: | --------------: | -----------: |
| Micro          | 1.30 mm    | Round |         2 |             500 |        1,000 |
| Micro          | 1.60 mm    | Round |         4 |             500 |        2,000 |
| Micro          | 1.90 mm    | Round |         1 |             500 |          500 |
| AD             | 3×2 mm     | Oval  |         1 |             500 |          500 |
| **TOTAL**      |            |       |     **8** |                 |    **4,000** |

Make this look like a professional Excel/ERP table.

---

# 33. CALCULATION ENGINE

Create a centralized calculation service.

Do NOT put calculations directly into React UI components.

The calculation engine must be reusable by:

- Order page
- Order details
- Reports
- Wax work orders
- Stone work orders
- PDF
- JPG
- Excel
- WhatsApp message

Use decimal-safe arithmetic.

Do not rely blindly on JavaScript floating-point calculations.

---

# 34. ROUNDING

Do not silently round theoretical calculations.

Example:

200 ÷ 0.55 = 363.636...

Display:

Theoretical Finished Pieces = 363.636

Then provide:

Manufacturing Quantity

with configurable:

- Floor
- Round
- Ceiling

Default:

Ceiling

---

# 35. EXPECTED WEIGHT FOR PIECE ORDERS

For piece orders, pattern weight can calculate expected total weight.

Example:

500 pieces × 0.50 g = 250 g expected weight.

Show:

Requested Pieces = 500

Pattern Weight = 0.50 g

Expected Weight = 250 g

This is informational and MUST NOT change the requested 500 pieces.

---

# 36. ORDER DETAIL PAGE

Every order must have a complete detail page.

Sections:

### Order Information

- Order Number
- Party
- Date
- Status

### Pattern Details

### Quantity Calculation

### Finished Pieces

### Wax Tree Calculation

### Stone Requirement

### Karigar Assignment

### Production Status

### Attachments

### Notes

### Activity History

---

# 37. ORDER STATUS

Statuses:

- Draft
- Confirmed
- Pending
- Assigned
- Wax In Progress
- Wax Completed
- Stone Setting Pending
- Stone Setting In Progress
- Stone Setting Completed
- Production Completed
- Ready
- Delivered
- Cancelled

Track status history.

---

# 38. ORDER NUMBER

Automatically generate:

ORD-2026-0001

ORD-2026-0002

etc.

No duplicates.

Allow prefix customization.

---

# 39. KARIGAR MANAGEMENT

Create Karigar Master.

Fields:

- Karigar ID
- Name
- Mobile
- WhatsApp
- Type
- Address
- Notes
- Active/Inactive

Types:

- Wax Karigar
- Stone Setting Karigar
- Other

Allow custom types.

---

# 40. WAX KARIGAR ASSIGNMENT

From an order:

Click:

Assign to Wax Karigar

Select karigar.

Generate Wax Work Order.

Wax Karigar should receive only necessary information.

Example:

Party:
ABC Jewellers

Pattern:
P-9001

Order:
200 g

Pattern Weight:
0.50 g

Finished Pieces:
400

Tree Size:
10

Wax Trees Required:
40

Do not show unnecessary financial/internal information.

---

# 41. WAX KARIGAR WORK SLIP

Generate:

- PDF
- JPG
- Print

Include:

- Business logo
- Party
- Pattern number
- Pattern name
- Order number
- Order quantity
- Quantity type
- Finished pieces
- Pattern weight
- Tree size
- Wax trees required
- Notes
- Date

Optimize JPG for WhatsApp.

---

# 42. STONE SETTING KARIGAR ASSIGNMENT

Assign order to Stone Setting Karigar.

Stone Karigar should receive:

- Party
- Pattern
- Finished Pieces
- Stone category
- Stone size
- Shape
- Quantity per piece
- Total required quantity
- Notes

Do not expose unnecessary information.

---

# 43. STONE KARIGAR WORK SLIP

Example:

STONE SETTING WORK ORDER

Party:
ABC Jewellers

Pattern:
P-9001

Finished Pieces:
500

Stone Requirement:

1.30 mm Micro = 1,000

1.60 mm Micro = 2,000

1.90 mm Micro = 500

AD Oval 3×2 = 500

TOTAL = 4,000

Generate:

- PDF
- JPG
- Print

---

# 44. WHATSAPP SHARING

Do NOT use WhatsApp Business API.

Do NOT require:

- Meta API
- WhatsApp Business API
- Paid WhatsApp provider
- Third-party messaging API

Use the user-facing WhatsApp URL method.

Example:

https://wa.me/<number>?text=<encoded-message>

When clicking:

Share on WhatsApp

the application should:

1. Generate required message.
2. Generate JPG/PDF if selected.
3. Open WhatsApp Web or WhatsApp.
4. Pre-fill the message.
5. Allow user to select/confirm recipient.
6. User manually presses Send.

IMPORTANT:

Do not claim that a normal WhatsApp URL can automatically send the message silently.

The final send action must remain under user control.

---

# 45. WHATSAPP SHARE OPTIONS

Provide:

### Share Text

### Open WhatsApp

### Generate JPG + Open WhatsApp

### Generate PDF

The user can choose what to share.

---

# 46. MESSAGE TEMPLATES

Create configurable templates.

Wax template:

Wax Work Order

Party: {{party}}

Pattern: {{pattern}}

Order: {{orderQuantity}}

Finished Pieces: {{finishedPieces}}

Tree Size: {{treeSize}}

Wax Trees: {{waxTrees}}

Stone template:

Stone Setting Work Order

Party: {{party}}

Pattern: {{pattern}}

Finished Pieces: {{finishedPieces}}

{{stoneTable}}

Allow editing templates in Settings.

---

# 47. ITEMS / PATTERN CATEGORIES

Allow configurable categories.

Examples:

- Ring
- Pendant
- Earring
- Bracelet
- Chain
- Necklace
- Nose Pin
- Other

Allow:

- Add
- Edit
- Deactivate

Do not hard-code categories.

---

# 48. SEARCH

Global search must support:

Customers
Patterns
Orders
Stones
Karigars
Order Numbers
Mobile Numbers

Use fast SQLite queries.

---

# 49. FILTERS

Major tables must have:

- Search
- Date filter
- Status filter
- Customer filter
- Pattern filter
- Category filter
- Karigar filter

Add:

Clear Filters

---

# 50. REPORTS

Create:

### Order Report

### Customer Report

### Pattern Usage Report

### Stone Consumption Report

### Wax Production Report

### Karigar Work Report

### Pending Orders

### Completed Orders

### Date-wise Report

### Customer-wise Report

### Pattern-wise Report

---

# 51. STONE CONSUMPTION REPORT

Columns:

- Stone Category
- Stone
- Size
- Shape
- Quantity/Piece
- Finished Pieces
- Required Quantity

Filters:

- Date
- Customer
- Order
- Pattern

Export:

- PDF
- Excel
- CSV

---

# 52. EXCEL EXPORT

Use XLSX.

Exports must contain:

- Business Name
- Logo where practical
- Report Title
- Date
- Filters
- Data
- Totals

Use professional formatting.

---

# 53. PDF EXPORT

Generate professional PDFs.

Include:

- Business logo
- Business details
- Order number
- Date
- Customer
- Pattern
- Quantities
- Calculations
- Stone table
- Totals
- Notes

Do not make PDFs look like raw browser printouts.

---

# 54. JPG WORK SLIPS

Create mobile-friendly JPGs.

Wax JPG:

SILVER MANUFACTURING
WAX WORK ORDER

Party:
ABC Jewellers

Pattern:
P-9001

Order:
200 g

Finished Pieces:
400

Tree Size:
10

Wax Trees:
40

Stone JPG:

STONE SETTING WORK ORDER

Party:
ABC Jewellers

Pattern:
P-9001

Finished Pieces:
500

1.30 MM MICRO:
1000

1.60 MM MICRO:
2000

1.90 MM MICRO:
500

AD OVAL 3×2:
500

TOTAL:
4000

Use a clean vertical format optimized for WhatsApp.

---

# 55. ATTACHMENTS

Allow local attachments on orders:

- Design images
- Reference images
- Production images
- Documents

Store locally.

---

# 56. ACTIVITY LOG

Record:

- Login
- Customer created
- Customer edited
- Pattern created
- Pattern edited
- Stone added
- Order created
- Order edited
- Status changed
- Karigar assigned
- PDF generated
- JPG generated
- WhatsApp opened
- Backup created
- Restore performed

---

# 57. BACKUP & RESTORE

Create dedicated Backup & Restore module.

Functions:

- Backup Now
- Restore Backup
- Choose Backup Folder
- Automatic Backup
- Backup History
- Database Health

Automatic backup:

If last backup > 24 hours:

Create backup.

Example:

SilverERP_Backup_2026-08-20_231500.db

Allow retention settings.

---

# 58. DATABASE

Use normalized SQLite schema.

Suggested tables:

users
business_settings
app_settings
customers
customer_contacts
categories
subcategories
stones
stone_categories
stone_sizes
stone_shapes
items
item_images
item_stones
orders
order_items
order_item_stones
order_calculations
order_stone_requirements
karigars
karigar_types
karigar_assignments
work_orders
work_order_items
order_status_history
attachments
activity_logs
message_templates
backups

Use:

- Primary keys
- Foreign keys
- Indexes
- Unique constraints
- Timestamps
- Soft deletion where appropriate

---

# 59. ORDER SNAPSHOT — VERY IMPORTANT

When an order is created, store a snapshot of the relevant Pattern data.

For example:

- Pattern Number
- Pattern Name
- Pattern Weight
- Tree Size
- Stone Configuration
- Stone Quantity Per Piece

This is necessary because a pattern may change later.

Old orders must NOT change when the Pattern Master is edited.

Example:

P-9001 today has:

1.30 mm = 2

Tomorrow the pattern is changed to:

1.30 mm = 3

Old orders must still show:

1.30 mm = 2

New orders should use:

1.30 mm = 3.

---

# 60. INVENTORY ARCHITECTURE

Make the application architecture ready for future inventory.

Potential future inventory:

- Silver
- Stones
- Wax
- Finished Goods
- Karigar Material
- Material Issue
- Material Return

Initial version may keep inventory simple, but database architecture must support future expansion.

---

# 61. FUTURE BILLING ARCHITECTURE

Keep architecture ready for:

- Quotations
- Invoices
- Payments
- Customer Ledger
- Purchase
- Sales
- GST

Do not make initial application unnecessarily complicated.

---

# 62. EMPTY STATES

Every module should have professional empty states.

Example:

"No patterns added yet."

Button:

- Add Pattern

Do not show blank tables without explanation.

---

# 63. CONFIRMATION DIALOGS

Before:

- Delete
- Deactivate
- Restore database
- Cancel order
- Delete pattern
- Delete customer

show confirmation.

---

# 64. KEYBOARD SHORTCUTS

Implement:

Ctrl + K = Global Search

Ctrl + N = New

Ctrl + S = Save

Ctrl + P = Print

Esc = Close modal

---

# 65. PERFORMANCE

Optimize for:

10,000+ customers
50,000+ patterns
100,000+ orders

Use:

- SQLite indexes
- Pagination
- Debounced search
- Efficient queries
- Lazy loading
- Virtualized tables where useful

Application must remain responsive.

---

# 66. OFFLINE TEST

The following must work with internet completely disconnected:

- Login
- Add customer
- Add stone
- Add pattern
- Configure stones
- Create order
- Calculate finished pieces
- Calculate wax trees
- Calculate stones
- Generate PDF
- Generate JPG
- Export Excel
- Search
- Reports
- Backup
- Restore

Only WhatsApp sharing may require internet.

---

# 67. SECURITY

Use:

- Secure password hashing
- Protected routes
- SQL-safe ORM queries
- Input validation
- Safe file handling
- Safe filenames
- Secure Electron IPC

Electron configuration:

contextIsolation: true

nodeIntegration: false

Do not expose Node.js directly to React.

---

# 68. ELECTRON IPC

Create secure IPC APIs for:

- Database
- Files
- PDF
- JPG
- Excel
- Backup
- Restore
- Settings
- WhatsApp URL opening

Do not expose arbitrary filesystem access.

---

# 69. PROJECT STRUCTURE

Use modular structure.

Example:

src/
components/
pages/
layouts/
features/
customers/
items/
stones/
orders/
karigars/
production/
reports/
services/
calculations/
database/
hooks/
utils/
types/

electron/
main/
preload/
ipc/

Keep business logic separate from UI.

---

# 70. COMPONENTS

Create reusable components:

- DataTable
- SearchBar
- FilterBar
- CustomerSelector
- PatternSelector
- StoneSelector
- QuantityInput
- WeightInput
- StatusBadge
- CalculationCard
- StoneSummaryTable
- OrderSummary
- ImageUploader
- PDFPreview
- WhatsAppShareButton
- ConfirmationDialog
- EmptyState

---

# 71. VALIDATION

Validate:

- Required fields
- Positive weights
- Positive quantities
- Positive tree size
- Stone quantities
- Mobile numbers
- Duplicate pattern numbers
- Duplicate customer IDs
- Duplicate order numbers

Show friendly messages.

---

# 72. ERROR HANDLING

Do not show technical stack traces.

Show:

"Unable to save this order. Please check the entered information."

Store technical errors in local logs.

---

# 73. DATABASE MIGRATION

Use proper migrations.

Application updates must never destroy existing business data.

---

# 74. APPLICATION DATA LOCATION

Use an application data directory such as:

AppData/
database/
silver_erp.db
backups/
images/
attachments/
generated/
pdf/
jpg/
logs/

Do not store database inside the source-code folder.

---

# 75. DEMO DATA

Provide optional:

Load Demo Data

Demo:

Customers:

ABC Jewellers
Rajesh Jewellers

Patterns:

P-9001
P-9002

Stones:

Micro 1.30 mm
Micro 1.60 mm
Micro 1.90 mm
AD Oval 3×2 mm

Karigars:

Demo Wax Karigar
Demo Stone Karigar

Do not automatically insert demo data into production unless the user selects it.

---

# 76. DUPLICATE ORDER

Allow:

Duplicate Order

It should create a new Draft.

Never reuse the old order number.

---

# 77. ORDER PRINT MODES

Provide:

### FULL ORDER

Complete internal order details.

### WAX WORK ORDER

Only information required by Wax Karigar.

### STONE WORK ORDER

Only information required by Stone Setting Karigar.

---

# 78. ROLE-READY ARCHITECTURE

Current application:

Single User / Administrator.

Keep architecture ready for future:

- Admin
- Manager
- Operator
- Production
- Accounts

Do not require cloud functionality now.

---

# 79. CALCULATION EXAMPLES THAT MUST PASS

TEST 1 — GRAMS

Order = 200 g

Pattern Weight = 0.50 g

Tree Size = 10

Expected:

Finished Pieces = 400

Wax Trees = 40

If stones are:

2 + 4 + 1 + 1 = 8/piece

Total Stones:

400 × 8 = 3,200

---

TEST 2 — PIECES

Order = 500 pieces

Pattern Weight = 0.50 g

Tree Size = 10

Expected:

Finished Pieces = 500

Expected Weight = 250 g

Wax Trees = 50

Total Stones:

500 × 8 = 4,000

IMPORTANT:

Expected Weight of 250 g must NOT change the requested 500 pieces.

---

TEST 3 — GRAMS + PIECES

P-9001:

200 g

Weight = 0.50

Finished Pieces = 400

Tree Size = 10

Wax Trees = 40

P-9002:

500 pieces

Finished Pieces = 500

Tree Size = 10

Wax Trees = 50

Each row must calculate independently.

---

# 80. PRODUCTION WORKFLOW

Complete workflow:

Login

↓

Dashboard

↓

Add Customer

↓

Add Stone

↓

Add Pattern

↓

Configure Pattern Stones

↓

Set Pattern Weight

↓

Set Tree Size

↓

Create Order

↓

Select Party

↓

Select Order Type

↓

Select Pattern

↓

Enter Quantity

↓

Automatic Calculation

↓

Review Finished Pieces

↓

Review Wax Trees

↓

Review Stone Requirement

↓

Save Order

↓

Assign Wax Karigar

↓

Generate Wax Work Slip

↓

Generate JPG

↓

Open WhatsApp

↓

Assign Stone Karigar

↓

Generate Stone Work Slip

↓

Generate JPG

↓

Open WhatsApp

↓

Update Production Status

↓

Complete Order

↓

Reports / History

---

# 81. IMPORTANT BUSINESS RULE

The system must understand these definitions:

## Order Quantity

What customer requested.

Examples:

200 grams

or

500 pieces.

## Finished Pieces

Number of jewellery pieces represented by order.

For grams:

Order grams ÷ pattern weight.

For pieces:

Entered piece quantity.

## Pattern Weight

Expected weight of one finished piece.

## Tree Size

Number of finished pieces represented by one wax tree.

## Wax Trees Required

Finished Pieces ÷ Tree Size.

## Stone Quantity Per Piece

Number of stones required for one finished piece.

## Total Stone Quantity

Finished Pieces × Stone Quantity Per Piece.

---

# 82. NEVER MIX THESE VALUES

Do not confuse:

Order Grams

Order Pieces

Finished Pieces

Pattern Weight

Expected Weight

Tree Size

Wax Tree Quantity

Stone Quantity Per Piece

Total Stone Quantity

Each must be separately stored/displayed.

---

# 83. UI CALCULATION DISPLAY

For gram order:

ORDER

200 g

PATTERN WEIGHT

0.50 g/piece

FINISHED PIECES

400

TREE SIZE

10 pieces/tree

WAX TREES

40

TOTAL STONES

3,200

For piece order:

ORDER

500 pieces

PATTERN WEIGHT

0.50 g/piece

EXPECTED WEIGHT

250 g

FINISHED PIECES

500

TREE SIZE

10 pieces/tree

WAX TREES

50

TOTAL STONES

4,000

Make these values visually prominent.

---

# 84. FUTURE EXPANSION

Architecture should support future modules:

- Silver Inventory
- Stone Inventory
- Purchase
- Sales
- Billing
- Customer Ledger
- Payments
- Quotations
- GST
- Finished Goods
- Stock Transfers
- Production Cost
- Karigar Payments
- Reports
- Multi-user
- Cloud backup
- Multi-PC synchronization

But do NOT introduce any paid cloud requirement into the current version.

---

# 85. NO PLACEHOLDER FUNCTIONALITY

Every button must actually work.

Do NOT leave:

- Fake buttons
- Fake charts
- Fake CRUD
- Mock APIs
- Placeholder exports
- Non-functional search
- Non-functional calculations
- Static demo screens

The application must be fully functional.

---

# 86. TESTING

Create tests for:

- Gram calculation
- Piece calculation
- Mixed calculation
- Tree calculation
- Stone calculation
- Multiple patterns
- Multiple stones
- Decimal weights
- Large quantities
- Invalid values
- Rounding
- Order snapshot
- PDF data
- JPG data

---

# 87. FINAL ACCEPTANCE TEST

Test exactly this:

Create customer:

ABC Jewellers

Create stones:

Micro 1.30 mm
Micro 1.60 mm
Micro 1.90 mm
AD Oval 3×2 mm

Create P-9001:

Weight = 0.50 g

Tree Size = 10

Stones:

1.30 mm = 2/piece

1.60 mm = 4/piece

1.90 mm = 1/piece

AD Oval = 1/piece

Create GRAM order:

200 g

Expected:

400 finished pieces

40 wax trees

3,200 total stones

Then create PIECE order:

500 pieces

Expected:

500 finished pieces

250 g expected weight

50 wax trees

4,000 total stones

Then:

- Assign Wax Karigar
- Generate Wax PDF
- Generate Wax JPG
- Open WhatsApp
- Assign Stone Karigar
- Generate Stone PDF
- Generate Stone JPG
- Open WhatsApp
- Export Excel
- Search customer
- Search pattern
- View order history
- Backup database
- Close application
- Disconnect internet
- Reopen application
- Login
- Verify all data

Everything must continue working offline except WhatsApp.

---

# 88. FINAL DEVELOPMENT REQUIREMENT

Build the complete actual application.

Do NOT stop at UI.

Do NOT provide only a prototype.

Do NOT create a browser-only website.

Do NOT require a server.

Do NOT require Firebase.

Do NOT require Supabase.

Do NOT require paid hosting.

Do NOT require paid database.

Do NOT require WhatsApp API.

The final project must contain:

- Electron
- React
- TypeScript
- SQLite
- Database schema
- Migrations
- Secure IPC
- Authentication
- Dashboard
- Customers
- Patterns
- Stones
- Orders
- Karigars
- Production
- Reports
- Calculations
- PDF
- JPG
- Excel
- WhatsApp sharing
- Backup
- Restore
- Settings
- Activity logs
- Error handling
- Validation
- Demo data
- Tests
- Windows installer
- README
- Build configuration

Make the final application production-quality, highly attractive, highly responsive, reliable and extremely easy to use.

Most importantly, preserve the exact business calculation rules described above.
