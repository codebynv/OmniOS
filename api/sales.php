<?php
/**
 * OmniOS Sales & Revenue Analytics API Endpoint
 *
 * Owner-only endpoint (HTTP 403 for Team Members). Computes authentic,
 * database-driven financial KPIs and chart aggregations strictly scoped to the
 * authenticated Owner's business:
 * - Annual Revenue (YTD): Settled revenue (status = 'Delivered') in current year
 * - Avg Order Value: Average value of all non-cancelled orders
 * - Collected This Month: Settled revenue (status = 'Delivered') in current month
 * - Pending Invoices: Outstanding pipeline (status IN ('Pending', 'Processing'))
 * - Monthly Revenue: Grouped monthly revenue for Jan - Dec of current year
 * - Recent Invoices: Latest commercial transactions
 * - Strict exclusion of Cancelled orders from revenue metrics
 */

// Handle CORS Preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/session.php';

$conn = getDbConnection();

// 1. Enforce Authentication (HTTP 401 if unauthenticated)
//    and Owner-only access (HTTP 403 if authenticated Team Member).
$currentUser = requireRole($conn, ['owner']);

// 2. Verify valid business context
$businessId = isset($currentUser['business_id']) ? (int) $currentUser['business_id'] : 0;
if ($businessId <= 0) {
    sendJsonResponse(403, [
        'success' => false,
        'error'   => 'Access denied. User is not associated with a valid business.'
    ]);
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') {
    sendJsonResponse(405, [
        'success' => false,
        'error'   => "HTTP method $method is not supported."
    ]);
}

$currentYear  = (int) date('Y');
$currentMonth = (int) date('m');

// Determine financial year boundaries (Indian FY: April-March)
$fyStartMonth = 4; // April
$fyEndMonth   = 3; // March

// Current financial year label (e.g., FY 2026-27 for dates in Apr 2026 - Mar 2027)
$fyStartYear = ($currentMonth >= $fyStartMonth) ? $currentYear : $currentYear - 1;
$fyEndYear   = $fyStartYear + 1;
$fyLabel     = "FY $fyStartYear-" . substr((string)$fyEndYear, -2);

// FY start and end dates for queries
$fyStartDate = "$fyStartYear-$fyStartMonth-01";
$fyEndDate   = date('Y-m-t', strtotime("$fyEndYear-$fyEndMonth-01"));

