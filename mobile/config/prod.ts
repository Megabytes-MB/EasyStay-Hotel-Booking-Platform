import type { UserConfigExport } from '@tarojs/cli'
import baseConfig from './index'

const config: UserConfigExport = {
  ...baseConfig,
  defineConstants: {
    ...(baseConfig.defineConstants || {}),
    __DEV__: JSON.stringify(false)
  }
}

export default config
