// import { generateKeyPair } from 'crypto'
import { gzipString, unGzipString } from '@/utils/fs'
import BackgroundTimer from 'react-native-background-timer'

export const request = async(url: string, { timeout = 10000, ...options }: RequestInit & { timeout?: number } = {}) => {
  const controller = new AbortController()
  let id: number | null = BackgroundTimer.setTimeout(() => {
    id = null
    controller.abort()
  }, timeout)
  return fetch(url, {
    ...options,
    signal: controller.signal,
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  }).then(async(response) => {
    const text = await response.text()
    return {
      text,
      code: response.status,
    }
  }).catch(err => {
    // console.log(err, err.code, err.message)
    throw err
  }).finally(() => {
    if (id == null) return
    BackgroundTimer.clearTimeout(id)
  })
}


export { generateRsaKey } from '@/utils/nativeModules/crypto'


export const encryptMsg = async(keyInfo: LX.Sync.KeyInfo, msg: string): Promise<string> => {
  return msg.length > 1024
    ? 'cg_' + await gzipString(msg)
    : msg
  // if (!keyInfo) return ''
  // return aesEncrypt(msg, keyInfo.key, keyInfo.iv)
}

export const decryptMsg = async(keyInfo: LX.Sync.KeyInfo, enMsg: string): Promise<string> => {
  return enMsg.substring(0, 3) == 'cg_'
    ? unGzipString(enMsg.replace('cg_', ''))
    : enMsg
  // if (!keyInfo) return ''
  // let msg = ''
  // try {
  //   msg = aesDecrypt(enMsg, keyInfo.key, keyInfo.iv)
  // } catch (err) {
  //   console.log(err)
  // }
  // return msg
}


export const parseUrl = (href: string): LX.Sync.UrlInfo => {
  // const url = new URL(host)
  // console.log(host)
  // let hostPath = url.host + url.pathname
  // let href = url.href
  if (href.endsWith('/')) href = href.replace(/\/$/, '')
  // if (href.endsWith('/')) href = href.replace(/\/$/, '')
  const httpProtocol = /^https:/.test(href) ? 'https:' : 'http:'

  console.log({
    wsProtocol: httpProtocol == 'https:' ? 'wss:' : 'ws:',
    httpProtocol,
    hostPath: href.replace(httpProtocol + '//', ''),
    href,
  })

  return {
    wsProtocol: httpProtocol == 'https:' ? 'wss:' : 'ws:',
    httpProtocol,
    hostPath: href.replace(httpProtocol + '//', ''),
    href,
  }
}
