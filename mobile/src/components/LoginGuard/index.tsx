import React from 'react'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../store/useAuthStore'

interface Props {
  children: React.ReactNode
  onAuthed?: () => void
}

const LoginGuard: React.FC<Props> = ({ children, onAuthed }) => {
  const { isLogin } = useAuthStore()

  const handleClick = () => {
    if (!isLogin) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => Taro.navigateTo({ url: '/pages/login/index' }), 400)
      return
    }
    onAuthed?.()
  }

  return <View onClick={handleClick}>{children}</View>
}

export default LoginGuard
