import { useDidShow } from '@tarojs/taro'
import './app.scss'

function App({ children }) {
  useDidShow(() => {
    // App lifecycle hook placeholder
  })

  return children
}

export default App
