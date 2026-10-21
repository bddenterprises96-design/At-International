<?php
/**
 * AT International - Inquiry Dispatcher with Native Email Attachments
 * Hostinger LiteSpeed / Apache PHP Production Endpoint
 * Sends inquiries to info@theatinternational.com with real file attachments
 */

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method Not Allowed. Only POST is accepted."]);
    exit;
}

// Recipient email
$adminEmail = "info@theatinternational.com";

// Extract form data
$name        = isset($_POST['name']) ? trim($_POST['name']) : (isset($_POST['from_name']) ? trim($_POST['from_name']) : 'B2B Client');
$email       = isset($_POST['email']) ? trim($_POST['email']) : (isset($_POST['from_email']) ? trim($_POST['from_email']) : '');
$phone       = isset($_POST['phone']) ? trim($_POST['phone']) : 'N/A';
$company     = isset($_POST['company']) ? trim($_POST['company']) : 'N/A';
$country     = isset($_POST['country']) ? trim($_POST['country']) : 'N/A';
$product     = isset($_POST['product']) ? trim($_POST['product']) : (isset($_POST['product_category']) ? trim($_POST['product_category']) : 'General Sourcing');
$quantity    = isset($_POST['quantity']) ? trim($_POST['quantity']) : 'Not Specified';
$inquiryMode = isset($_POST['inquiry_mode']) ? trim($_POST['inquiry_mode']) : 'catalog';
$message     = isset($_POST['message']) ? trim($_POST['message']) : 'No additional requirements provided.';
$selectedParts = isset($_POST['selected_parts']) ? trim($_POST['selected_parts']) : 'None';

if (empty($name) || empty($email)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Name and email are required."]);
    exit;
}

// Build email subject
$subject = "New Sourcing Inquiry: " . $name . " (" . ($company !== 'N/A' ? $company : 'B2B Client') . ") - " . $product;

// Build plain-text message body
$bodyText = "==================================================\n";
$bodyText .= "AT INTERNATIONAL - NEW SOURCING INQUIRY\n";
$bodyText .= "==================================================\n\n";
$bodyText .= "CLIENT DETAILS:\n";
$bodyText .= "--------------------------------------------------\n";
$bodyText .= "Client Name:      " . $name . "\n";
$bodyText .= "Client Email:     " . $email . "\n";
$bodyText .= "Phone/WhatsApp:   " . $phone . "\n";
$bodyText .= "Company:          " . $company . "\n";
$bodyText .= "Country:          " . $country . "\n";
$bodyText .= "Inquiry Mode:     " . $inquiryMode . "\n";
$bodyText .= "Product Category: " . $product . "\n";
$bodyText .= "Target Quantity:  " . $quantity . "\n\n";

$bodyText .= "SELECTED PARTS / COMPONENTS:\n";
$bodyText .= "--------------------------------------------------\n";
$bodyText .= $selectedParts . "\n\n";

$bodyText .= "TECHNICAL REQUIREMENTS & MESSAGE:\n";
$bodyText .= "--------------------------------------------------\n";
$bodyText .= $message . "\n\n";
$bodyText .= "==================================================\n";

// Collect attached files from $_FILES
$attachments = [];
if (!empty($_FILES)) {
    foreach ($_FILES as $key => $fileData) {
        if (is_array($fileData['name'])) {
            // Multiple files in array format: name="files[]"
            for ($i = 0; $i < count($fileData['name']); $i++) {
                if ($fileData['error'][$i] === UPLOAD_ERR_OK && $fileData['size'][$i] > 0) {
                    $attachments[] = [
                        'name'     => $fileData['name'][$i],
                        'tmp_name' => $fileData['tmp_name'][$i],
                        'type'     => $fileData['type'][$i] ?: 'application/octet-stream',
                        'size'     => $fileData['size'][$i]
                    ];
                }
            }
        } else {
            // Single file format: name="file" or name="file_0"
            if ($fileData['error'] === UPLOAD_ERR_OK && $fileData['size'] > 0) {
                $attachments[] = [
                    'name'     => $fileData['name'],
                    'tmp_name' => $fileData['tmp_name'],
                    'type'     => $fileData['type'] ?: 'application/octet-stream',
                    'size'     => $fileData['size']
                ];
            }
        }
    }
}

