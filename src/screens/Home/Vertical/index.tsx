import Content from './Content'
import PlayerBar from '@/components/player/PlayerBar'
import BottomNavBar from './BottomNavBar'

export default () => {
  return (
    <>
      <Content />
      <PlayerBar isHome />
      <BottomNavBar />
    </>
  )
}
