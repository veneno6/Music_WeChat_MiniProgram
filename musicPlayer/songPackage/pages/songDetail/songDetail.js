//导入第三方消息发布和订阅的库
import PubSub from 'pubsub-js'
//导入第三方日期格式化对的库
import moment from "moment";
import request from "../../../utils/request";
//获取全局App
const appInstance = getApp();
Page({

  /**
   * 页面的初始数据
   */
  data: {
    //音乐是否播放，同时控制摇杆的旋转
    isPlay: false,
    //歌曲的详细信息
    song: {},
    //音乐的Id
    musicId: '',
    //当前音乐播放的链接
    musicLink: '',
    //当前的播放时间
    currentTime: '00:00',
    //播放的总时长
    durationTime: '00:00',
    //进度条的实时宽度
    currentWidth: 0,
    //歌词
    lyric: [],
    //歌词对应的时间
    lyricTime: 0,
    //当前歌词对象
    currentLyric: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    //options用于接收路由跳转中query传递的参数
    //传递的参数会有限制，如果参数过长会自动被剪切，所以在解析对象时会保错
    // console.log(options)
    // console.log(JSON.parse(options.song))

    //获取传入的id
    let musicId = options.musicId;
    //设置音乐id 到数据中
    this.setData({
      musicId
    })
    this.getMusicInfo(musicId)
    //获取音乐歌词
    this.getLyric(musicId);

    //判断当前页面播放的音乐是否和全局的播放音乐一致，解决音乐详情页面回退后，在进入该页面页面中的音乐为暂停的状态
    if (appInstance.isMusicPlay && appInstance.musicId === musicId){
      this.setData({
        isPlay: true
      })
    }

    /*
   * 问题： 如果用户操作系统的控制音乐播放/暂停的按钮，页面不知道，导致页面显示是否播放的状态和真实的音乐播放状态不一致
   * 解决方案：
   *   1. 通过控制音频的实例 backgroundAudioManager 去监视音乐播放/暂停
   *
   * */
    //创建背景播放音乐的实例，可以锁屏和后台播放音乐，要在app.json中设置参数"requiredBackgroundModes": ["audio", "location"]
    this.backgroundAudioManager = wx.getBackgroundAudioManager();
    //监视音乐播放/暂停/停止,同时可以监听页面和手机系统栏，要在页面创建的时候监听
    this.backgroundAudioManager.onPlay(() => {//监听播放
      this.changePlayState(true)

      //修改音乐转态到全局，解决音乐详情页面回退后，在进入该页面页面中的音乐为暂停的状态
      appInstance.musicId = musicId;
    });
    this.backgroundAudioManager.onStop(() => {//监听停止，可以监听叉掉的
      this.changePlayState(false)

    });
    this.backgroundAudioManager.onPause(() => {//监听暂停
      this.changePlayState(false)
    });

    //监听音乐自然播放结束
    this.backgroundAudioManager.onEnded(() => {//监听音乐播放结束
      //切换到下一首歌曲，并自动播放
      PubSub.publish('switchType', 'next')
      //将进度条置为0，播放时间置为0
      this.setData({
        currentTime: '00:00',
        currentWidth: 0,
        lyric: [],
        lyricTime: 0,
      })

    });


    //监听背景音乐的时间实时更新回调
    this.backgroundAudioManager.onTimeUpdate(() => {//动态监听时间
      //获取歌词对应时间
      let lyricTime = Math.ceil(this.backgroundAudioManager.currentTime);
      // console.log("总时长："+this.backgroundAudioManager.duration)
      //输出单位为s
      // console.log("现在时间："+this.backgroundAudioManager.currentTime)
      //格式化实时播放的时间
      let currentTime = moment(this.backgroundAudioManager.currentTime * 1000).format('mm:ss');
      //计算实时进度条的时间
      let currentWidth = this.backgroundAudioManager.currentTime / this.backgroundAudioManager.duration * 450;
      this.setData({
        lyricTime,
        currentTime,
        currentWidth
      })
      //获取当前的歌词信息
      this.getCurrentLyric();
    });
  },

  //修改播放状态
  changePlayState(isPlay){
    this.setData({
      isPlay
    })
    //修改音乐的播放状态到全局
    appInstance.isMusicPlay = isPlay;
  },

  //发送请求获取歌曲的详细信息
  async getMusicInfo(musicId){
    let songData = await request('/song/detail',{ids: musicId});
    //使用moment.js格式化中的时长，参数单位为ms
    let durationTime = moment(songData.songs[0].dt).format('mm:ss')

    this.setData({
      song: songData.songs[0],
      durationTime
    })

    //动态更新页面头部的标题
    wx.setNavigationBarTitle({
      title: this.data.song.name
    })

  },

  //监听播放按钮的点击的回调函数
  handleMusicPlay(){
    //取反isPlay的值
    let isPlay = !this.data.isPlay;
    //修改音乐的播放，因为通过小程序的监听了，这里的数据关系可以不要了
    // this.setData({
    //   isPlay
    // })

    //调用音乐播放的功能函数来控制音乐的播放
    let {musicId, musicLink} = this.data;
    this.musicControl(isPlay, musicId, musicLink);
  },

  //控制音乐播放/暂停的功能函数
  async musicControl(isPlay, musicId, musicLink){
    if (isPlay){//解决每次点击播放都发送请求的性能优化问题
      if (!musicLink){
        //获取音乐播放的链接
        let musicLinkData = await request('/song/url', {id: musicId})
        musicLink = musicLinkData.data[0].url;

        this.setData({
          musicLink
        })
      }
      //设置播放链接到播放实例上面，设置了播放链接和标题后为true的话会自动播放，播放会被监听到
      this.backgroundAudioManager.src = musicLink;
      //设置必填的title,否则音乐播放不了
      this.backgroundAudioManager.title = this.data.song.name;
    }else{//暂停音乐，会被监听到
      this.backgroundAudioManager.pause();
    }

  },

  //点击切歌的回调
  handleSwitch(event){
    //获取点击的是上一首还是下一首
    let type = event.currentTarget.id;
    //切歌前关闭当前播放的音乐
    this.backgroundAudioManager.stop();

    //订阅来自recommendSong的消息musicId
    PubSub.subscribe('musicId',(msg, musicId) => {
      //这里每点击一次会订阅一次，底层会将订阅一次放入一个数组中，当订阅触发后会将数组中的所有订阅全部输出，（点击多次）即会打印多次musicId
      //获取音乐信息
      this.getMusicInfo(musicId)
      //自动播放音乐
      this.musicControl(true, musicId)

      //订阅获取消息后取消定义，解决重复问题，这段订阅也可以到onLoad中，也要下面的代码，否则，在进入该页面后后退在进来就会执行多次，默认数据在第三方库中
      PubSub.unsubscribe('musicId');
    })

    //发布订阅，将消息发送到recommendDetail页面查询上一首或下一首的音乐id
    PubSub.publish('switchType', type)

  },

  //获取歌词
  async getLyric(musicId){
    let lyricData = await request('/lyric', {id: musicId})
    let lyric = this.formatLyric(lyricData.lrc.lyric);
  },

  //传入初始歌词文本text
  formatLyric(text) {
    let result = [];
    let arr = text.split("\n"); //原歌词文本已经换好行了方便很多，我们直接通过换行符“\n”进行切割
    let row = arr.length; //获取歌词行数
    for (let i = 0; i < row; i++) {
      let temp_row = arr[i]; //现在每一行格式大概就是这样"[00:04.302][02:10.00]hello world";
      let temp_arr = temp_row.split("]");//我们可以通过“]”对时间和文本进行分离
      let text = temp_arr.pop(); //把歌词文本从数组中剔除出来，获取到歌词文本了！
      //再对剩下的歌词时间进行处理
      temp_arr.forEach(element => {
        let obj = {};
        let time_arr = element.substr(1, element.length - 1).split(":");//先把多余的“[”去掉，再分离出分、秒
        let s = parseInt(time_arr[0]) * 60 + Math.ceil(time_arr[1]); //把时间转换成与currentTime相同的类型，方便待会实现滚动效果
        obj.time = s;
        obj.text = text;
        result.push(obj); //每一行歌词对象存到组件的lyric歌词属性里
      });
    }
    result.sort(this.sortRule) //由于不同时间的相同歌词我们给排到一起了，所以这里要以时间顺序重新排列一下
    this.setData({
      lyric: result
    })
  },
  sortRule(a, b) { //设置一下排序规则
    return a.time - b.time;
  },

  //控制歌词播放
  getCurrentLyric(){
    let j;
    for(j=0; j<this.data.lyric.length-1; j++){
      if(this.data.lyricTime == this.data.lyric[j].time){
        this.setData({
          currentLyric : this.data.lyric[j].text
        })
      }
    }
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