$fileCount = count($attachments);
if ($fileCount > 0) {
    $bodyText .= "📎 ATTACHED TECHNICAL DRAWINGS & CAD FILES (" . $fileCount . "):\n";
    $bodyText .= "--------------------------------------------------\n";
    foreach ($attachments as $idx => $att) {
        $sizeKb = round($att['size'] / 1024, 1);
        $bodyText .= "FILE " . ($idx + 1) . ": " . $att['name'] . " (" . $sizeKb . " KB) [Attached to this email]\n";
    }
    $bodyText .= "--------------------------------------------------\n";
    $bodyText .= "NOTE: All customer files are attached directly to this email message. You can download and save them directly from your mailbox.\n";
    $bodyText .= "==================================================\n";
} else {
    $bodyText .= "📎 ATTACHED FILES: None\n";
    $bodyText .= "==================================================\n";
}

// Generate unique MIME boundary
$mimeBoundary = "==Multipart_Boundary_x" . md5(time() . rand(1000, 9999)) . "x";

// Headers for Admin Email
$headers = "From: AT International Sourcing <" . $adminEmail . ">\r\n";
$headers .= "Reply-To: " . $name . " <" . $email . ">\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"" . $mimeBoundary . "\"\r\n";
$headers .= "X-Mailer: AT-International-Mailer/1.0\r\n";

// Multipart Body
$emailContent = "--" . $mimeBoundary . "\r\n";
$emailContent .= "Content-Type: text/plain; charset=UTF-8\r\n";
$emailContent .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$emailContent .= $bodyText . "\r\n\r\n";

// Add real MIME attachments
foreach ($attachments as $att) {
    if (file_exists($att['tmp_name'])) {
        $fileData = file_get_contents($att['tmp_name']);
        $base64Data = chunk_split(base64_encode($fileData));
        $cleanFileName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $att['name']);

        $emailContent .= "--" . $mimeBoundary . "\r\n";
        $emailContent .= "Content-Type: " . $att['type'] . "; name=\"" . $cleanFileName . "\"\r\n";
        $emailContent .= "Content-Disposition: attachment; filename=\"" . $cleanFileName . "\"\r\n";
        $emailContent .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $emailContent .= $base64Data . "\r\n\r\n";
    }
}

$emailContent .= "--" . $mimeBoundary . "--";

// Send Admin Notification Email via Hostinger's local mail agent
$mailSent = @mail($adminEmail, $subject, $emailContent, $headers);

// Send Auto-Reply Confirmation Email to Customer
$autoReplySubject = "Inquiry Received - AT International";
$autoReplyBody = "Dear " . $name . ",\n\n";
$autoReplyBody .= "Thank you for reaching out to AT International. We have successfully received your inquiry regarding " . $product;
if ($fileCount > 0) {
    $autoReplyBody .= " along with your " . $fileCount . " attached technical drawing/document(s)";
}
$autoReplyBody .= ".\n\nOur sourcing engineering team is reviewing your requirements and will follow up with you directly within 24 business hours.\n\n";
$autoReplyBody .= "Best regards,\n";
$autoReplyBody .= "AT International Sourcing Desk\n";
$autoReplyBody .= "info@theatinternational.com\n";
$autoReplyBody .= "https://theatinternational.com\n";

$autoReplyHeaders = "From: AT International Sourcing <" . $adminEmail . ">\r\n";
$autoReplyHeaders .= "Reply-To: " . $adminEmail . "\r\n";
$autoReplyHeaders .= "MIME-Version: 1.0\r\n";
$autoReplyHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";
$autoReplyHeaders .= "X-Mailer: AT-International-Mailer/1.0\r\n";

@mail($email, $autoReplySubject, $autoReplyBody, $autoReplyHeaders);

echo json_encode([
    "success"          => true,
    "message"          => "Inquiry and file attachments dispatched successfully to your mailbox.",
    "attachments_count" => $fileCount,
    "mail_sent"        => $mailSent
]);
