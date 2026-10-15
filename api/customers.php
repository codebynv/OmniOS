<?php
/**
 * OmniOS Customers CRUD API Endpoint
 *
 * Implements prepared statement queries for:
 * - GET: List with search and pagination, or get single customer by ?id=
 * - POST: Create new customer with server-side validation & duplicate email protection
 * - PUT: Update existing customer
 * - DELETE: Delete customer by ID
 */

// Handle CORS Preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/session.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDbConnection();

// Enforce owner authentication on customer data operations
$currentOwner = requireAuth($conn);

/**
 * Helper to parse request payload (supports both JSON body and standard form data).
 */
function getRequestPayload(): array {
    $rawInput = file_get_contents('php://input');
    $jsonData = json_decode($rawInput, true);
    if (is_array($jsonData)) {
        return $jsonData;
    }
    return is_array($_POST) ? $_POST : [];
}

/**
 * Normalizes an Indian mobile number to its 10 local digits.
 *
 * Spaces, hyphens and an optional +91 / 91 country code or 0 trunk prefix
 * are stripped before validation so accepted formats are never stored raw.
 *
 * @param mixed $value Raw user input
 * @return string Digits only ('' when nothing usable was supplied)
 */
function normalizeIndianMobile($value): string {
    $raw = trim((string) $value);
    if ($raw === '') {
        return '';
    }

    $digits = preg_replace('/[^0-9]/', '', $raw);
    if ($digits === null || $digits === '') {
        return '';
    }

    if (strlen($digits) === 12 && strpos($digits, '91') === 0) {
        $digits = substr($digits, 2);
    } elseif (strlen($digits) === 11 && $digits[0] === '0') {
        $digits = substr($digits, 1);
    }

    return $digits;
}

/**
 * Strict check for a 10-digit Indian mobile number.
 *
 * @param mixed $value Raw user input
 * @return bool True when the input resolves to a valid Indian mobile number
 */
function isValidIndianMobile($value): bool {
    return (bool) preg_match('/^[6-9][0-9]{9}$/', normalizeIndianMobile($value));
}

/**
 * Canonical storage format: `+91 98765 43210`.
 * Invalid input is returned trimmed and unchanged so callers must validate first.
 *
 * @param mixed $value Raw user input
 * @return string Canonical formatted number, or the trimmed input when invalid
 */
function formatIndianMobile($value): string {
    $digits = normalizeIndianMobile($value);
    if (preg_match('/^[6-9][0-9]{9}$/', $digits)) {
        return '+91 ' . substr($digits, 0, 5) . ' ' . substr($digits, 5);
    }
    return trim((string) $value);
}

/**
 * Validates customer input fields.
 *
 * @param array $data Input data
 * @param bool $isUpdate True if validating for an update
 * @return array Array of validation error messages (empty if valid)
 */
function validateCustomerData(array $data, bool $isUpdate = false): array {
    $errors = [];

    // Name validation
    if (!isset($data['name']) || trim($data['name']) === '') {
        $errors[] = 'Customer name is required.';
    } elseif (mb_strlen(trim($data['name'])) < 2) {
        $errors[] = 'Customer name must be at least 2 characters.';
    } elseif (mb_strlen(trim($data['name'])) > 100) {
        $errors[] = 'Customer name cannot exceed 100 characters.';
    }

    // Email validation
    if (!isset($data['email']) || trim($data['email']) === '') {
        $errors[] = 'Email address is required.';
    } else {
        $email = trim($data['email']);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'A valid email address is required (e.g., user@company.com).';
        } elseif (mb_strlen($email) > 150) {
            $errors[] = 'Email address cannot exceed 150 characters.';
        }
    }

    // Company validation (optional)
    if (isset($data['company']) && mb_strlen(trim($data['company'])) > 100) {
        $errors[] = 'Company name cannot exceed 100 characters.';
    }

    // Phone validation — required 10-digit Indian mobile (optional +91 / 0 prefix,
    // spaces and hyphens are accepted and normalized before storing)
    if (!isset($data['phone']) || trim((string) $data['phone']) === '') {
        $errors[] = 'Mobile number is required.';
    } elseif (!isValidIndianMobile($data['phone'])) {
        $errors[] = 'Enter a valid 10-digit Indian mobile number.';
    }

    return $errors;
}

// ============================================================================
// METHOD DISPATCHING
// ============================================================================

