require('dotenv').config();
const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
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

// SUBIDA DE ARCHIVOS Y DATOS
app.post('/upload', upload.fields([
  { name: 'ine' },
  { name: 'comprobanteDomicilio' },
  { name: 'constanciaRFC' },
  { name: 'actaConstitutiva' },
  { name: 'poderNotariado' }
]), async (req, res) => {
  try {
    const formData = req.body;
    const jsonBuffer = Buffer.from(JSON.stringify(formData, null, 2));
    const jsonParams = {
      Bucket: 'registro-clientes-docs',
      Key: `${formData.razonSocial.replace(/\s+/g, '_')}_datos.json`,
      Body: jsonBuffer,
      ContentType: 'application/json',
    };
    await s3.upload(jsonParams).promise();

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

// LISTAR REGISTROS
app.get('/registros', async (req, res) => {
  try {
    const data = await s3.listObjectsV2({
      Bucket: 'registro-clientes-docs',
      Prefix: '', // puedes filtrar si quieres solo por json: Prefix: '_datos.json'
    }).promise();

    const jsonFiles = data.Contents.filter(item => item.Key.endsWith('_datos.json')).map(item => item.Key);

    res.json({ registros: jsonFiles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Error al listar registros', details: err });
  }
});

app.listen(4000, () => console.log('🚀 Backend escuchando en http://localhost:4000'));
