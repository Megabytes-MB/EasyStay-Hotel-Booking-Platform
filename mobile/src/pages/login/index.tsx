import React, { useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../store/useAuthStore'
import { sendCode } from '../../services/auth'
import './index.scss'

declare const process: {
  env: {
    NODE_ENV?: string
  }
}

const isDevMode = process.env.NODE_ENV !== 'production'

const Login = () => {
  const { login, loginWithWechat, loginWithWechatPhone, register } = useAuthStore()
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [sending, setSending] = useState(false)

  const handleLogin = async () => {
    if (!username || username.length < 3) {
      Taro.showToast({ title: '请输入用户名（至少 3 位）', icon: 'none' })
      return
    }
    if (!password || password.length < 6) {
      Taro.showToast({ title: '请输入密码（至少 6 位）', icon: 'none' })
      return
    }

    const success = await login({ username, password })
    if (success) {
      setTimeout(() => Taro.navigateBack(), 500)
    }
  }

  const handleWechatPhoneLogin = async (event: any) => {
    const detail = event?.detail || {}

    if (detail.errMsg !== 'getPhoneNumber:ok' || !detail.code) {
      Taro.showToast({ title: '请先授权微信手机号', icon: 'none' })
      return
    }

    const success = await loginWithWechatPhone(detail.code)
    if (success) {
      setTimeout(() => Taro.navigateBack(), 500)
    }
  }

  const handleDevWechatLogin = async () => {
    if (!isDevMode) return

    const success = await loginWithWechat()
    if (success) {
      setTimeout(() => Taro.navigateBack(), 500)
    }
  }

  const handleRegister = async () => {
    if (!username || username.length < 3) {
      Taro.showToast({ title: '请输入用户名（至少 3 位）', icon: 'none' })
      return
    }
    if (!password || password.length < 6) {
      Taro.showToast({ title: '请输入密码（至少 6 位）', icon: 'none' })
      return
    }

    const success = await register({ username, password, phone, verifyCode })
    if (success) {
      setIsRegister(false)
    }
  }

  const handleSendCode = async () => {
    if (!phone || phone.length < 6) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    if (sending) return

    setSending(true)
    try {
      const response = await sendCode(phone)
      if (response.code === 200) {
        Taro.showToast({
          title: '验证码已发送（开发环境固定码 123456）',
          icon: 'none',
        })
      } else {
        Taro.showToast({ title: response.message || '发送失败', icon: 'none' })
      }
    } catch (error: any) {
      Taro.showToast({ title: error.message || '发送失败', icon: 'none' })
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = () => {
    if (isRegister) {
      void handleRegister()
    } else {
      void handleLogin()
    }
  }

  return (
    <View className='page login-page'>
      <View className='card login-card'>
        <Text className='title'>{isRegister ? '注册账号' : '欢迎回来'}</Text>

        <View className='field'>
          <Text className='label'>用户名</Text>
          <Input
            type='text'
            value={username}
            placeholder='请输入用户名'
            onInput={e => setUsername(e.detail.value)}
          />
        </View>

        <View className='field'>
          <Text className='label'>密码</Text>
          <Input
            type='password'
            password
            value={password}
            placeholder='请输入密码'
            onInput={e => setPassword(e.detail.value)}
          />
        </View>

        {isRegister && (
          <View className='field'>
            <Text className='label'>手机号（可选）</Text>
            <Input
              type='number'
              value={phone}
              placeholder='请输入手机号'
              onInput={e => setPhone(e.detail.value)}
            />
          </View>
        )}

        {isRegister && (
          <View className='field'>
            <Text className='label'>验证码</Text>
            <View className='code-row'>
              <Input
                type='number'
                value={verifyCode}
                placeholder='请输入验证码'
                onInput={e => setVerifyCode(e.detail.value)}
              />
              <View
                className={`code-btn ${sending ? 'disabled' : ''}`}
                onClick={handleSendCode}
              >
                {sending ? '发送中' : '获取验证码'}
              </View>
            </View>
          </View>
        )}

        <Button className='btn' onClick={handleSubmit}>
          {isRegister ? '注册' : '登录'}
        </Button>

        {!isRegister && (
          <Button
            className='btn wechat'
            openType='getPhoneNumber'
            onGetPhoneNumber={handleWechatPhoneLogin}
          >
            微信号码一键登录
          </Button>
        )}

        {!isRegister && isDevMode && (
          <Button className='btn wechat-dev' onClick={handleDevWechatLogin}>
            开发环境快速登录（免授权）
          </Button>
        )}

        <View className='toggle-mode' onClick={() => setIsRegister(!isRegister)}>
          <Text className='toggle-text'>
            {isRegister ? '已有账号？点击登录' : '没有账号？点击注册'}
          </Text>
        </View>
      </View>
    </View>
  )
}

export default Login
