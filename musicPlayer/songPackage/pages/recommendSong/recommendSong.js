import PubSub from 'pubsub-js'
import request from "../../../utils/request";
Page({

  /**
   * 页面的初始数据
   */
  data: {
    //当前的月份和几号
    month: '',
    day: '',
    //推荐歌单数据
    recommendList: [],
    //标识点击音乐的下标
    index: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    //判断用户是否登录(获取每日推荐的数据需要用户的登录)
    let userInfo = wx.getStorageSync('userInfo');

    //未登录显示提示框，并跳转到登录页面
    if (!userInfo){
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        success: () => {
          //跳转到登录页面
          wx.reLaunch({
            url: '/pages/login/login'
          })
        }
      });
    }

    //更新当前日期时间
    this.setData({
      month: new Date().getMonth() + 1,
      day: new Date().getDate()
    });

    //已登录获取推荐歌单的数据
    this.getRecommendList();

    //订阅来自songDetail发布的消息
    PubSub.subscribe('switchType', (msg, type) =>{
      let {recommendList, index} = this.data;
      if (type === 'pre'){//上一首
        //第一首的时候跳转到最后一首
        (index === 0) && (index = recommendList.length)
        index -= 1;
      }else{//下一首
        //最后一首的时候跳转到第一首
        (index === recommendList.length - 1) && (index = -1)
        index += 1;
      }
      //更新下标否则会一直是当前的小标,解决songDetail多次点击下一首时，musicId会连续改变
      this.setData({
        index
      })
      //获取上一首或下一首的音乐id
      let musicId = recommendList[index].id;
      //将音乐id 回传个songDetail页面,即发布消息
      PubSub.publish('musicId', musicId)
    });
  },

  //获取每日推荐的歌单数据
  async getRecommendList(){
    let recommendListData = await request('/recommend/songs');
    this.setData({
      recommendList: recommendListData.recommend
    })
  },

  //跳转歌曲详情页
  toSongDetail(event){
    //获取音乐的小标和歌曲id,将下标更新到data中
    let {index,song} = event.currentTarget.dataset;
    this.setData({
      index
    })
    //url传值的话要使用query传值，但传的值不能为对象和数组，要使用json转换为字符串，默传值到onLoad 生命周期函数的options中
    //传递值的数据太大的话会被剪裁掉，会有限制，所以这里使用id,传到详情页后再发请求，根据id查询歌曲的详细信息
    wx.navigateTo({
      // url: '/pages/songDetail/songDetail?song='+JSON.stringify(song)
      url: '/songPackage/pages/songDetail/songDetail?musicId='+song.id
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
