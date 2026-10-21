import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { Readable } from 'stream'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function uploadDevPlugin() {
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.dwg': 'application/acad',
    '.dxf': 'application/dxf',
    '.stp': 'application/step',
    '.step': 'application/step',
    '.iges': 'model/iges',
    '.igs': 'model/iges',
    '.zip': 'application/zip',
    '.rar': 'application/vnd.rar',
    '.7z': 'application/x-7z-compressed',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }

  return {
    name: 'upload-dev-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''

        // 1. Direct file serving for /uploads/*
        if (url.startsWith('/uploads/') && (req.method === 'GET' || req.method === 'HEAD')) {
          const rawName = url.replace('/uploads/', '').split('?')[0]
          const fileName = decodeURIComponent(rawName)
          const filePath = path.join(__dirname, 'public', 'uploads', fileName)

          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase()
            const contentType = mimeTypes[ext] || 'application/octet-stream'
            const stat = fs.statSync(filePath)

            res.statusCode = 200
            res.setHeader('Content-Type', contentType)
            res.setHeader('Content-Length', stat.size)
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`)

            if (req.method === 'HEAD') {
              res.end()
              return
            }

            fs.createReadStream(filePath).pipe(res)
            return
          }
        }

        // 2. Upload handler for /api/upload.php and /api/upload
        if ((url.startsWith('/api/upload.php') || url.startsWith('/api/upload')) && req.method === 'POST') {
          try {
            const host = req.headers.host || 'localhost:5173'
            const protocol = 'http://'
            const webReq = new Request(protocol + host + url, {
              method: req.method,
              headers: req.headers,
              body: Readable.toWeb(req),
              duplex: 'half'
            })

            const formData = await webReq.formData()
            const file = formData.get('file')

            if (!file || typeof file === 'string') {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, message: 'No file uploaded' }))
              return
            }

            const uploadsDir = path.join(__dirname, 'public', 'uploads')
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true })
            }

            const originalName = file.name || 'uploaded_file'
            const cleanName = originalName.replace(/[^a-zA-Z0-9_\-\.]/g, '_')
            const uniquePrefix = Date.now() + '_' + Math.random().toString(36).substring(2, 8)
            const savedFileName = `${uniquePrefix}_${cleanName}`
            const filePath = path.join(uploadsDir, savedFileName)

            const arrayBuffer = await file.arrayBuffer()
            fs.writeFileSync(filePath, Buffer.from(arrayBuffer))

            const localFileUrl = `${protocol}${host}/uploads/${encodeURIComponent(savedFileName)}`

            // Server-to-server cloud mirror from Node.js (no browser CORS restrictions)
            // Ensures links in emails tested on localhost can be downloaded on mobile phones
            let publicDownloadUrl = null
            try {
              const cloudFd = new FormData()
              cloudFd.append('file', new Blob([Buffer.from(arrayBuffer)]), originalName)
              const cloudRes = await fetch('https://tmpfiles.org/api/v1/upload', {
                method: 'POST',
                body: cloudFd,
                signal: AbortSignal.timeout(12000)
              })
              if (cloudRes.ok) {
                const cloudJson = await cloudRes.json()
                if (cloudJson?.status === 'success' && cloudJson?.data?.url) {
                  const rawUrl = cloudJson.data.url
                  publicDownloadUrl = rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
                }
              }
            } catch (cloudErr) {
              console.warn('Dev server cloud mirror warning:', cloudErr?.message || cloudErr)
            }

            const effectiveDownloadUrl = publicDownloadUrl || localFileUrl

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(JSON.stringify({
              success: true,
              name: originalName,
              size: file.size,
              filename: savedFileName,
              url: effectiveDownloadUrl,
              downloadUrl: effectiveDownloadUrl,
              previewUrl: effectiveDownloadUrl,
              localUrl: localFileUrl,
              uploaded_at: new Date().toISOString()
            }))
            return
          } catch (err) {
            console.error('Dev upload handler error:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, message: err.message }))
            return
          }
        }

        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), uploadDevPlugin()],
})