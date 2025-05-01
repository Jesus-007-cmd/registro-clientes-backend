require('dotenv').config();
const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const cors = require('cors');
const app = express();

// ✅ Configuración correcta de CORS (acepta localhost y frontend en producción)
app.use(cors({
  origin: ['http://localhost:3000', 'https://tu-frontend-produccion.com'],
  methods: ['GET', 'POST'],
}));

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
    const razonSocialKey = formData.razonSocial.replace(/\s+/g, '_');

    const jsonBuffer = Buffer.from(JSON.stringify(formData, null, 2));
    const jsonParams = {
      Bucket: 'registro-clientes-docs',
      Key: `${razonSocialKey}_datos.json`,
      Body: jsonBuffer,
      ContentType: 'application/json',
    };
    await s3.upload(jsonParams).promise();

    const fileFields = req.files;
    for (const [fieldName, files] of Object.entries(fileFields)) {
      for (const file of files) {
        const fileParams = {
          Bucket: 'registro-clientes-docs',
          Key: `${razonSocialKey}_${fieldName}_${file.originalname}`,
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

// OBTENER CONTENIDO DE UN ARCHIVO JSON
app.get('/registro/:key', async (req, res) => {
  const { key } = req.params;

  try {
    const data = await s3.getObject({
      Bucket: 'registro-clientes-docs',
      Key: key,
    }).promise();

    const jsonContent = JSON.parse(data.Body.toString('utf-8'));

    res.json(jsonContent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Error al leer el archivo', details: err });
  }
});

// LISTAR REGISTROS Y ARCHIVOS RELACIONADOS
app.get('/registros', async (req, res) => {
  try {
    const data = await s3.listObjectsV2({
      Bucket: 'registro-clientes-docs',
    }).promise();

    const grouped = {};

    data.Contents.forEach(item => {
      const key = item.Key;
      let baseName = '';

      if (key.endsWith('_datos.json')) {
        baseName = key.replace('_datos.json', '');
        if (!grouped[baseName]) {
          grouped[baseName] = {
            registro: key,
            archivos: [],
          };
        } else {
          grouped[baseName].registro = key;
        }
      } else {
        baseName = key.split('_')[0];
        if (!grouped[baseName]) {
          grouped[baseName] = {
            registro: null,
            archivos: [],
          };
        }
        grouped[baseName].archivos.push(key);
      }
    });

    const result = Object.values(grouped);
    res.json({ registros: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Error al listar registros', details: err });
  }
});

// GENERAR SIGNED URL PARA DESCARGA
app.get('/archivo/:key', async (req, res) => {
  const { key } = req.params;

  const params = {
    Bucket: 'registro-clientes-docs',
    Key: key,
    Expires: 900, // 15 minutos
  };

  try {
    const url = s3.getSignedUrl('getObject', params);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Error al generar link firmado', details: err });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`🚀 Backend escuchando en port ${port}`));
