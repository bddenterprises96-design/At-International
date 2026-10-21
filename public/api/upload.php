<?php
/**
 * AT International - Technical Drawing & CAD File Upload Handler
 * Hostinger LiteSpeed / Apache PHP Production Endpoint
 */

// Enable CORS for allowed origins or all origins
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json; charset=UTF-8");

// Only POST is allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method Not Allowed. Only POST is accepted."
    ]);
    exit;
}

// Check if file was uploaded
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $errCode = isset($_FILES['file']['error']) ? $_FILES['file']['error'] : 'NO_FILE';
    $errMap = [
        UPLOAD_ERR_INI_SIZE   => "File exceeds upload_max_filesize directive in php.ini",
        UPLOAD_ERR_FORM_SIZE  => "File exceeds MAX_FILE_SIZE directive in HTML form",
        UPLOAD_ERR_PARTIAL    => "The uploaded file was only partially uploaded",
        UPLOAD_ERR_NO_FILE    => "No file was uploaded",
        UPLOAD_ERR_NO_TMP_DIR => "Missing temporary upload folder",
        UPLOAD_ERR_CANT_WRITE => "Failed to write file to disk",
        UPLOAD_ERR_EXTENSION  => "A PHP extension stopped the file upload",
    ];
    $errMsg = isset($errMap[$errCode]) ? $errMap[$errCode] : "Upload failed (code: $errCode)";

    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => $errMsg,
        "error_code" => $errCode
    ]);
    exit;
}

$uploadedFile = $_FILES['file'];

// Max file size: 50MB (52428800 bytes)
$maxBytes = 50 * 1024 * 1024;
if ($uploadedFile['size'] > $maxBytes) {
    http_response_code(413);
    echo json_encode([
        "success" => false,
        "message" => "File size exceeds the 50MB limit."
    ]);
    exit;
}

// Storage directory: ../uploads/
$storageDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR;
if (!is_dir($storageDir)) {
    if (!mkdir($storageDir, 0755, true)) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Failed to initialize upload directory on server."
        ]);
        exit;
    }
}

// Security: Disallow executable scripts
$originalName = basename($uploadedFile['name']);
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
$disallowedExtensions = ['php', 'php3', 'php4', 'php5', 'phtml', 'phar', 'exe', 'bat', 'sh', 'py', 'pl', 'cgi'];

if (in_array($extension, $disallowedExtensions, true)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Executable file types are not permitted for security reasons."
    ]);
    exit;
}

// Sanitize filename and create unique timestamped name
$safeBaseName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
if (strlen($safeBaseName) > 60) {
    $safeBaseName = substr($safeBaseName, 0, 60);
}
$uniqueId = date('Ymd_His') . '_' . bin2hex(random_bytes(3));
$finalFileName = $uniqueId . '_' . $safeBaseName . ($extension ? '.' . $extension : '');
$destinationPath = $storageDir . $finalFileName;

if (!move_uploaded_file($uploadedFile['tmp_name'], $destinationPath)) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Could not save uploaded file to destination directory."
    ]);
    exit;
}

// Set file permissions (readable by web server)
@chmod($destinationPath, 0644);

// Construct full public URL
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
           (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443) ||
           (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
$protocol = $isHttps ? "https://" : "http://";
$host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'theatinternational.com';
$publicUrl = $protocol . $host . '/uploads/' . rawurlencode($finalFileName);

echo json_encode([
    "success" => true,
    "name" => $originalName,
    "size" => $uploadedFile['size'],
    "filename" => $finalFileName,
    "url" => $publicUrl,
    "downloadUrl" => $publicUrl,
    "previewUrl" => $publicUrl,
    "uploaded_at" => date('c')
]);
