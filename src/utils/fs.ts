import { NativeEventEmitter, NativeModules, type EmitterSubscription } from 'react-native'
import {
  Dirs,
  FileSystem,
  AndroidScoped,
  type OpenDocumentOptions,
  type Encoding,
  type HashAlgorithm,
  getExternalStoragePaths as _getExternalStoragePaths,
} from 'react-native-file-system'

export type {
  FileType,
} from 'react-native-file-system'

// export const externalDirectoryPath = RNFS.ExternalDirectoryPath

export const extname = (name: string) => name.lastIndexOf('.') > 0 ? name.substring(name.lastIndexOf('.') + 1) : ''

export const temporaryDirectoryPath = Dirs.CacheDir
export const externalStorageDirectoryPath = Dirs.SDCardDir
export const privateStorageDirectoryPath = Dirs.DocumentDir

export const getExternalStoragePaths = async(is_removable?: boolean) => _getExternalStoragePaths(is_removable)

export const selectManagedFolder = async(isPersist: boolean = false) => AndroidScoped.openDocumentTree(isPersist)
export const selectFile = async(options: OpenDocumentOptions) => AndroidScoped.openDocument(options)
export const removeManagedFolder = async(path: string) => AndroidScoped.releasePersistableUriPermission(path)
export const getManagedFolders = async() => AndroidScoped.getPersistedUriPermissions()

export const getPersistedUriList = async() => AndroidScoped.getPersistedUriPermissions()


export const readDir = async(path: string) => FileSystem.ls(path)

export const unlink = async(path: string) => FileSystem.unlink(path)

export const mkdir = async(path: string) => FileSystem.mkdir(path)

export const stat = async(path: string) => FileSystem.stat(path)
export const hash = async(path: string, algorithm: HashAlgorithm) => FileSystem.hash(path, algorithm)

export const readFile = async(path: string, encoding?: Encoding) => FileSystem.readFile(path, encoding)


// export const copyFile = async(fromPath: string, toPath: string) => FileSystem.cp(fromPath, toPath)

export const moveFile = async(fromPath: string, toPath: string) => FileSystem.mv(fromPath, toPath)
export const gzipFile = async(fromPath: string, toPath: string) => FileSystem.gzipFile(fromPath, toPath)
export const unGzipFile = async(fromPath: string, toPath: string) => FileSystem.unGzipFile(fromPath, toPath)
export const gzipString = async(data: string, encoding?: Encoding) => FileSystem.gzipString(data, encoding)
export const unGzipString = async(data: string, encoding?: Encoding) => FileSystem.unGzipString(data, encoding)

export const existsFile = async(path: string) => FileSystem.exists(path)

export const rename = async(path: string, name: string) => FileSystem.rename(path, name)

export const writeFile = async(path: string, data: string, encoding?: Encoding) => FileSystem.writeFile(path, data, encoding)

export const appendFile = async(path: string, data: string, encoding?: Encoding) => FileSystem.appendFile(path, data, encoding)

export interface DownloadBeginCallbackResult {
  jobId: number
  statusCode: number
  contentLength: number
  headers: Record<string, string>
}

export interface DownloadProgressCallbackResult {
  jobId: number
  contentLength: number
  bytesWritten: number
}

export interface DownloadResult {
  jobId: number
  statusCode: number
  bytesWritten: number
}

export interface DownloadFileOptions {
  headers?: Record<string, string>
  progressInterval?: number
  progressDivider?: number
  connectionTimeout?: number
  readTimeout?: number
  begin?: (res: DownloadBeginCallbackResult) => void
  progress?: (res: DownloadProgressCallbackResult) => void
}

let downloadJobSeq = 1
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const utilsEventEmitter = new NativeEventEmitter(NativeModules.UtilsModule)

export const downloadFile = (url: string, path: string, options: DownloadFileOptions = {}): {
  jobId: number
  promise: Promise<DownloadResult>
} => {
  const jobId = downloadJobSeq++
  const headers = options.headers ?? {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Mobile Safari/537.36',
  }
  const subs: EmitterSubscription[] = []
  if (options.begin) {
    const onBegin = options.begin
    subs.push(utilsEventEmitter.addListener('download-begin', (evt: DownloadBeginCallbackResult) => {
      if (evt.jobId === jobId) onBegin(evt)
    }))
  }
  if (options.progress) {
    const onProgress = options.progress
    subs.push(utilsEventEmitter.addListener('download-progress', (evt: DownloadProgressCallbackResult) => {
      if (evt.jobId === jobId) onProgress(evt)
    }))
  }

  const promise = (NativeModules.UtilsModule.downloadFile({
    jobId,
    fromUrl: url,
    toFile: path,
    headers,
    connectionTimeout: options.connectionTimeout ?? 15000,
    readTimeout: options.readTimeout ?? 30000,
    progressInterval: options.progressInterval ?? 500,
    progressDivider: options.progressDivider ?? 0,
    hasBeginCallback: !!options.begin,
    hasProgressCallback: !!options.progress,
  }) as Promise<DownloadResult>).finally(() => {
    for (const sub of subs) sub.remove()
  })

  return { jobId, promise }
}

export const stopDownload = (jobId: number) => {
  NativeModules.UtilsModule.stopDownload(jobId)
}
