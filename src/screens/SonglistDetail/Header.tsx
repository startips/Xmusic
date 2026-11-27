import { forwardRef, memo, useEffect, useImperativeHandle, useState } from 'react'
import { View } from 'react-native'
import ButtonBar from './ActionBar'
import { useNavigationComponentDidAppear } from '@/navigation'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { scaleSizeW } from '@/utils/pixelRatio'
import { useTheme } from '@/store/theme/hook'
import Text, { AnimatedText } from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import Image from '@/components/common/Image'
import { useListInfo } from './state'
import { useAnimateOnecNumber } from '@/utils/hooks/useAnimateNumber'
import { useStatusbarHeight } from '@/store/common/hook'
import { M3Radius, withAlpha } from '@/theme/m3'

const IMAGE_WIDTH = scaleSizeW(84)

const CountText = memo(({ count }: { count: string }) => {
  const [animFade] = useAnimateOnecNumber(0, 1, 250, false)
  const [animTranslateY] = useAnimateOnecNumber(10, 0, 250, false)
  return (
    <AnimatedText style={{
      ...styles.playCount,
      opacity: animFade,
      transform: [
        { translateY: animTranslateY },
      ],
    }} numberOfLines={ 1 }>{count}</AnimatedText>
  )
}, (prevProps, nextProps) => {
  return prevProps.count === nextProps.count
})

const Pic = ({ componentId, playCount, imgUrl }: {
  componentId: string
  playCount: string
  imgUrl?: string
}) => {
  const [pic, setPic] = useState(imgUrl)
  const [animated, setAnimated] = useState(false)
  const info = useListInfo()
  useEffect(() => {
    if (animated || !pic) setPic(imgUrl)
  }, [imgUrl, animated, pic])

  useNavigationComponentDidAppear(componentId, () => {
    setAnimated(true)
  })

  return (
    <View style={{ ...styles.listItemImg, width: IMAGE_WIDTH, height: IMAGE_WIDTH }}>
      <Image nativeID={`${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_to_${info.source}_${info.id}`} url={pic} style={{ flex: 1, borderRadius: M3Radius.md }} />
      {
        playCount && animated ? <CountText count={playCount} /> : null
      }
    </View>
  )
}

export interface HeaderProps {
  componentId: string
  onBack?: () => void
}

export interface HeaderType {
  setInfo: (info: DetailInfo) => void
}
export interface DetailInfo {
  name: string
  desc: string
  playCount: string
  imgUrl?: string
}

export default forwardRef<HeaderType, HeaderProps>(({ componentId, onBack }: HeaderProps, ref) => {
  const statusBarHeight = useStatusbarHeight()
  const theme = useTheme()
  const info = useListInfo()
  const [detailInfo, setDetailInfo] = useState<DetailInfo>({ name: '', desc: '', playCount: '', imgUrl: info.img })

  useImperativeHandle(ref, () => ({
    setInfo(info) {
      setDetailInfo(info)
    },
  }), [])

  return (
    <View style={{ ...styles.wrapper, paddingTop: statusBarHeight + 8 }}>
      <View
        style={{
          ...styles.heroCard,
          backgroundColor: withAlpha(theme['m3-surface-container'], 0.85),
        }}
      >
        <View style={styles.heroTopRow}>
          <Pic componentId={componentId} playCount={detailInfo.playCount} imgUrl={detailInfo.imgUrl} />
          <View style={styles.infoCol}>
            <Text nativeID={NAV_SHEAR_NATIVE_IDS.songlistDetail_title} size={16} color={theme['m3-on-surface']} style={styles.title} numberOfLines={2}>
              {detailInfo.name || info.name}
            </Text>
            {
              detailInfo.desc
                ? <Text size={12.5} color={theme['m3-on-surface-variant']} style={styles.desc} numberOfLines={3}>{detailInfo.desc}</Text>
                : null
            }
          </View>
        </View>
        <ButtonBar onBack={onBack} />
      </View>
    </View>
  )
})

const styles = createStyle({
  wrapper: {
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  heroCard: {
    borderRadius: 22,
    padding: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    paddingLeft: 14,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    lineHeight: 22,
  },
  desc: {
    marginTop: 6,
    lineHeight: 18,
  },
  listItemImg: {
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
    borderRadius: M3Radius.md,
  },
  playCount: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    right: 5,
    fontSize: 10.5,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.56)',
    color: '#fff',
    borderRadius: M3Radius.full,
    textAlign: 'center',
  },
})
