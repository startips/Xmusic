import { memo, useState, useMemo, useCallback } from 'react'
import { StyleSheet, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { type Comment } from '../utils'
import Text from '@/components/common/Text'
import { scaleSizeW } from '@/utils/pixelRatio'
import { useLayout } from '@/utils/hooks'
import { useI18n } from '@/lang'
import Image from '@/components/common/Image'
import CommentImage from './CommentImage'
import CommentText from './CommentText'
import { M3Radius, withAlpha } from '@/theme/m3'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultUser = require('@/resources/images/defaultUser.jpg')

const avatarWidth = scaleSizeW(36)

const CommentFloor = memo(({ comment, isLast, isReply }: {
  comment: Comment
  isLast?: boolean
  isReply?: boolean
}) => {
  const theme = useTheme()
  const [isAvatarError, setIsAvatarError] = useState(false)
  const { onLayout, width } = useLayout()
  const t = useI18n()

  const handleAvatarError = useCallback(() => {
    setIsAvatarError(true)
  }, [])

  const replyComments = useMemo(() => {
    if (!comment.reply?.length) return null
    const endIndex = comment.reply.length - 1
    return (
      <View style={{ ...styles.replyFloor, backgroundColor: withAlpha(theme['m3-surface-container-low'], 0.85), borderColor: theme['m3-outline-variant'] }}>
        {
          comment.reply.map((c, index) => (
            <CommentFloor comment={c} isLast={index === endIndex} isReply key={`${comment.id}_${c.id}`} />
          ))
        }
      </View>
    )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const likedCount = useMemo(() => {
    if (comment.likedCount == null) return null
    return (
      <View style={{ ...styles.like, backgroundColor: theme['m3-surface-container-high'] }}>
        <Icon name="thumbs-up" style={{ color: theme['m3-on-surface-variant'] }} size={11} />
        <Text style={styles.likedCount} size={11.5} color={theme['m3-on-surface-variant']}>{comment.likedCount}</Text>
      </View>
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <View
      style={
        isReply
          ? {
              ...styles.replyItem,
              borderBottomColor: theme['m3-outline-variant'],
              borderBottomWidth: isLast ? 0 : 0.6,
              paddingBottom: isLast ? 0 : 10,
            }
          : {
              ...styles.container,
              backgroundColor: withAlpha(theme['m3-surface-container'], 0.72),
              borderColor: theme['m3-outline-variant'],
            }
      }
    >
      <View style={styles.comment}>
        <View>
          <Image
            url={comment.avatar && !isAvatarError ? comment.avatar : defaultUser}
            onError={handleAvatarError}
            style={stylesRaw.avatar} />
        </View>
        <View style={styles.right}>
          <View style={styles.info}>
            <View style={styles.userMeta}>
              <Text selectable numberOfLines={1} size={14} style={styles.userName} color={theme['m3-on-surface']}>
                {comment.userName}
              </Text>
              <View style={styles.metaInfo}>
                <Text numberOfLines={1} size={11.5} color={theme['m3-on-surface-variant']}>{comment.timeStr}</Text>
                { comment.location ? <Text numberOfLines={1} style={styles.location} size={11.5} color={theme['m3-on-surface-variant']}>{t('location', { location: comment.location })}</Text> : null }
              </View>
            </View>
            {likedCount}
          </View>
          <CommentText text={comment.text} />
          {
            comment.images?.length
              ? (
                  <View style={styles.images} onLayout={onLayout}>
                    {
                      comment.images.map((url, index) => <CommentImage key={String(index)} url={url} maxWidth={width} />)
                    }
                  </View>
                )
              : null
          }
        </View>
      </View>
      {replyComments}
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    marginBottom: 10,
    padding: 12,
    borderRadius: M3Radius.lg,
    borderWidth: 0.6,
  },
  replyItem: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 10,
  },
  comment: {
    flex: 1,
    flexDirection: 'row',
  },
  right: {
    flex: 1,
    paddingLeft: 10,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userMeta: {
    flex: 1,
    paddingRight: 8,
  },
  userName: {
    fontWeight: '600',
  },
  metaInfo: {
    marginTop: 2,
    flexDirection: 'row',
  },
  location: {
    marginLeft: 10,
  },
  like: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: M3Radius.full,
  },
  likedCount: {
    marginLeft: 4,
  },
  images: {
    paddingTop: 8,
    width: '100%',
    flexDirection: 'row',
  },
  replyFloor: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 2,
    borderRadius: M3Radius.md,
    borderWidth: 0.6,
  },
})

const stylesRaw = StyleSheet.create({
  avatar: {
    height: avatarWidth,
    width: avatarWidth,
    borderRadius: M3Radius.full,
  },
})

export default CommentFloor
