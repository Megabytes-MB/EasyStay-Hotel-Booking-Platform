import React, { useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../store/useAuthStore'
import './index.scss'

const Login = () => {
  const { login } = useAuthStore()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')

  const handleLogin = () => {
    if (!phone || phone.length < 6) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    if (!code) {
      Taro.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }
    login({ phone })
    Taro.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => Taro.navigateBack(), 300)
  }

  const handleWechat = () => {
    login({ phone: '微信授权用户' })
    Taro.showToast({ title: '授权登录成功', icon: 'success' })
    setTimeout(() => Taro.navigateBack(), 300)
  }

  return (
    <View className="page login-page">
      <View className="card login-card">
        <Text className="title">欢迎回来</Text>
        <View className="field">
          <Text className="label">手机号</Text>
          <Input
            type="number"
            value={phone}
            placeholder="请输入手机号"
            onInput={e => setPhone(e.detail.value)}
          />
        </View>
        <View className="field">
          <Text className="label">验证码</Text>
          <Input
            type="number"
            value={code}
            placeholder="输入验证码（模拟）"
            onInput={e => setCode(e.detail.value)}
          />
        </View>
        <Button className="btn" onClick={handleLogin}>
          登录/注册
        </Button>
        <Button className="btn wechat" onClick={handleWechat}>
          微信一键授权
        </Button>
      </View>
    </View>
  )
}

export default Login