// 1. Annual Revenue (YTD) — Delivered orders in current financial year
$ytdStmt = $conn->prepare("
    SELECT COALESCE(SUM(total_amount), 0) AS ytd_total
    FROM orders
    WHERE business_id = ? AND status = 'Delivered' AND order_date BETWEEN ? AND ?
");
$ytdStmt->bind_param("iss", $businessId, $fyStartDate, $fyEndDate);
$ytdStmt->execute();
$ytdTotal = (float) $ytdStmt->get_result()->fetch_assoc()['ytd_total'];
$ytdStmt->close();

// 2. Average Order Value (AOV) — Non-cancelled orders across all time
$aovStmt = $conn->prepare("
    SELECT COALESCE(AVG(total_amount), 0) AS avg_value,
           COUNT(*) AS total_orders
    FROM orders
    WHERE business_id = ? AND status != 'Cancelled'
");
$aovStmt->bind_param("i", $businessId);
$aovStmt->execute();
$aovRow = $aovStmt->get_result()->fetch_assoc();
$avgOrderValue = round((float) $aovRow['avg_value'], 2);
$totalActiveOrders = (int) $aovRow['total_orders'];
$aovStmt->close();

// 3. Collected This Month — Delivered orders in current calendar month
$curMonthStmt = $conn->prepare("
    SELECT COALESCE(SUM(total_amount), 0) AS mtd_total
    FROM orders
    WHERE business_id = ? AND status = 'Delivered' AND YEAR(order_date) = ? AND MONTH(order_date) = ?
");
$curMonthStmt->bind_param("iii", $businessId, $currentYear, $currentMonth);
$curMonthStmt->execute();
$collectedThisMonth = (float) $curMonthStmt->get_result()->fetch_assoc()['mtd_total'];
$curMonthStmt->close();

// 4. Pending Invoices / Receivables — Orders with status 'Pending' or 'Processing'
$pendingStmt = $conn->prepare("
    SELECT COALESCE(SUM(total_amount), 0) AS pending_total,
           COUNT(*) AS pending_count
    FROM orders
    WHERE business_id = ? AND status IN ('Pending', 'Processing')
");
$pendingStmt->bind_param("i", $businessId);
$pendingStmt->execute();
$pendingRow = $pendingStmt->get_result()->fetch_assoc();
$pendingInvoicesTotal = (float) $pendingRow['pending_total'];
$pendingCount = (int) $pendingRow['pending_count'];
$pendingStmt->close();

// 5. Monthly Revenue Breakdown (12 months of current financial year: Apr-Mar)
$monthlyStmt = $conn->prepare("
    SELECT YEAR(order_date) AS y, MONTH(order_date) AS m, COALESCE(SUM(total_amount), 0) AS month_total
    FROM orders
    WHERE business_id = ? AND status = 'Delivered' AND order_date BETWEEN ? AND ?
    GROUP BY YEAR(order_date), MONTH(order_date)
");
$monthlyStmt->bind_param("iss", $businessId, $fyStartDate, $fyEndDate);
$monthlyStmt->execute();
$monthlyRes = $monthlyStmt->get_result();
$monthTotals = [];
while ($mRow = $monthlyRes->fetch_assoc()) {
    $key = ((int)$mRow['y'] * 100) + (int)$mRow['m'];
    $monthTotals[$key] = (float) $mRow['month_total'];
}
$monthlyStmt->close();

// Build 12 months for financial year: Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec, Jan, Feb, Mar
$fyMonthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
$monthlySales = [];
for ($i = 0; $i < 12; $i++) {
    $monthNum = $fyStartMonth + $i;
    $year = $fyStartYear;
    if ($monthNum > 12) {
        $monthNum -= 12;
        $year = $fyEndYear;
    }
    $key = ($year * 100) + $monthNum;
    $monthlySales[] = [
        'month'     => $fyMonthNames[$i],
        'monthNum'  => $monthNum,
        'year'      => $year,
        'amount'    => isset($monthTotals[$key]) ? $monthTotals[$key] : 0.0
    ];
}

// 6. Recent Commercial Invoices (latest 10 orders)
$recentStmt = $conn->prepare("
    SELECT o.id, o.order_number, o.item_summary, o.status, o.total_amount, o.order_date, o.payment_method,
           c.name AS customer_name, c.company AS customer_company
    FROM orders o
    INNER JOIN customers c ON o.customer_id = c.id
    WHERE o.business_id = ?
    ORDER BY o.order_date DESC, o.id DESC
    LIMIT 10
");
$recentStmt->bind_param("i", $businessId);
$recentStmt->execute();
$recentRes = $recentStmt->get_result();
$recentInvoices = [];
while ($r = $recentRes->fetch_assoc()) {
    $recentInvoices[] = [
        'id'       => $r['order_number'],
        'order_id' => (int) $r['id'],
        'customer' => $r['customer_name'],
        'company'  => $r['customer_company'],
        'item'     => $r['item_summary'],
        'date'     => date('d M Y', strtotime($r['order_date'])),
        'status'   => $r['status'],
        'method'   => $r['payment_method'],
        'amount'   => (float) $r['total_amount']
    ];
}
$recentStmt->close();

sendJsonResponse(200, [
    'success' => true,
    'data'    => [
        'year'                 => $fyStartYear,
        'fy_label'             => $fyLabel,
        'fy_start'             => $fyStartDate,
        'fy_end'               => $fyEndDate,
        'annual_revenue_ytd'   => $ytdTotal,
        'avg_order_value'      => $avgOrderValue,
        'collected_this_month' => $collectedThisMonth,
        'pending_invoices'     => $pendingInvoicesTotal,
        'pending_count'        => $pendingCount,
        'total_orders'         => $totalActiveOrders,
        'monthly_sales'        => $monthlySales,
        'recent_invoices'      => $recentInvoices
    ]
]);
