import { useCommentAction } from '../../components/actionHooks'
import Btn from './Btn'

export default () => {
  const handleShowCommentScreen = useCommentAction()
  return <Btn icon="comment" onPress={handleShowCommentScreen} />
}
