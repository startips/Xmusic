import { useEffect, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import Image, { getSize } from '@/components/common/Image'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { scaleSizeH } from '@/utils/pixelRatio'
import { useTheme } from '@/store/theme/hook'
import { M3Radius } from '@/theme/m3'

const MAX_IMAGE_HEIGHT = scaleSizeH(260)


export default ({ url, maxWidth }: { url: string, maxWidth: number }) => {
  const [show, setShow] = useState(false)
  const [wh, setWH] = useState({ width: 0, height: 0 })
  const theme = useTheme()

  useEffect(() => {
    let cancelled = false
    getSize(url, (realWidth, realHeight) => {
      if (cancelled || !realWidth || !realHeight) return
      let w = realWidth
      let h = realHeight

      if (maxWidth && w > maxWidth) {
        w = maxWidth
        h = realHeight * (w / realWidth)
      }
      if (MAX_IMAGE_HEIGHT && h > MAX_IMAGE_HEIGHT) {
        h = MAX_IMAGE_HEIGHT
        w = realWidth * (h / realHeight)
      }
      setWH({ width: Math.round(w), height: Math.round(h) })
    })
    return () => {
      cancelled = true
    }
  }, [maxWidth, url])

  return (
    wh.width ? (
      <View style={{ height: wh.height, width: wh.width }}>
        {
          show ? (<Image
            url={url}
            style={{ height: wh.height, width: wh.width, borderRadius: M3Radius.md, borderWidth: 0.6, borderColor: theme['m3-outline-variant'] }}
          />) : (
            <TouchableOpacity
              activeOpacity={0.75}
              style={{ ...styles.defaultPic, borderColor: theme['m3-outline-variant'], backgroundColor: theme['m3-surface-container-high'] }}
              onPress={() => { setShow(true) }}
            >
              <Text size={13} color={theme['m3-on-surface-variant']}>{global.i18n.t('comment_show_image')}</Text>
            </TouchableOpacity>
          )
        }
      </View>
    ) : null
  )
}

const styles = createStyle({
  defaultPic: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.6,
    borderRadius: M3Radius.md,
  },
})
