import { useNavigationBarHeight } from '@/store/common/hook'
import LyricList from '../components/LyricList'

export default ({ onLongPressLyric }: { onLongPressLyric?: (lineIndex: number) => void }) => {
  const navBarHeight = useNavigationBarHeight()

  return (
    <LyricList
      fontSizeSettingKey="playDetail.horizontal.style.lrcFontSize"
      activeViewPosition={0.42}
      contentContainerStyle={navBarHeight > 0 ? { paddingBottom: navBarHeight } : undefined}
      onLongPressLyric={onLongPressLyric}
    />
  )
}
