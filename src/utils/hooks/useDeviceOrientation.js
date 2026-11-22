import { useEffect, useState, useCallback } from 'react'
import { windowSizeTools } from '../windowSizeTools'

const isOrientationPortrait = ({ width, height }) => height >= width
const isOrientationLandscape = ({ width, height }) => width >= height

export default () => {
  const size = windowSizeTools.getSize()
  const [orientation, setOrientation] = useState({
    portrait: isOrientationPortrait(size),
    landscape: isOrientationLandscape(size),
  })

  const onChange = useCallback((nextSize) => {
    setOrientation({
      portrait: isOrientationPortrait(nextSize),
      landscape: isOrientationLandscape(nextSize),
    })
  }, [])

  useEffect(() => {
    const removeListener = windowSizeTools.onSizeChanged(onChange)
    return () => {
      removeListener()
    }
  }, [onChange])

  return orientation
}
