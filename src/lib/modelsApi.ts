import { isPublicModelPath } from '../core/equipmentType'
import { getSupabase } from './supabase'

export const MODELS_BUCKET = 'equipment-models'
/** Largest accepted model file (also enforced by the storage bucket). */
export const MAX_MODEL_BYTES = 20 * 1024 * 1024

/** Keeps letters, digits, dot, dash and underscore; everything else becomes "_". */
export function safeFileName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^[._]+/, '')
  const base = cleaned.toLowerCase().endsWith('.glb') ? cleaned : `${cleaned}.glb`
  return base.length > 100 ? `${base.slice(0, 96)}.glb` : base
}

/** Storage path of a model: <user id>/<type id>/<file name>. */
export function modelPath(userId: string, typeId: string, fileName: string): string {
  return `${userId}/${typeId}/${safeFileName(fileName)}`
}

export const GLB_MIME = 'model/gltf-binary'

/**
 * The file's bytes labelled as glTF binary. Browsers report .glb files as
 * application/octet-stream (or nothing), and the storage client sends a File's own type,
 * which the bucket rejects; a Blob with the right type is accepted.
 */
export function asGlbBlob(file: Blob): Blob {
  return file.type === GLB_MIME ? file : new Blob([file], { type: GLB_MIME })
}

/** Uploads a model file into the user's folder; returns its storage path. */
export async function uploadModel(userId: string, typeId: string, file: File): Promise<string> {
  const path = modelPath(userId, typeId, file.name)
  const { error } = await getSupabase()
    .storage.from(MODELS_BUCKET)
    .upload(path, asGlbBlob(file), { contentType: GLB_MIME, upsert: true })
  if (error) throw error
  return path
}

/** URL of a public catalogue model (served from `public/`, respects the app's base path). */
export function publicModelUrl(path: string, base: string = import.meta.env.BASE_URL): string {
  return `${base.endsWith('/') ? base : `${base}/`}${path}`
}

const urls = new Map<string, Promise<string>>()

/**
 * Local object URL of a stored model (downloaded once per session). The bucket is private,
 * so the file is fetched with the user's session and served to three.js from memory.
 */
export function modelObjectUrl(path: string): Promise<string> {
  // The same promise for the same path: React's use() suspends again on a new one.
  let url = urls.get(path)
  if (!url && isPublicModelPath(path)) {
    // Models of the public catalogue are static files of the app.
    url = Promise.resolve(publicModelUrl(path))
    urls.set(path, url)
  }
  if (!url) {
    url = getSupabase()
      .storage.from(MODELS_BUCKET)
      .download(path)
      .then(({ data, error }) => {
        if (error || !data) throw error ?? new Error('Model download failed')
        return URL.createObjectURL(data)
      })
    url.catch(() => urls.delete(path))
    urls.set(path, url)
  }
  return url
}
