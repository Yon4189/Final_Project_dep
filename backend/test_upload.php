<?php

$ch = curl_init();

$cfile = new CURLFile('c:\\Users\\Addisu computer\\Desktop\\Final-project\\backend\\public\\profilepics\\9Aq3Dw41Tk87hLCqlAJR.png', 'image/png', 'test.png');
$idfile = new CURLFile('c:\\Users\\Addisu computer\\Desktop\\Final-project\\backend\\public\\profilepics\\9Aq3Dw41Tk87hLCqlAJR.png', 'image/png', 'id.png');
$credfile = new CURLFile('c:\\Users\\Addisu computer\\Desktop\\Final-project\\backend\\public\\profilepics\\9Aq3Dw41Tk87hLCqlAJR.png', 'image/png', 'cred.png');

$data = array(
    'fullname' => 'Test Provider',
    'email' => 'testprov' . time() . '@example.com',
    'phone' => '09' . rand(10000000, 99999999),
    'password' => 'password123',
    'password_confirmation' => 'password123',
    'service_city' => 'Addis Ababa',
    'catagoryID' => 29,
    'idPhotoType' => 'National ID',
    'profilePicture' => $cfile,
    'idPhoto' => $idfile,
    'credentialPhoto' => $credfile
);

curl_setopt($ch, CURLOPT_URL, "http://localhost:8000/api/provider/register");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
echo "Provider Registration Response:\n";
echo $response . "\n\n";

curl_close($ch);
