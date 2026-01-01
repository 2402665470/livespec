/**
 * Express HTTP Server
 *
 * Serves the user's project folder and injects the LiveSpec bridge script
 */

import express, { type Express, type Response } from 'express'
import { readFileSync } from 'fs'

let app: Express | null = null
let server: ReturnType<Express['listen']> | null = null
let currentRootPath: string | null = null

const BRIDGE_SCRIPT_URL = '/__livespec/client.js'
const BRIDGE_SCRIPT_TAG = `<script src="${BRIDGE_SCRIPT_URL}"></script>`

// =============================================================================
// MARK: HTML Injection Middleware (Production-Grade)
// =============================================================================

/**
 * Safe HTML injection middleware
 *
 * Safety checks:
 * 1. Only inject into text/html responses
 * 2. Check if script already exists (idempotency)
 * 3. Find </body> tag and insert before it, or append to end
 */
function createHTMLInjectionMiddleware() {
  return (_req: express.Request, res: Response, next: express.NextFunction) => {
    // Override res.send for HTML content
    const originalSend = res.send

    res.send = function (body: unknown) {
      // Type guard for string body
      if (typeof body !== 'string') {
        return originalSend.call(this, body)
      }

      // SAFETY CHECK 1: Only process HTML content
      const contentType = this.getHeader('Content-Type') as string | undefined
      if (contentType && !contentType.includes('text/html')) {
        return originalSend.call(this, body)
      }

      // SAFETY CHECK 2: Check if script is already injected
      if (body.includes(BRIDGE_SCRIPT_URL)) {
        console.log('[LiveSpec] Script already injected, skipping')
        return originalSend.call(this, body)
      }

      // SAFETY CHECK 3: Find </body> tag and inject before it
      const bodyCloseTag = '</body>'
      const bodyLower = body.toLowerCase()

      // Look for </body> (case-insensitive)
      const bodyCloseIndex = bodyLower.lastIndexOf(bodyCloseTag)

      let modifiedBody: string
      if (bodyCloseIndex !== -1) {
        // Found </body> - insert script before it
        const injectionPoint = bodyCloseIndex
        modifiedBody =
          body.slice(0, injectionPoint) +
          BRIDGE_SCRIPT_TAG +
          body.slice(injectionPoint)
        console.log('[LiveSpec] Injected bridge script before </body>')
      } else {
        // No </body> found - append to end
        modifiedBody = body + BRIDGE_SCRIPT_TAG
        console.log('[LiveSpec] No </body> found, appended script to end')
      }

      // Update content-length header
      this.setHeader('Content-Length', Buffer.byteLength(modifiedBody))

      return originalSend.call(this, modifiedBody)
    }

    next()
  }
}

// =============================================================================
// MARK: Express App Setup
// =============================================================================

function createApp(): Express {
  const expressApp = express()

  // Middleware
  expressApp.use(express.json())

  // Health check endpoint
  expressApp.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      rootPath: currentRootPath
    })
  })

  return expressApp
}

// =============================================================================
// MARK: Server Lifecycle
// =============================================================================

/**
 * Start the Express server
 * @param port - HTTP port to listen on
 * @param rootPath - Project root path
 */
export function startExpressServer(port: number, rootPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!app) {
      app = createApp()
    }

    currentRootPath = rootPath

    // Check if .LiveSpec subdirectory exists
    const { join } = require('path')
    const { existsSync } = require('fs')
    const livespecDir = join(rootPath, '.LiveSpec')

    const staticRootPath = existsSync(livespecDir) ? livespecDir : rootPath
    console.log(`[Express] Serving static files from: ${staticRootPath}`)

    // IMPORTANT: Serve the project folder statically
    // This allows accessing files like http://localhost:3900/index.html
    app.use(express.static(staticRootPath))

    // Serve the LiveSpec client bridge script
    app.get(BRIDGE_SCRIPT_URL, (_req, res) => {
      res.set('Content-Type', 'application/javascript; charset=utf-8')

      try {
        // Try multiple possible paths for the client.js file
        const possiblePaths = [
          // Development: src/main/static/client.js
          join(__dirname, '..', '..', 'main', 'static', 'client.js'),
          // Production: out/main/static/client.js
          join(__dirname, 'static', 'client.js'),
          // Alternative: same directory
          join(__dirname, 'client.js')
        ]

        let clientScript: string | null = null
        let foundPath = ''

        for (const checkPath of possiblePaths) {
          if (existsSync(checkPath)) {
            clientScript = readFileSync(checkPath, 'utf-8')
            foundPath = checkPath
            break
          }
        }

        if (clientScript) {
          res.send(clientScript)
          console.log('[LiveSpec] Serving bridge script from:', foundPath)
        } else {
          console.error('[LiveSpec] Bridge script not found in any location')
          console.error('[LiveSpec] Tried paths:', possiblePaths)
          res.status(404).send('// Bridge script not found')
        }
      } catch (error) {
        console.error('[LiveSpec] Failed to read bridge script:', error)
        res.status(500).send('// Failed to load bridge script')
      }
    })

    // Apply HTML Injection Middleware AFTER static file serving
    // This ensures HTML files are intercepted and modified
    app.use(createHTMLInjectionMiddleware())

    server = app.listen(port, () => {
      console.log(`Express server listening on port ${port}`)
      console.log(`Serving project folder: ${rootPath}`)
      console.log(`Bridge script available at: ${BRIDGE_SCRIPT_URL}`)
      resolve()
    })

    server.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * Stop the Express server
 */
export function stopExpressServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        app = null
        server = null
        currentRootPath = null
        console.log('Express server stopped')
        resolve()
      })
    } else {
      resolve()
    }
  })
}

/**
 * Get the current root path being served
 */
export function getCurrentRootPath(): string | null {
  return currentRootPath
}