switch ($method) {
    case 'GET':
        handleGet($conn);
        break;

    case 'POST':
        handlePost($conn);
        break;

    case 'PUT':
        handlePut($conn);
        break;

    case 'DELETE':
        handleDelete($conn);
        break;

    default:
        sendJsonResponse(405, [
            'success' => false,
            'error'   => 'Method not allowed. Supported methods: GET, POST, PUT, DELETE.'
        ]);
        break;
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * Handle GET requests (Single customer or paginated list with search).
 */
function handleGet(mysqli $conn): void {
    // 1. Single Customer Request: ?id=
    if (isset($_GET['id'])) {
        $idParam = $_GET['id'];
        if (!filter_var($idParam, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])) {
            sendJsonResponse(400, [
                'success' => false,
                'error'   => 'Invalid customer ID. ID must be a positive integer.'
            ]);
        }

        $id = (int) $idParam;
        $stmt = $conn->prepare('SELECT id, name, email, company, phone, created_at FROM customers WHERE id = ?');
        if (!$stmt) {
            sendJsonResponse(500, ['success' => false, 'error' => 'Failed to prepare query statement.']);
        }

        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($customer = $result->fetch_assoc()) {
            $stmt->close();
            sendJsonResponse(200, [
                'success' => true,
                'data'    => $customer
            ]);
        } else {
            $stmt->close();
            sendJsonResponse(404, [
                'success' => false,
                'error'   => 'Customer not found.'
            ]);
        }
    }

    // 2. Paginated List with optional Search
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    if ($search === '' && isset($_GET['q'])) {
        $search = trim($_GET['q']);
    }

    // Pagination parameters
    $page = isset($_GET['page']) ? filter_var($_GET['page'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) : 1;
    if ($page === false || $page < 1) {
        $page = 1;
    }

    $limit = isset($_GET['limit']) ? filter_var($_GET['limit'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100]]) : 10;
    if ($limit === false || $limit < 1) {
        $limit = 10;
    }

    $offset = ($page - 1) * $limit;

    // A. Count Total Matching Records
    $totalRecords = 0;
    if ($search !== '') {
        $countSql = 'SELECT COUNT(*) AS total FROM customers WHERE name LIKE ? OR company LIKE ? OR email LIKE ?';
        $countStmt = $conn->prepare($countSql);
        if (!$countStmt) {
            sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
        }
        $searchPattern = '%' . $search . '%';
        $countStmt->bind_param('sss', $searchPattern, $searchPattern, $searchPattern);
        $countStmt->execute();
        $countRes = $countStmt->get_result()->fetch_assoc();
        $totalRecords = (int) $countRes['total'];
        $countStmt->close();
    } else {
        $countRes = $conn->query('SELECT COUNT(*) AS total FROM customers');
        if ($countRes) {
            $row = $countRes->fetch_assoc();
            $totalRecords = (int) $row['total'];
        }
    }

    $totalPages = $totalRecords > 0 ? (int) ceil($totalRecords / $limit) : 1;

    // B. Fetch Paginated Records
    $customers = [];
    if ($search !== '') {
        $sql = 'SELECT id, name, email, company, phone, created_at 
                FROM customers 
                WHERE name LIKE ? OR company LIKE ? OR email LIKE ? 
                ORDER BY id DESC 
                LIMIT ? OFFSET ?';
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
        }
        $searchPattern = '%' . $search . '%';
        $stmt->bind_param('sssii', $searchPattern, $searchPattern, $searchPattern, $limit, $offset);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $customers[] = $row;
        }
        $stmt->close();
    } else {
        $sql = 'SELECT id, name, email, company, phone, created_at 
                FROM customers 
                ORDER BY id DESC 
                LIMIT ? OFFSET ?';
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
        }
        $stmt->bind_param('ii', $limit, $offset);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $customers[] = $row;
        }
        $stmt->close();
    }

    sendJsonResponse(200, [
        'success'    => true,
        'data'       => $customers,
        'pagination' => [
            'page'          => $page,
            'limit'         => $limit,
            'total_records' => $totalRecords,
            'total_pages'   => $totalPages,
            'search'        => $search
        ]
    ]);
}

/**
 * Handle POST requests (Create Customer).
 */
function handlePost(mysqli $conn): void {
    $payload = getRequestPayload();

    $errors = validateCustomerData($payload);
    if (!empty($errors)) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => implode(' ', $errors),
            'errors'  => $errors
        ]);
    }

    $name    = trim($payload['name']);
    $email   = trim($payload['email']);
    $company = isset($payload['company']) ? trim($payload['company']) : '';
    $phone   = isset($payload['phone']) ? formatIndianMobile($payload['phone']) : '';

    // Check for duplicate email before insert
    $checkStmt = $conn->prepare('SELECT id FROM customers WHERE email = ?');
    if ($checkStmt) {
        $checkStmt->bind_param('s', $email);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        if ($checkResult->num_rows > 0) {
            $checkStmt->close();
            sendJsonResponse(409, [
                'success' => false,
                'error'   => 'A customer with this email address already exists.'
            ]);
        }
        $checkStmt->close();
    }

    // Insert new customer using prepared statement
    $stmt = $conn->prepare('INSERT INTO customers (name, email, company, phone) VALUES (?, ?, ?, ?)');
    if (!$stmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
    }

    $stmt->bind_param('ssss', $name, $email, $company, $phone);

    if (!$stmt->execute()) {
        // Handle race-condition duplicate key error safely
        if ($stmt->errno === 1062) {
            $stmt->close();
            sendJsonResponse(409, [
                'success' => false,
                'error'   => 'A customer with this email address already exists.'
            ]);
        }
        $stmt->close();
        sendJsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to save customer record.'
        ]);
    }

    $newId = $stmt->insert_id;
    $stmt->close();

    sendJsonResponse(201, [
        'success' => true,
        'message' => 'Customer created successfully.',
        'data'    => [
            'id'         => $newId,
            'name'       => $name,
            'email'      => $email,
            'company'    => $company,
            'phone'      => $phone,
            'created_at' => date('Y-m-d H:i:s')
        ]
    ]);
}

