require('dotenv').config();
const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const fs = require('fs');
const cors = require('cors');
const app = express();

app.use(cors());

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
  region: 'us-east-2',
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/upload', upload.fields([
  { name: 'ine' },
  { name: 'comprobanteDomicilio' },
  { name: 'constanciaRFC' },
  { name: 'actaConstitutiva' },
  { name: 'poderNotariado' }
]), async (req, res) => {
  try {
    // Guarda datos JSON
    const formData = req.body;
    const jsonBuffer = Buffer.from(JSON.stringify(formData, null, 2));
    const jsonParams = {
      Bucket: 'registro-clientes-docs',
      Key: `${formData.razonSocial.replace(/\s+/g, '_')}_datos.json`,
      Body: jsonBuffer,
      ContentType: 'application/json',
    };
    await s3.upload(jsonParams).promise();

    // Sube cada archivo
    const fileFields = req.files;
    for (const [fieldName, files] of Object.entries(fileFields)) {
      for (const file of files) {
        const fileParams = {
          Bucket: 'registro-clientes-docs',
          Key: `${formData.razonSocial.replace(/\s+/g, '_')}_${fieldName}_${file.originalname}`,
          Body: file.buffer,
        };
        await s3.upload(fileParams).promise();
      }
    }

    res.json({ message: '✅ Datos y archivos subidos correctamente a S3' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Error al subir datos/archivos', details: err });
  }
});

app.listen(4000, () => console.log('🚀 Backend escuchando en http://localhost:4000'));
