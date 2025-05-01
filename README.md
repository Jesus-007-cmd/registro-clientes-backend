# 📦 Backend - Registro de Clientes 2025

Este backend en Node.js + Express permite:
✅ Subir datos y archivos de clientes a un bucket S3  
✅ Generar identificadores únicos por registro (UUID)  
✅ Agrupar registros y archivos para consulta  
✅ Generar links temporales (signed URLs) para descarga segura  

---

## 🚀 Requisitos

- Node.js >= 14
- Cuenta AWS con S3 configurado
- Claves AWS con permisos para:
  - `s3:PutObject`
  - `s3:GetObject`
  - `s3:ListBucket`

---

## 📁 Estructura de archivos en S3

Cada registro se guarda así:

```
{uuid}.json                  → datos del cliente (formulario)
{uuid}_ine_nombre.pdf        → archivo relacionado (INE)
{uuid}_acta_nombre.pdf       → archivo relacionado (acta constitutiva)
...
```

---

## ⚙ Variables de entorno (`.env`)

```
AWS_KEY=tu-clave-de-acceso-aws
AWS_SECRET=tu-clave-secreta-aws
PORT=4000
```

---

## 🔧 Comandos

Instalar dependencias:
```bash
npm install
```

Ejecutar localmente:
```bash
node index.js
```

---

## 🛣 Endpoints

### POST `/upload`

Sube datos + archivos.

**Campos esperados (form-data):**
- razonSocial
- representanteLegal
- numeroEscritura
- fechaEscritura
- licenciado
- numeroNotario
- estadoRegistro
- domicilioFiscal
- domiciliosServicio
- correo
- telefono

**Archivos esperados (form-data):**
- ine
- comprobanteDomicilio
- constanciaRFC
- actaConstitutiva
- poderNotariado

Respuesta:
```json
{ "message": "✅ Datos y archivos subidos correctamente a S3", "id": "{uuid}" }
```

---

### GET `/registros`

Lista todos los registros agrupados por ID.

Respuesta:
```json
{
  "registros": [
    {
      "id": "{uuid}",
      "registro": "{uuid}.json",
      "archivos": ["{uuid}_ine_nombre.pdf", ...]
    }
  ]
}
```

---

### GET `/registro/:key`

Obtiene los datos del registro (contenido del JSON).

Respuesta:
```json
{
  "id": "{uuid}",
  "razonSocial": "...",
  "representanteLegal": "...",
  ...
}
```

---

### GET `/archivo/:key`

Genera un link firmado temporal (15 min) para descargar un archivo.

Respuesta:
```json
{
  "url": "https://signed-url-temporal"
}
```

---

## 🛡 Seguridad

✔ Las descargas usan signed URLs para proteger acceso directo.  
✔ Puedes limitar los dominios frontend autorizados en:
```js
app.use(cors({
  origin: ['http://localhost:3000', 'https://tu-frontend-produccion.com'],
}));
```

---

## 💡 Notas

- Usa `uuid` para evitar colisiones en nombres de archivo.
- Si necesitas limpiar el bucket, considera hacerlo desde la consola de AWS o con un script.
- Mantén tus claves AWS seguras y no las subas a GitHub.

---

✏ **Autor:** BLAUCORP TEAM🚀  
