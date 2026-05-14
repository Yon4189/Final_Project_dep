<?php

$client = new \GuzzleHttp\Client([
    'timeout' => 5,
    'verify' => false,
    'curl' => [
        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
    ],
]);

try {
    $res = $client->get('https://api.chapa.co/v1/banks');
    echo "SUCCESS\n";
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
