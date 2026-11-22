import { httpGet } from '@/utils/request'
import { name } from '../../package.json'
import { downloadFile, stopDownload, temporaryDirectoryPath } from '@/utils/fs'
import { getSupportedAbis, installApk } from '@/utils/nativeModules/utils'
import { APP_PROVIDER_NAME } from '@/config/constant'

const FORK_OWNER = 'startips'
const FORK_REPO = 'Xmusic'

const abis = [
  'arm64-v8a',
  'armeabi-v7a',
  'x86_64',
  'x86',
  'universal',
]

const JSDELIVR_HOSTS = [
  'https://cdn.jsdelivr.net',
  'https://fastly.jsdelivr.net',
  'https://gcore.jsdelivr.net',
]

const address = [
  [`https://raw.githubusercontent.com/${FORK_OWNER}/${FORK_REPO}/master/publish/version.json`, 'direct'],
  [`https://data.jsdelivr.com/v1/package/gh/${FORK_OWNER}/${FORK_REPO}`, 'jsdelivrTag'],
  [`https://api.github.com/repos/${FORK_OWNER}/${FORK_REPO}/releases/latest`, 'githubRelease'],
  [`https://cdn.jsdelivr.net/gh/${FORK_OWNER}/${FORK_REPO}@master/publish/version.json`, 'direct'],
  [`https://fastly.jsdelivr.net/gh/${FORK_OWNER}/${FORK_REPO}@master/publish/version.json`, 'direct'],
  [`https://gcore.jsdelivr.net/gh/${FORK_OWNER}/${FORK_REPO}@master/publish/version.json`, 'direct'],
]

const appendCacheBuster = (url) => {
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}t=${Date.now()}`
}

const request = async(url, { retryNum = 0, bustCache = true, headers = {} } = {}) => {
  const reqUrl = bustCache ? appendCacheBuster(url) : url
  return new Promise((resolve, reject) => {
    httpGet(reqUrl, {
      timeout: 6000,
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0',
        Pragma: 'no-cache',
        ...headers,
      },
    }, (err, resp, body) => {
      if (err || resp.statusCode != 200) {
        ++retryNum >= 2
          ? reject(err || new Error(resp.statusMessage || resp.statusCode))
          : request(url, { retryNum, bustCache, headers }).then(resolve).catch(reject)
      } else resolve(body)
    })
  })
}

const getDirectInfo = async(url, bustCache = true) => {
  return request(url, { bustCache }).then(info => {
    if (info?.version == null) throw new Error('failed')
    return info
  })
}

const getJsDelivrTagInfo = async(url) => {
  const pkg = await request(url)
  const latestVer = Array.isArray(pkg?.versions) ? pkg.versions[0] : null
  if (!latestVer) throw new Error('no versions')
  const tagCandidates = latestVer.startsWith('v') ? [latestVer] : [`v${latestVer}`, latestVer]
  let lastErr
  for (const tag of tagCandidates) {
    for (const host of JSDELIVR_HOSTS) {
      try {
        // Tagged release assets are immutable on jsDelivr, avoiding @master 12h CDN staleness
        return await getDirectInfo(`${host}/gh/${FORK_OWNER}/${FORK_REPO}@${tag}/publish/version.json`, false)
      } catch (err) {
        lastErr = err
      }
    }
  }
  throw lastErr || new Error('failed')
}

const getGithubReleaseInfo = async(url) => {
  const release = await request(url, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  })
  const rawTag = typeof release?.tag_name === 'string' ? release.tag_name.trim() : ''
  const version = rawTag.replace(/^v/i, '')
  if (!version) throw new Error('failed')
  return {
    version,
    desc: typeof release?.body === 'string' ? release.body : '',
    history: [],
  }
}

const getNpmPkgInfo = async(url) => {
  return request(url).then(json => {
    if (!json.versionInfo) throw new Error('failed')
    const info = JSON.parse(json.versionInfo)
    if (info.version == null) throw new Error('failed')
    return info
  })
}

export const getVersionInfo = async(index = 0) => {
  const [url, source] = address[index]
  let promise
  switch (source) {
    case 'direct':
      promise = getDirectInfo(url)
      break
    case 'jsdelivrTag':
      promise = getJsDelivrTagInfo(url)
      break
    case 'githubRelease':
      promise = getGithubReleaseInfo(url)
      break
    case 'npm':
      promise = getNpmPkgInfo(url)
      break
  }

  return promise.catch(async(err) => {
    index++
    if (index >= address.length) throw err
    return getVersionInfo(index)
  })
}

const getTargetAbi = async() => {
  const supportedAbis = await getSupportedAbis()
  for (const abi of abis) {
    if (supportedAbis.includes(abi)) return abi
  }
  return abis[abis.length - 1]
}
let downloadJobId = null
const noop = (total, download) => {}
let apkSavePath

export const downloadNewVersion = async(version, onDownload = noop) => {
  const abi = await getTargetAbi()
  const url = `https://github.com/${FORK_OWNER}/${FORK_REPO}/releases/download/v${version}/${name}-v${version}-${abi}.apk`
  let savePath = temporaryDirectoryPath + '/xmusic-mobile.apk'

  if (downloadJobId) stopDownload(downloadJobId)

  const { jobId, promise } = downloadFile(url, savePath, {
    progressInterval: 500,
    connectionTimeout: 20000,
    readTimeout: 30000,
    begin({ statusCode, contentLength }) {
      onDownload(contentLength, 0)
      // switch (statusCode) {
      //   case 200:
      //   case 206:
      //     break
      //   default:
      //     onDownload(null, contentLength, 0)
      //     break
      // }
    },
    progress({ contentLength, bytesWritten }) {
      onDownload(contentLength, bytesWritten)
    },
  })
  downloadJobId = jobId
  return promise.then(() => {
    apkSavePath = savePath
    return updateApp()
  })
}

export const updateApp = async() => {
  if (!apkSavePath) throw new Error('apk Save Path is null')
  await installApk(apkSavePath, APP_PROVIDER_NAME)
}
