export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/city-picker/index',
    'pages/list/index',
    'pages/detail/index',
    'pages/login/index',
    'pages/user/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'Easy Stay 出行',
    navigationBarTextStyle: 'black'
  },
  permission: {
    'scope.userLocation': {
      desc: '用于展示您当前位置并提供到酒店的导航能力'
    }
  },
  requiredPrivateInfos: ['getLocation'],
  tabBar: {
    color: '#999',
    selectedColor: '#1890ff',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/icons/home.png',
        selectedIconPath: 'assets/icons/home-active.png'
      },
      {
        pagePath: 'pages/user/index',
        text: '我的',
        iconPath: 'assets/icons/user.png',
        selectedIconPath: 'assets/icons/user-active.png'
      }
    ]
  }
})
