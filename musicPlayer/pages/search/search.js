import request from "../../utils/request";
let isSend = false; //函数节流标志
Page({

  /**
   * 页面的初始数据
   */
  data: {
    //placeholder默认的内容
    placeholder: '',
    //热搜榜的数据
    hotList: [],
    //搜索框的改变数据
    searchContent: '',
    //模糊匹配的数据
    searchList: [],
    //搜索的历史记录
    historyList: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.getInitData();

    this.getSearchHistory();
  },

  //获取placeholder的初始化数据和热搜榜的数据
  async getInitData(){
    let placeholderData = await request('/search/default')
    let hotData = await request('/search/hot/detail')
    this.setData({
      placeholder: placeholderData.data.showKeyword,
      hotList: hotData.data
    })
  },

  //获取本地历史记录功能函数
  getSearchHistory() {
    let historyList = wx.getStorageSync('searchHistory');
    if (historyList){
      this.setData({
        historyList
      })
    }

  },

  //搜索框内容改变的回调
  handleInputChange(event){
    //更新search的数据到data中
    this.setData({
      searchContent: event.detail.value.trim()
    })
    //函数节流，性能优化，不用输入框每次变化后就发送请求
    if (isSend){
      return;
    }
    isSend = true;
    //第一次就直接发送请求
    this.getSearchList()
    //第二次后没300ms发一次请求
    setTimeout(() => {
      isSend = false;
    },300)

  },

  //根据关键字搜索模糊匹配
  async getSearchList() {
    //搜索框为空则不发请求
    if (!this.data.searchContent){
      this.setData({
        //将搜索列表置空，使热搜榜和搜索列表互斥
        searchList: []
      })
      return;
    }
    let {searchContent, historyList} = this.data;
    let searchListData = await request('/search', {keywords: searchContent, limit: 10});
    this.setData({
      searchList: searchListData.result.songs
    })

    //将搜索的关键字添加到搜索历史记录中
    //添加时判断该数组中是否已经存在该记录，存在的话就删除后在添加到第一个，否则就直接添加
    if (historyList.indexOf(searchContent) !== -1){
      historyList.splice(historyList.indexOf(searchContent) ,1)
    }
    historyList.unshift(searchContent)
    this.setData({
      historyList
    })

    //将搜索记录保存到本地
    wx.setStorageSync('searchHistory',historyList);
  },

  //清空搜索内容
  clearSearchContent(){
    //清空搜索框的内容
    this.setData({
      searchContent: '',
      searchList: []
    })

  },

  //删除搜索历史记录
  deleteSearch(){
    wx.showModal({
      content: '确认删除吗？',
      success:(res) => {
        if (res.confirm){
          //清空data中的historyList
          this.setData({
            historyList: []
          })
          //清空本地缓存
          wx.removeStorageSync('searchHistory');
        }
      }
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
