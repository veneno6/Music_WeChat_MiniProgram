import request from "../../utils/request";

let startY = 0;
let moveY = 0;
let moveDistance = 0;
Page({

  /**
   * 页面的初始数据
   */
  data: {
    //纵向移动的style数据,默认不移动
    coverTransform: 'translateY(0)',
    //回弹一秒的过渡
    coverTransition: '',
    //用户登录的数据
    userInfo: {},
    //用户播放记录的数据
    recentPlayList: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    //获取本地登录的用户数据，页面的跳转涉及到生命周期，如果用switchTab跳转，下面不会执行
    //解决方法 1.放到onShow()中，但是每次页面显示都要执行消耗性能，2.建议使用reLaunch
    let userInfo = wx.getStorageSync('userInfo');
    if (userInfo){
      //要转换json对象为字符串
      this.setData({
        userInfo: JSON.parse(userInfo)
      })
      //获取用户播放记录 async 不要放到生命周期函数上，放了会出现意想不到的bug
      this.getUserRecentPlayList(this.data.userInfo.userId);
    }

  },

  //获取用户播放记录的功能函数
  async getUserRecentPlayList(userId) {
    //获取用户的播放记录，一共有100条，没必要全部获取，所以截取前10个，并改造每个数据增加id段，给key用
    let recentPlayListData = await request('/user/record',{uid: userId,type: 0});
    //截取数据，并改造数据
    let index = 0;
    let recentPlayList = recentPlayListData.allData.slice(0, 10).map(item => {
      item.id = index++;
      return item;
    });
    //设置到页面数据域
    this.setData({
      recentPlayList
    })

  },

  bindTouchStart(event){
    //取消每次滑动时的过渡效果取消
    this.setData({
      coverTransition: ''
    })
    //获取数组中第一个手指点击屏幕的纵向坐标
    startY = event.touches[0].clientY;
  },

  bindTouchMove(event){
    moveY = event.touches[0].clientY;
    moveDistance = moveY - startY;
    if(moveDistance <= 0){
      //仅向下移动
      return;
    }
    if (moveDistance >= 80){
      //仅向下移动80
      moveDistance = 80;
    }
    //设置纵向移动的距离到data中
    this.setData({
      //使用es6模板语法来拼接
      coverTransform: `translateY(${moveDistance}rpx)`
    })
  },

  bindTouchEnd(){
    //手指松开后回弹
    this.setData({
      //使用es6模板语法来拼接
      coverTransform: `translateY(0)`,
      coverTransition: 'transform 1s linear'
    })
  },

  //跳转到登录页面
  toLogin(){
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})