/**
 * Handle PUT requests (Update Customer).
 */
function handlePut(mysqli $conn): void {
    $payload = getRequestPayload();

    // Determine ID (from URL parameter or payload)
    $idParam = $_GET['id'] ?? ($payload['id'] ?? null);
    if (!$idParam || !filter_var($idParam, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid or missing customer ID for update.'
        ]);
    }

    $id = (int) $idParam;

    // Verify existing record
    $checkStmt = $conn->prepare('SELECT id FROM customers WHERE id = ?');
    if (!$checkStmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
    }
    $checkStmt->bind_param('i', $id);
    $checkStmt->execute();
    if ($checkStmt->get_result()->num_rows === 0) {
        $checkStmt->close();
        sendJsonResponse(404, [
            'success' => false,
            'error'   => 'Customer not found.'
        ]);
    }
    $checkStmt->close();

    // Validate fields
    $errors = validateCustomerData($payload, true);
    if (!empty($errors)) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => implode(' ', $errors),
            'errors'  => $errors
        ]);
    }

    $name    = trim($payload['name']);
    $email   = trim($payload['email']);
    $company = isset($payload['company']) ? trim($payload['company']) : '';
    $phone   = isset($payload['phone']) ? formatIndianMobile($payload['phone']) : '';

    // Check duplicate email against other customers
    $dupStmt = $conn->prepare('SELECT id FROM customers WHERE email = ? AND id != ?');
    if ($dupStmt) {
        $dupStmt->bind_param('si', $email, $id);
        $dupStmt->execute();
        if ($dupStmt->get_result()->num_rows > 0) {
            $dupStmt->close();
            sendJsonResponse(409, [
                'success' => false,
                'error'   => 'Another customer with this email address already exists.'
            ]);
        }
        $dupStmt->close();
    }

    // Execute update with prepared statement
    $stmt = $conn->prepare('UPDATE customers SET name = ?, email = ?, company = ?, phone = ? WHERE id = ?');
    if (!$stmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
    }

    $stmt->bind_param('ssssi', $name, $email, $company, $phone, $id);

    if (!$stmt->execute()) {
        if ($stmt->errno === 1062) {
            $stmt->close();
            sendJsonResponse(409, [
                'success' => false,
                'error'   => 'Another customer with this email address already exists.'
            ]);
        }
        $stmt->close();
        sendJsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to update customer record.'
        ]);
    }
    $stmt->close();

    sendJsonResponse(200, [
        'success' => true,
        'message' => 'Customer updated successfully.',
        'data'    => [
            'id'      => $id,
            'name'    => $name,
            'email'   => $email,
            'company' => $company,
            'phone'   => $phone
        ]
    ]);
}

/**
 * Handle DELETE requests (Delete Customer).
 */
function handleDelete(mysqli $conn): void {
    $payload = getRequestPayload();

    $idParam = $_GET['id'] ?? ($payload['id'] ?? null);
    if (!$idParam || !filter_var($idParam, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid or missing customer ID for deletion.'
        ]);
    }

    $id = (int) $idParam;

    // Check existence first
    $checkStmt = $conn->prepare('SELECT id FROM customers WHERE id = ?');
    if (!$checkStmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
    }
    $checkStmt->bind_param('i', $id);
    $checkStmt->execute();
    if ($checkStmt->get_result()->num_rows === 0) {
        $checkStmt->close();
        sendJsonResponse(404, [
            'success' => false,
            'error'   => 'Customer not found.'
        ]);
    }
    $checkStmt->close();

    // Execute delete using prepared statement
    $stmt = $conn->prepare('DELETE FROM customers WHERE id = ?');
    if (!$stmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
    }

    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) {
        $stmt->close();
        sendJsonResponse(500, ['success' => false, 'error' => 'Failed to delete customer record.']);
    }

    $affected = $stmt->affected_rows;
    $stmt->close();

    if ($affected > 0) {
        sendJsonResponse(200, [
            'success' => true,
            'message' => 'Customer deleted successfully.',
            'id'      => $id
        ]);
    } else {
        sendJsonResponse(404, [
            'success' => false,
            'error'   => 'Customer not found or already deleted.'
        ]);
    }
}
