export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/waiting/index',
    'pages/instructions/index',
    'pages/messages/index',
    'pages/department/index',
    'pages/calendar/index',
    'pages/confirm/index',
    'pages/records/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFFFFF',
    navigationBarTitleText: '消化内镜预约',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#8C8C8C',
    selectedColor: '#1989FA',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页'
      },
      {
        pagePath: 'pages/waiting/index',
        text: '候诊叫号'
      },
      {
        pagePath: 'pages/instructions/index',
        text: '检查须知'
      },
      {
        pagePath: 'pages/messages/index',
        text: '消息中心'
      }
    ]
  }
})
