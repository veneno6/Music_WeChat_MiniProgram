import request from "../../utils/request";
Page({

  /**
   * 页面的初始数据
   */
  data: {
    //导航标签数据
    videoGroupList: [],
    //导航点击标签标识，用于区分是否点击
    navId: '',
    //视频列表数据
    videoList: [],
    //点击图片要显示的videoId
    videoId: '',
    //记录video播放的时长
    videoUpdateTime: [],
    //标识下拉刷新是否被触发
    isTriggered: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.getVideoGroupData();
  },

  //获取视频标签页的头部导航区域
  async getVideoGroupData() {
    //发送请求获取数据
    let videoGroupListData = await request('/video/group/list');
    this.setData({
      //获取前14条数据
      videoGroupList: videoGroupListData.data.slice(0, 14),
      //设置默认的navId，即一加载就选中第一项
      navId: videoGroupListData.data[0].id
    });

    //下面的方法要在获取navId 后执行，不可以放在onLoad生命周期函数中，因为onLoad只执行一次，
    // 并且getVideoGroupData是一个异步非阻塞的方法，会一起执行，这样会拿到最初始的空值
    this.getVideoList(this.data.navId)
  },

  //点击导航项的切换
  changeNav(event){
    //使用id给event传值，默认id传值会将数字类型转换为字符类型，比较的时候会比较不成功，因此在设置数据时要转换为数字类型
    let navId = event.currentTarget.id;
    //使用data-key=value 时默认不会转换value,即设置数据时可以不转类型
    // let navId = event.currentTarget.dataset.id;
    this.setData({
      //使用*0将字符转换为数字
      // navId: navId*0
      //使用左移将字符转换数字，默认左移时会将字符转换为数字
      navId: navId>>>0,
      //获取之前清空，不显示之前的视频
      videoList: []
    });

    //显示正在加载的提示框
    wx.showLoading({
      title: '正在加载'
    })

    //动态获取当前标签也的视频数据
    this.getVideoList(this.data.navId)

  },

  //获取点击导航标签的视频数据
  async getVideoList(navId){
    let videoListData = await request("/video/group", {id: navId});
    //数据加载完毕，关闭加载提示框
    wx.hideLoading();

    //为每个视频数据设置唯一的id，供wx:key 使用
    let index = 0;
    let videoList = videoListData.datas.map(item => {
      item.id = index++;
      return item;
    })
    //请求发送完后清空刷新的触发
    this.setData({
      videoList,
      isTriggered: false
    })

  },

  //当开始/继续播放时触发play事件
  handlePlay(event){
    /*
    问题： 多个视频同时播放的问题
  * 需求：
  *   1. 在点击播放的事件中需要找到上一个播放的视频
  *   2. 在播放新的视频之前关闭上一个正在播放的视频
  * 关键：
  *   1. 如何找到上一个视频的实例对象:VideoContext 通过 id 跟一个 video 组件绑定，操作对应的 video 组件。
  *   2. 如何确认点击播放的视频和正在播放的视频不是同一个视频
  && 前面为true,才执行后面的
  将获取到的id 绑定到this 对象上面，通过this对象来获取和判断，
  this.vid != vid ：判断当前点击的视频id是否和之前的视频id不相等（即判断不相同的两个视频）
  this.videoContext : 解决stop()报错问题，即this.videoContext要有值才执行
  * 单例模式：
  *   1. 需要创建多个对象的场景下，通过一个变量接收，始终保持只有一个对象，
  *   2. 节省内存空间
  * */
    //获取当前点击的video的id
    let vId = event.currentTarget.id;
    //关闭上一个播放的视频，使用图片来优化视频播放后可以解决该问题
    // this.vId != vId && this.videoContext && this.videoContext.stop();
    // if(this.vid !== vid){
    //   if(this.videoContext){
    //     this.videoContext.stop()
    //   }
    // }
    //将第一次点击的id 值给this
    // this.vId = vId;
    //使用id wx:if wx:else 解决了多个视频播放的问题，上面的代码就可以注释掉了
    this.setData({
      videoId: vId
    })

    //创建videoContext对象并赋值个this对象
    this.videoContext = wx.createVideoContext(vId);
    //播放前查询是否有该视频的播放记录有的话就跳转到视频的播放记录处
    let {videoUpdateTime} = this.data;
    let videoItem = videoUpdateTime.find(item => item.vid === vId);
    if (videoItem){
      this.videoContext.seek(videoItem.currentTime);
    }
    //点击图片后就播放该视频
    this.videoContext.play();

  },

  //监听视频播放的时间的变化函数,视频播放就会触发，记录播放的时间
  handleTimeUpdate(event){
    let videoTimeObj = {vid: event.currentTarget.id, currentTime: event.detail.currentTime};
    let {videoUpdateTime} = this.data;
    /*
    * 思路： 判断记录播放时长的videoUpdateTime数组中是否有当前视频的播放记录，不判断则每次时间改变都会向数组中放一个对象
    *   1. 如果有，在原有的播放记录中修改播放时间为当前的播放时间
    *   2. 如果没有，需要在数组中添加当前视频的播放对象
    *
    * */
    let videoItem = videoUpdateTime.find(item => item.vid === videoTimeObj.vid);
    if (videoItem){//之前有，就更新播放的时间
      videoItem.currentTime = event.detail.currentTime;
    }else{//之前没有，就直接放入数组中
      videoUpdateTime.push(videoTimeObj);
    }
    //更新数据
    this.setData({
      videoUpdateTime
    })
  },

  //视频播放结束回调的调佣
  handleEnd(event){
    //当视频播放完后移除当前播放的视频对象
    let {videoUpdateTime} = this.data;
    videoUpdateTime.splice(videoUpdateTime.findIndex(item => item.vid === event.currentTarget.id), 1);
    this.setData({
      videoUpdateTime
    })
  },

  //视频列表下拉刷新事件
  handleRefresh(event){
    console.log("scroll-view上拉刷新")
    //再次发送请求获取最新的数据
    this.getVideoList(this.data.navId);
  },

  //视频列表下拉触底事件回调，加载更多的数据
  handleToLower(){
    console.log("scroll-view下拉触底")
    //加载更多的内容，分页实现：1.前端分页 2.后端分页
    console.log('发送请求 || 在前端截取最新的数据 追加到视频列表的后方');
    console.log('网易云音乐暂时没有提供分页的api');
    // 模拟数据
    let newVideoList = [
      {
        "type": 1,
        "displayed": false,
        "alg": "onlineHotGroup",
        "extAlg": null,
        "data": {
          "alg": "onlineHotGroup",
          "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
          "threadId": "R_VI_62_E6BDBB960E755473593AF7968D7E11D0",
          "coverUrl": "https://p2.music.126.net/XH-u5TP-MNPeRdjKq1B4wQ==/109951163573210989.jpg",
          "height": 720,
          "width": 1280,
          "title": "李宗盛 - 别怕我伤心",
          "description": "我放下了尊严，放下了个性，放下了固执，都只是因为放不下你。",
          "commentCount": 864,
          "shareCount": 9867,
          "resolutions": [
            {
              "resolution": 240,
              "size": 21351090
            },
            {
              "resolution": 480,
              "size": 30447597
            },
            {
              "resolution": 720,
              "size": 48355300
            }
          ],
          "creator": {
            "defaultAvatar": false,
            "province": 320000,
            "authStatus": 0,
            "followed": false,
            "avatarUrl": "http://p1.music.126.net/GYcDZd1pHzVsf_pLSKNKXQ==/109951165562233557.jpg",
            "accountStatus": 0,
            "gender": 1,
            "city": 320100,
            "birthday": 819734400000,
            "userId": 272369649,
            "userType": 200,
            "nickname": "凍餖腐",
            "signature": "人生没有无解的难题。获得幸福的秘诀在于敞开心扉、跟生活和解。",
            "description": "",
            "detailDescription": "",
            "avatarImgId": 109951165562233550,
            "backgroundImgId": 109951165563495520,
            "backgroundUrl": "http://p1.music.126.net/-wHehgbgge3I1TTIjbq51Q==/109951165563495519.jpg",
            "authority": 0,
            "mutual": false,
            "expertTags": null,
            "experts": {
              "1": "影视视频达人",
              "2": "资讯(华语、现场音乐)"
            },
            "djStatus": 10,
            "vipType": 11,
            "remarkName": null,
            "backgroundImgIdStr": "109951165563495519",
            "avatarImgIdStr": "109951165562233557"
          },
          "urlInfo": {
            "id": "E6BDBB960E755473593AF7968D7E11D0",
            "url": "http://vodkgeyttp9.vod.126.net/vodkgeyttp8/PJLB4Eqw_1378482522_shd.mp4?ts=1622211870&rid=49342E65B7FEEB11F169FE443776A9D4&rl=3&rs=ygnWTjztrnkVqGCcpLxYCJUhezWtWiti&sign=1fa9f9b9d1d1a06df526c1825f0f4a21&ext=NDC4znYcOoiSQ%2BhMj3pOhUOZl6jqP3UBag2xFfY3j7aWfyeHrI3YHpfWP4%2Bwc18kHBEFJkvHsXx73BZDWksVG5VTovfuRYLdWjrgxA%2F0hmULPqIYKvF8Ap3CZrm%2F%2Ba7MGvIcowS4mxhFS%2BtxG3%2BAcu0LsD6mQqvsx8g870zzK%2BQ%2BxPC7fvKpDBXr%2BrKG1X5KlY%2Fr5qu5d%2F0wL%2FM4suIxBdXMCpN7tFLaeGUPMHIVVv5ftWHzpyX%2B6eL9b50JHB10",
            "size": 48355300,
            "validityTime": 1200,
            "needPay": false,
            "payInfo": null,
            "r": 720
          },
          "videoGroup": [
            {
              "id": 58100,
              "name": "现场",
              "alg": null
            },
            {
              "id": 254120,
              "name": "滚石唱片行",
              "alg": null
            },
            {
              "id": 57105,
              "name": "粤语现场",
              "alg": null
            },
            {
              "id": 57108,
              "name": "流行现场",
              "alg": null
            },
            {
              "id": 59108,
              "name": "巡演现场",
              "alg": null
            },
            {
              "id": 1100,
              "name": "音乐现场",
              "alg": null
            },
            {
              "id": 5100,
              "name": "音乐",
              "alg": null
            },
            {
              "id": 14133,
              "name": "李宗盛",
              "alg": null
            },
            {
              "id": 16201,
              "name": "温暖",
              "alg": null
            }
          ],
          "previewUrl": null,
          "previewDurationms": 0,
          "hasRelatedGameAd": false,
          "markTypes": null,
          "relateSong": [

          ],
          "relatedInfo": null,
          "videoUserLiveInfo": null,
          "vid": "E6BDBB960E755473593AF7968D7E11D0",
          "durationms": 184022,
          "playTime": 2582846,
          "praisedCount": 19589,
          "praised": false,
          "subscribed": false
        }
      },
      {
        "type": 1,
        "displayed": false,
        "alg": "onlineHotGroup",
        "extAlg": null,
        "data": {
          "alg": "onlineHotGroup",
          "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
          "threadId": "R_VI_62_FFC058633D750E5F8BB557EFE53DA1B5",
          "coverUrl": "https://p2.music.126.net/vlAY_hTa9L4AYOpQFs6GEg==/109951164946083584.jpg",
          "height": 720,
          "width": 1280,
          "title": "捷克斯洛伐克好声音《Believer》",
          "description": "2019年捷克斯洛伐克好声音\n\n节目原始标题：The Voice Česko Slovensko\n\n节目分别在捷克和斯洛伐克两个国家播出，本视频为斯洛伐克播出的版本。\n\n歌词来源：网易云音乐@lofiart",
          "commentCount": 67,
          "shareCount": 41,
          "resolutions": [
            {
              "resolution": 240,
              "size": 19419521
            },
            {
              "resolution": 480,
              "size": 32207557
            },
            {
              "resolution": 720,
              "size": 36315477
            }
          ],
          "creator": {
            "defaultAvatar": false,
            "province": 120000,
            "authStatus": 0,
            "followed": false,
            "avatarUrl": "http://p1.music.126.net/PYj6z69wpUkFW54rQmqcQg==/109951165426375127.jpg",
            "accountStatus": 0,
            "gender": 0,
            "city": 120101,
            "birthday": 978327809646,
            "userId": 479433962,
            "userType": 200,
            "nickname": "有飯男青年",
            "signature": "",
            "description": "",
            "detailDescription": "",
            "avatarImgId": 109951165426375120,
            "backgroundImgId": 109951162868126480,
            "backgroundUrl": "http://p1.music.126.net/_f8R60U9mZ42sSNvdPn2sQ==/109951162868126486.jpg",
            "authority": 0,
            "mutual": false,
            "expertTags": null,
            "experts": null,
            "djStatus": 10,
            "vipType": 0,
            "remarkName": null,
            "backgroundImgIdStr": "109951162868126486",
            "avatarImgIdStr": "109951165426375127"
          },
          "urlInfo": {
            "id": "FFC058633D750E5F8BB557EFE53DA1B5",
            "url": "http://vodkgeyttp9.vod.126.net/vodkgeyttp8/LduDqHZ4_2929885777_shd.mp4?ts=1622211870&rid=49342E65B7FEEB11F169FE443776A9D4&rl=3&rs=lyIUICLbXFWWWvJYxkPZYHqVPUxHuskR&sign=1b4514a41a205d3670f2efdf5cb5d2c7&ext=NDC4znYcOoiSQ%2BhMj3pOhUOZl6jqP3UBag2xFfY3j7aWfyeHrI3YHpfWP4%2Bwc18kHBEFJkvHsXx73BZDWksVG5VTovfuRYLdWjrgxA%2F0hmULPqIYKvF8Ap3CZrm%2F%2Ba7MGvIcowS4mxhFS%2BtxG3%2BAcu0LsD6mQqvsx8g870zzK%2BQ%2BxPC7fvKpDBXr%2BrKG1X5KlY%2Fr5qu5d%2F0wL%2FM4suIxBdXMCpN7tFLaeGUPMHIVVv5ftWHzpyX%2B6eL9b50JHB10",
            "size": 36315477,
            "validityTime": 1200,
            "needPay": false,
            "payInfo": null,
            "r": 720
          },
          "videoGroup": [
            {
              "id": 58100,
              "name": "现场",
              "alg": null
            },
            {
              "id": 60100,
              "name": "翻唱",
              "alg": null
            },
            {
              "id": 57112,
              "name": "英文翻唱",
              "alg": null
            },
            {
              "id": 58109,
              "name": "国外达人",
              "alg": null
            },
            {
              "id": 1100,
              "name": "音乐现场",
              "alg": null
            },
            {
              "id": 4105,
              "name": "摇滚",
              "alg": null
            },
            {
              "id": 5100,
              "name": "音乐",
              "alg": null
            }
          ],
          "previewUrl": null,
          "previewDurationms": 0,
          "hasRelatedGameAd": false,
          "markTypes": null,
          "relateSong": [
            {
              "name": "Believer",
              "id": 1338149101,
              "pst": 0,
              "t": 0,
              "ar": [
                {
                  "id": 94779,
                  "name": "Imagine Dragons",
                  "tns": [

                  ],
                  "alias": [

                  ]
                },
                {
                  "id": 38118,
                  "name": "Lil Wayne",
                  "tns": [

                  ],
                  "alias": [

                  ]
                }
              ],
              "alia": [

              ],
              "pop": 100,
              "st": 0,
              "rt": "",
              "fee": 8,
              "v": 9,
              "crbt": null,
              "cf": "",
              "al": {
                "id": 75082998,
                "name": "Believer",
                "picUrl": "http://p4.music.126.net/0_YzqMGHrDXU9C277IFerA==/109951163783209324.jpg",
                "tns": [

                ],
                "pic_str": "109951163783209324",
                "pic": 109951163783209330
              },
              "dt": 219742,
              "h": {
                "br": 320000,
                "fid": 0,
                "size": 8790770,
                "vd": -3
              },
              "m": {
                "br": 192000,
                "fid": 0,
                "size": 5274480,
                "vd": -3
              },
              "l": {
                "br": 128000,
                "fid": 0,
                "size": 3516334,
                "vd": -3
              },
              "a": null,
              "cd": "01",
              "no": 1,
              "rtUrl": null,
              "ftype": 0,
              "rtUrls": [

              ],
              "djId": 0,
              "copyright": 1,
              "s_id": 0,
              "rtype": 0,
              "rurl": null,
              "mst": 9,
              "cp": 7003,
              "mv": 0,
              "publishTime": 1546790400000,
              "privilege": {
                "id": 1338149101,
                "fee": 8,
                "payed": 0,
                "st": 0,
                "pl": 128000,
                "dl": 0,
                "sp": 7,
                "cp": 1,
                "subp": 1,
                "cs": false,
                "maxbr": 320000,
                "fl": 128000,
                "toast": false,
                "flag": 4,
                "preSell": false
              }
            }
          ],
          "relatedInfo": null,
          "videoUserLiveInfo": null,
          "vid": "FFC058633D750E5F8BB557EFE53DA1B5",
          "durationms": 149480,
          "playTime": 245802,
          "praisedCount": 1293,
          "praised": false,
          "subscribed": false
        }
      },
      {
        "type": 1,
        "displayed": false,
        "alg": "onlineHotGroup",
        "extAlg": null,
        "data": {
          "alg": "onlineHotGroup",
          "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
          "threadId": "R_VI_62_6681041980BD111053546F1C3847AA9C",
          "coverUrl": "https://p2.music.126.net/4uUPc9B6vBVPXMFCl9RH6w==/109951164309218481.jpg",
          "height": 540,
          "width": 960,
          "title": "权志龙 - crayon+fantastic baby",
          "description": "#权志龙# - crayon+fantastic baby",
          "commentCount": 321,
          "shareCount": 1562,
          "resolutions": [
            {
              "resolution": 240,
              "size": 62044407
            },
            {
              "resolution": 480,
              "size": 90381060
            }
          ],
          "creator": {
            "defaultAvatar": false,
            "province": 420000,
            "authStatus": 0,
            "followed": false,
            "avatarUrl": "http://p1.music.126.net/qYiLTh2S4suDBhfFNdI0Rw==/109951163926560508.jpg",
            "accountStatus": 0,
            "gender": 2,
            "city": 420100,
            "birthday": 883411200000,
            "userId": 300664370,
            "userType": 204,
            "nickname": "空谷待足音",
            "signature": "韩圈舞台饭，不定期更新喜欢的视频",
            "description": "",
            "detailDescription": "",
            "avatarImgId": 109951163926560510,
            "backgroundImgId": 109951163990566190,
            "backgroundUrl": "http://p1.music.126.net/Tzx7VFq3RCPRhgtl0NVHXw==/109951163990566185.jpg",
            "authority": 0,
            "mutual": false,
            "expertTags": null,
            "experts": {
              "1": "音乐视频达人"
            },
            "djStatus": 0,
            "vipType": 0,
            "remarkName": null,
            "backgroundImgIdStr": "109951163990566185",
            "avatarImgIdStr": "109951163926560508"
          },
          "urlInfo": {
            "id": "6681041980BD111053546F1C3847AA9C",
            "url": "http://vodkgeyttp9.vod.126.net/vodkgeyttp8/8HzDriPc_2647886403_hd.mp4?ts=1622211870&rid=49342E65B7FEEB11F169FE443776A9D4&rl=3&rs=avBoTsgivUcqpQluojAEYeslMLIldmsX&sign=5c7e6e3f6f777b20f58f6cd56aaeb961&ext=NDC4znYcOoiSQ%2BhMj3pOhUOZl6jqP3UBag2xFfY3j7aWfyeHrI3YHpfWP4%2Bwc18kHBEFJkvHsXx73BZDWksVG5VTovfuRYLdWjrgxA%2F0hmULPqIYKvF8Ap3CZrm%2F%2Ba7MGvIcowS4mxhFS%2BtxG3%2BAcu0LsD6mQqvsx8g870zzK%2BQ%2BxPC7fvKpDBXr%2BrKG1X5KlY%2Fr5qu5d%2F0wL%2FM4suIxBdXMCpN7tFLaeGUPMHIVVv5ftWHzpyX%2B6eL9b50JHB10",
            "size": 90381060,
            "validityTime": 1200,
            "needPay": false,
            "payInfo": null,
            "r": 480
          },
          "videoGroup": [
            {
              "id": 58100,
              "name": "现场",
              "alg": null
            },
            {
              "id": 10114,
              "name": "BIGBANG",
              "alg": null
            },
            {
              "id": 1100,
              "name": "音乐现场",
              "alg": null
            },
            {
              "id": 5100,
              "name": "音乐",
              "alg": null
            }
          ],
          "previewUrl": null,
          "previewDurationms": 0,
          "hasRelatedGameAd": false,
          "markTypes": null,
          "relateSong": [
            {
              "name": "CRAYON [G-DRAGON 2017 WORLD TOUR ＜ACT III, M.O.T.T.E＞ IN JAPAN]",
              "id": 534541509,
              "pst": 0,
              "t": 0,
              "ar": [
                {
                  "id": 123577,
                  "name": "G-Dragon",
                  "tns": [

                  ],
                  "alias": [

                  ]
                }
              ],
              "alia": [

              ],
              "pop": 90,
              "st": 0,
              "rt": null,
              "fee": 8,
              "v": 11,
              "crbt": null,
              "cf": "",
              "al": {
                "id": 37467192,
                "name": "G-DRAGON 2017 WORLD TOUR <ACT III, M.O.T.T.E> IN JAPAN",
                "picUrl": "http://p4.music.126.net/ed9pOr6_FxrMXLmlinFk2w==/109951163134376614.jpg",
                "tns": [

                ],
                "pic_str": "109951163134376614",
                "pic": 109951163134376600
              },
              "dt": 219760,
              "h": {
                "br": 320000,
                "fid": 0,
                "size": 8792860,
                "vd": -9700
              },
              "m": {
                "br": 192000,
                "fid": 0,
                "size": 5275733,
                "vd": -7000
              },
              "l": {
                "br": 128000,
                "fid": 0,
                "size": 3517170,
                "vd": -5800
              },
              "a": null,
              "cd": "01",
              "no": 16,
              "rtUrl": null,
              "ftype": 0,
              "rtUrls": [

              ],
              "djId": 0,
              "copyright": 0,
              "s_id": 0,
              "rtype": 0,
              "rurl": null,
              "mst": 9,
              "cp": 457010,
              "mv": 0,
              "publishTime": 1517932800007,
              "privilege": {
                "id": 534541509,
                "fee": 8,
                "payed": 0,
                "st": 0,
                "pl": 128000,
                "dl": 0,
                "sp": 7,
                "cp": 1,
                "subp": 1,
                "cs": false,
                "maxbr": 999000,
                "fl": 128000,
                "toast": false,
                "flag": 69,
                "preSell": false
              }
            }
          ],
          "relatedInfo": null,
          "videoUserLiveInfo": null,
          "vid": "6681041980BD111053546F1C3847AA9C",
          "durationms": 375521,
          "playTime": 1002455,
          "praisedCount": 8038,
          "praised": false,
          "subscribed": false
        }
      },
      {
        "type": 1,
        "displayed": false,
        "alg": "onlineHotGroup",
        "extAlg": null,
        "data": {
          "alg": "onlineHotGroup",
          "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
          "threadId": "R_VI_62_E2DC3D1B730FA9435215296A3819DF8B",
          "coverUrl": "https://p2.music.126.net/wZeylSxlNoxd7phlT4J29Q==/109951164491726164.jpg",
          "height": 720,
          "width": 1280,
          "title": "嗨唱转起来：王子异《心如止水》Live，酷炫来袭～",
          "description": "嗨唱转起来：王子异《心如止水》Live，酷炫来袭～",
          "commentCount": 331,
          "shareCount": 611,
          "resolutions": [
            {
              "resolution": 240,
              "size": 9991640
            },
            {
              "resolution": 480,
              "size": 17087813
            },
            {
              "resolution": 720,
              "size": 25159255
            }
          ],
          "creator": {
            "defaultAvatar": false,
            "province": 810000,
            "authStatus": 0,
            "followed": false,
            "avatarUrl": "http://p1.music.126.net/RCzksIcMLAbyXgPhJJmvAQ==/109951166008264068.jpg",
            "accountStatus": 0,
            "gender": 2,
            "city": 810100,
            "birthday": -2209017600000,
            "userId": 452227174,
            "userType": 0,
            "nickname": "Leeyy-李彦媛",
            "signature": "我的Hip-hop现场经历\r中国有嘻哈2017制作人公演现场\r中国新说唱2018总决赛现场\r中国新说唱2019总决赛现场～",
            "description": "",
            "detailDescription": "",
            "avatarImgId": 109951166008264060,
            "backgroundImgId": 109951165395733630,
            "backgroundUrl": "http://p1.music.126.net/JoV68ORMXbVRqYMDNp28GA==/109951165395733633.jpg",
            "authority": 0,
            "mutual": false,
            "expertTags": null,
            "experts": null,
            "djStatus": 0,
            "vipType": 0,
            "remarkName": null,
            "backgroundImgIdStr": "109951165395733633",
            "avatarImgIdStr": "109951166008264068"
          },
          "urlInfo": {
            "id": "E2DC3D1B730FA9435215296A3819DF8B",
            "url": "http://vodkgeyttp9.vod.126.net/vodkgeyttp8/RVaKoaap_2791594410_shd.mp4?ts=1622211870&rid=49342E65B7FEEB11F169FE443776A9D4&rl=3&rs=rFrzjcpUySeJRqeGLWThvsfCDPYpVCCg&sign=b4c3430ad47e74be0010e29b4ab98a45&ext=NDC4znYcOoiSQ%2BhMj3pOhUOZl6jqP3UBag2xFfY3j7aWfyeHrI3YHpfWP4%2Bwc18kHBEFJkvHsXx73BZDWksVG5VTovfuRYLdWjrgxA%2F0hmULPqIYKvF8Ap3CZrm%2F%2Ba7MGvIcowS4mxhFS%2BtxG3%2BAcu0LsD6mQqvsx8g870zzK%2BQ%2BxPC7fvKpDBXr%2BrKG1X5KlY%2Fr5qu5d%2F0wL%2FM4suIxBdXMCpN7tFLaeGUPMHIVVv4cyDC%2BoD1qGodLHB9IWTW5",
            "size": 25159255,
            "validityTime": 1200,
            "needPay": false,
            "payInfo": null,
            "r": 720
          },
          "videoGroup": [
            {
              "id": 58100,
              "name": "现场",
              "alg": null
            },
            {
              "id": 59101,
              "name": "华语现场",
              "alg": null
            },
            {
              "id": 57108,
              "name": "流行现场",
              "alg": null
            },
            {
              "id": 1100,
              "name": "音乐现场",
              "alg": null
            },
            {
              "id": 5100,
              "name": "音乐",
              "alg": null
            },
            {
              "id": 4101,
              "name": "娱乐",
              "alg": null
            },
            {
              "id": 3101,
              "name": "综艺",
              "alg": null
            }
          ],
          "previewUrl": null,
          "previewDurationms": 0,
          "hasRelatedGameAd": false,
          "markTypes": null,
          "relateSong": [
            {
              "name": "心如止水",
              "id": 1349292048,
              "pst": 0,
              "t": 0,
              "ar": [
                {
                  "id": 12121264,
                  "name": "Ice Paper",
                  "tns": [

                  ],
                  "alias": [

                  ]
                }
              ],
              "alia": [

              ],
              "pop": 100,
              "st": 0,
              "rt": "",
              "fee": 8,
              "v": 31,
              "crbt": null,
              "cf": "",
              "al": {
                "id": 75350006,
                "name": "成语接龙",
                "picUrl": "http://p3.music.126.net/MLQl_7poLz2PTON6_JZZRQ==/109951163938219545.jpg",
                "tns": [

                ],
                "pic_str": "109951163938219545",
                "pic": 109951163938219550
              },
              "dt": 185390,
              "h": {
                "br": 320000,
                "fid": 0,
                "size": 7417774,
                "vd": 0
              },
              "m": {
                "br": 192000,
                "fid": 0,
                "size": 4450682,
                "vd": 0
              },
              "l": {
                "br": 128000,
                "fid": 0,
                "size": 2967136,
                "vd": 0
              },
              "a": null,
              "cd": "01",
              "no": 6,
              "rtUrl": null,
              "ftype": 0,
              "rtUrls": [

              ],
              "djId": 0,
              "copyright": 0,
              "s_id": 0,
              "rtype": 0,
              "rurl": null,
              "mst": 9,
              "cp": 0,
              "mv": 0,
              "publishTime": 0,
              "privilege": {
                "id": 1349292048,
                "fee": 8,
                "payed": 0,
                "st": 0,
                "pl": 128000,
                "dl": 0,
                "sp": 7,
                "cp": 1,
                "subp": 1,
                "cs": false,
                "maxbr": 999000,
                "fl": 128000,
                "toast": false,
                "flag": 0,
                "preSell": false
              }
            }
          ],
          "relatedInfo": null,
          "videoUserLiveInfo": null,
          "vid": "E2DC3D1B730FA9435215296A3819DF8B",
          "durationms": 74628,
          "playTime": 1479459,
          "praisedCount": 8701,
          "praised": false,
          "subscribed": false
        }
      },
      {
        "type": 1,
        "displayed": false,
        "alg": "onlineHotGroup",
        "extAlg": null,
        "data": {
          "alg": "onlineHotGroup",
          "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
          "threadId": "R_VI_62_8AC1D2224DFDFDF62A0E6D34647160EC",
          "coverUrl": "https://p2.music.126.net/d1GvSI_Gyrme4n9tgAHQ2A==/109951164082016734.jpg",
          "height": 1080,
          "width": 1920,
          "title": "带你见识什么叫“音乐疯子”，安保人员都亲自出动了竟然不予理会",
          "description": "#街头艺人#【带你见识什么叫“音乐疯子”，安保人员都亲自出动了竟然不予理会？】“音乐疯子”对商场里一架“发生故障”的钢琴下手了！上来就是一顿疯狂的跳跃音符，安保人员都出动的情况下，他们玩儿的更嗨了！空旷的大厅顿时间活跃了起来，看来Boogie Woogie音乐的魅力真不小！",
          "commentCount": 498,
          "shareCount": 727,
          "resolutions": [
            {
              "resolution": 240,
              "size": 48748651
            },
            {
              "resolution": 480,
              "size": 108878491
            },
            {
              "resolution": 720,
              "size": 117318075
            },
            {
              "resolution": 1080,
              "size": 187243016
            }
          ],
          "creator": {
            "defaultAvatar": false,
            "province": 110000,
            "authStatus": 0,
            "followed": false,
            "avatarUrl": "http://p1.music.126.net/34DzOtbJhyYj7BXj-dxeYg==/19226060323323558.jpg",
            "accountStatus": 0,
            "gender": 1,
            "city": 110101,
            "birthday": -2209017600000,
            "userId": 439675863,
            "userType": 204,
            "nickname": "Steven_爱音乐",
            "signature": "16、17、18、19、20年连续五届微博十大影响力音乐大V，微博十大音乐视频大V。",
            "description": "",
            "detailDescription": "",
            "avatarImgId": 19226060323323560,
            "backgroundImgId": 109951164884484850,
            "backgroundUrl": "http://p1.music.126.net/pR6ptJzgrfj-4hVzVTCUbg==/109951164884484852.jpg",
            "authority": 0,
            "mutual": false,
            "expertTags": null,
            "experts": {
              "1": "音乐视频达人"
            },
            "djStatus": 0,
            "vipType": 11,
            "remarkName": null,
            "backgroundImgIdStr": "109951164884484852",
            "avatarImgIdStr": "19226060323323558"
          },
          "urlInfo": {
            "id": "8AC1D2224DFDFDF62A0E6D34647160EC",
            "url": "http://vodkgeyttp9.vod.126.net/vodkgeyttp8/RmRBfrOZ_2506470195_uhd.mp4?ts=1622211870&rid=49342E65B7FEEB11F169FE443776A9D4&rl=3&rs=GITisCsDlWcUjvEKLEaPNfzRWGJnbclu&sign=3539e44dbab5966089c75e82baaa3638&ext=NDC4znYcOoiSQ%2BhMj3pOhUOZl6jqP3UBag2xFfY3j7aWfyeHrI3YHpfWP4%2Bwc18kHBEFJkvHsXx73BZDWksVG5VTovfuRYLdWjrgxA%2F0hmULPqIYKvF8Ap3CZrm%2F%2Ba7MGvIcowS4mxhFS%2BtxG3%2BAcu0LsD6mQqvsx8g870zzK%2BQ%2BxPC7fvKpDBXr%2BrKG1X5KlY%2Fr5qu5d%2F0wL%2FM4suIxBdXMCpN7tFLaeGUPMHIVVv5ftWHzpyX%2B6eL9b50JHB10",
            "size": 187243016,
            "validityTime": 1200,
            "needPay": false,
            "payInfo": null,
            "r": 1080
          },
          "videoGroup": [
            {
              "id": 58100,
              "name": "现场",
              "alg": null
            },
            {
              "id": 57106,
              "name": "欧美现场",
              "alg": null
            },
            {
              "id": 59106,
              "name": "街头表演",
              "alg": null
            },
            {
              "id": 57114,
              "name": "钢琴演奏",
              "alg": null
            },
            {
              "id": 4103,
              "name": "演奏",
              "alg": null
            },
            {
              "id": 1100,
              "name": "音乐现场",
              "alg": null
            },
            {
              "id": 5100,
              "name": "音乐",
              "alg": null
            },
            {
              "id": 26117,
              "name": "钢琴",
              "alg": null
            },
            {
              "id": 23128,
              "name": "纯音乐",
              "alg": null
            }
          ],
          "previewUrl": null,
          "previewDurationms": 0,
          "hasRelatedGameAd": false,
          "markTypes": null,
          "relateSong": [

          ],
          "relatedInfo": null,
          "videoUserLiveInfo": null,
          "vid": "8AC1D2224DFDFDF62A0E6D34647160EC",
          "durationms": 254236,
          "playTime": 1379211,
          "praisedCount": 5924,
          "praised": false,
          "subscribed": false
        }
      },
      {
        "type": 1,
        "displayed": false,
        "alg": "onlineHotGroup",
        "extAlg": null,
        "data": {
          "alg": "onlineHotGroup",
          "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
          "threadId": "R_VI_62_E7AD32128AA9686008F8D6A5883652A3",
          "coverUrl": "https://p2.music.126.net/ctcoQMhTOGGub-q8N-lEWw==/109951163863626403.jpg",
          "height": 720,
          "width": 1280,
          "title": "《国风美少年》鞠婧祎《叹云兮》 仙气十足惊艳亮相",
          "description": "",
          "commentCount": 926,
          "shareCount": 1526,
          "resolutions": [
            {
              "resolution": 240,
              "size": 14755313
            },
            {
              "resolution": 480,
              "size": 24703595
            },
            {
              "resolution": 720,
              "size": 38102753
            }
          ],
          "creator": {
            "defaultAvatar": false,
            "province": 410000,
            "authStatus": 0,
            "followed": false,
            "avatarUrl": "http://p1.music.126.net/H0qBGUPmfeiIvJxMN7HKKA==/109951163617898073.jpg",
            "accountStatus": 0,
            "gender": 1,
            "city": 411400,
            "birthday": -2209017600000,
            "userId": 1648587096,
            "userType": 0,
            "nickname": "大约废柴",
            "signature": "",
            "description": "",
            "detailDescription": "",
            "avatarImgId": 109951163617898080,
            "backgroundImgId": 109951162868128400,
            "backgroundUrl": "http://p1.music.126.net/2zSNIqTcpHL2jIvU6hG0EA==/109951162868128395.jpg",
            "authority": 0,
            "mutual": false,
            "expertTags": null,
            "experts": null,
            "djStatus": 0,
            "vipType": 0,
            "remarkName": null,
            "backgroundImgIdStr": "109951162868128395",
            "avatarImgIdStr": "109951163617898073"
          },
          "urlInfo": {
            "id": "E7AD32128AA9686008F8D6A5883652A3",
            "url": "http://vodkgeyttp9.vod.126.net/vodkgeyttp8/foks2R9i_2315660219_shd.mp4?ts=1622211870&rid=49342E65B7FEEB11F169FE443776A9D4&rl=3&rs=zdHbAkRvMitnoNoZHqfleHvXRHOWKeUX&sign=fbc6fd2ef24a39a876abfba1d9ca55b1&ext=NDC4znYcOoiSQ%2BhMj3pOhUOZl6jqP3UBag2xFfY3j7aWfyeHrI3YHpfWP4%2Bwc18kHBEFJkvHsXx73BZDWksVG5VTovfuRYLdWjrgxA%2F0hmULPqIYKvF8Ap3CZrm%2F%2Ba7MGvIcowS4mxhFS%2BtxG3%2BAcu0LsD6mQqvsx8g870zzK%2BQ%2BxPC7fvKpDBXr%2BrKG1X5KlY%2Fr5qu5d%2F0wL%2FM4suIxBdXMCpN7tFLaeGUPMHIVVv4cyDC%2BoD1qGodLHB9IWTW5",
            "size": 38102753,
            "validityTime": 1200,
            "needPay": false,
            "payInfo": null,
            "r": 720
          },
          "videoGroup": [
            {
              "id": 58100,
              "name": "现场",
              "alg": null
            },
            {
              "id": 1100,
              "name": "音乐现场",
              "alg": null
            },
            {
              "id": 5100,
              "name": "音乐",
              "alg": null
            },
            {
              "id": 4101,
              "name": "娱乐",
              "alg": null
            },
            {
              "id": 3101,
              "name": "综艺",
              "alg": null
            },
            {
              "id": 76108,
              "name": "综艺片段",
              "alg": null
            },
            {
              "id": 77102,
              "name": "内地综艺",
              "alg": null
            }
          ],
          "previewUrl": null,
          "previewDurationms": 0,
          "hasRelatedGameAd": false,
          "markTypes": null,
          "relateSong": [
            {
              "name": "叹云兮",
              "id": 863481092,
              "pst": 0,
              "t": 0,
              "ar": [
                {
                  "id": 1032298,
                  "name": "鞠婧祎",
                  "tns": [

                  ],
                  "alias": [

                  ]
                }
              ],
              "alia": [
                "电视剧《芸汐传》片尾曲"
              ],
              "pop": 100,
              "st": 0,
              "rt": null,
              "fee": 0,
              "v": 5,
              "crbt": null,
              "cf": "",
              "al": {
                "id": 71614935,
                "name": "叹云兮",
                "picUrl": "http://p3.music.126.net/MFMuqftGWW6LQEpM5jcrBw==/109951163386988996.jpg",
                "tns": [

                ],
                "pic_str": "109951163386988996",
                "pic": 109951163386989000
              },
              "dt": 283058,
              "h": {
                "br": 320000,
                "fid": 0,
                "size": 11324648,
                "vd": -26400
              },
              "m": {
                "br": 192000,
                "fid": 0,
                "size": 6794806,
                "vd": -23800
              },
              "l": {
                "br": 128000,
                "fid": 0,
                "size": 4529885,
                "vd": -22100
              },
              "a": null,
              "cd": "01",
              "no": 0,
              "rtUrl": null,
              "ftype": 0,
              "rtUrls": [

              ],
              "djId": 0,
              "copyright": 0,
              "s_id": 0,
              "rtype": 0,
              "rurl": null,
              "mst": 9,
              "cp": 36015,
              "mv": 0,
              "publishTime": 1530460800007,
              "privilege": {
                "id": 863481092,
                "fee": 0,
                "payed": 0,
                "st": 0,
                "pl": 320000,
                "dl": 999000,
                "sp": 7,
                "cp": 1,
                "subp": 1,
                "cs": false,
                "maxbr": 999000,
                "fl": 320000,
                "toast": false,
                "flag": 256,
                "preSell": false
              }
            }
          ],
          "relatedInfo": null,
          "videoUserLiveInfo": null,
          "vid": "E7AD32128AA9686008F8D6A5883652A3",
          "durationms": 153734,
          "playTime": 2156988,
          "praisedCount": 17486,
          "praised": false,
          "subscribed": false
        }
      },
      {
        "type": 1,
        "displayed": false,
        "alg": "onlineHotGroup",
        "extAlg": null,
        "data": {
          "alg": "onlineHotGroup",
          "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
          "threadId": "R_VI_62_F88048DF21C4F99FCCC3C24480A1A1C4",
          "coverUrl": "https://p2.music.126.net/zkJsh7tQsfESCqyDOYC6rg==/109951164629217713.jpg",
          "height": 720,
          "width": 1280,
          "title": "刀郎音乐的传承，云朵版《西海情歌》",
          "description": "刀郎音乐的传承，云朵版《西海情歌》",
          "commentCount": 124,
          "shareCount": 444,
          "resolutions": [
            {
              "resolution": 240,
              "size": 45021244
            },
            {
              "resolution": 480,
              "size": 80455221
            },
            {
              "resolution": 720,
              "size": 90906119
            }
          ],
          "creator": {
            "defaultAvatar": false,
            "province": 440000,
            "authStatus": 0,
            "followed": false,
            "avatarUrl": "http://p1.music.126.net/61JU8PofXDULCCXxUBvlcA==/109951165016677678.jpg",
            "accountStatus": 0,
            "gender": 0,
            "city": 440100,
            "birthday": -2209017600000,
            "userId": 583316949,
            "userType": 0,
            "nickname": "凝神的优雅挥洒的美",
            "signature": "",
            "description": "",
            "detailDescription": "",
            "avatarImgId": 109951165016677680,
            "backgroundImgId": 109951164952672780,
            "backgroundUrl": "http://p1.music.126.net/3y09Hy4lriR9b-ed2IxmjQ==/109951164952672779.jpg",
            "authority": 0,
            "mutual": false,
            "expertTags": null,
            "experts": null,
            "djStatus": 0,
            "vipType": 0,
            "remarkName": null,
            "backgroundImgIdStr": "109951164952672779",
            "avatarImgIdStr": "109951165016677678"
          },
          "urlInfo": {
            "id": "F88048DF21C4F99FCCC3C24480A1A1C4",
            "url": "http://vodkgeyttp9.vod.126.net/vodkgeyttp8/ayWUsrKP_2862352783_shd.mp4?ts=1622211870&rid=49342E65B7FEEB11F169FE443776A9D4&rl=3&rs=KkhgxkgOJeZgUccnLeOnvRUnfEfkwEVP&sign=a033d6fe787146dd3cec0bbd9ca5e4a1&ext=NDC4znYcOoiSQ%2BhMj3pOhUOZl6jqP3UBag2xFfY3j7aWfyeHrI3YHpfWP4%2Bwc18kHBEFJkvHsXx73BZDWksVG5VTovfuRYLdWjrgxA%2F0hmULPqIYKvF8Ap3CZrm%2F%2Ba7MGvIcowS4mxhFS%2BtxG3%2BAcu0LsD6mQqvsx8g870zzK%2BQ%2BxPC7fvKpDBXr%2BrKG1X5KlY%2Fr5qu5d%2F0wL%2FM4suIxBdXMCpN7tFLaeGUPMHIVVv5ftWHzpyX%2B6eL9b50JHB10",
            "size": 90906119,
            "validityTime": 1200,
            "needPay": false,
            "payInfo": null,
            "r": 720
          },
          "videoGroup": [
            {
              "id": 58100,
              "name": "现场",
              "alg": null
            },
            {
              "id": 1100,
              "name": "音乐现场",
              "alg": null
            },
            {
              "id": 5100,
              "name": "音乐",
              "alg": null
            }
          ],
          "previewUrl": null,
          "previewDurationms": 0,
          "hasRelatedGameAd": false,
          "markTypes": null,
          "relateSong": [

          ],
          "relatedInfo": null,
          "videoUserLiveInfo": null,
          "vid": "F88048DF21C4F99FCCC3C24480A1A1C4",
          "durationms": 274240,
          "playTime": 396881,
          "praisedCount": 1532,
          "praised": false,
          "subscribed": false
        }
      },
      {
        "type": 1,
        "displayed": false,
        "alg": "onlineHotGroup",
        "extAlg": null,
        "data": {
          "alg": "onlineHotGroup",
          "scm": "1.music-video-timeline.video_timeline.video.181017.-295043608",
          "threadId": "R_VI_62_52973E58D94C7AA1C64F2971F4B711F8",
          "coverUrl": "https://p2.music.126.net/VCnEp9q_SRqEYuGxXCR9pA==/109951163572773959.jpg",
          "height": 720,
          "width": 1280,
          "title": "Twins《下一站天后》 ConcertYY黄伟文作品展演唱会现场版",
          "description": "黄伟文是一个意念丰富，思想奇妙的填词人，他善写情歌，善用比喻，用词奇异，并创意大胆，每每能在歌词内收到言外之音之效。该歌曲延续了一贯的风格，歌曲贴合同名电影，讲诉了喜爱唱歌从小拥有明星梦的普通女孩的故事。委婉的旋律与歌词涵义以及twins深情的演唱使这首少女的梦幻之作熠熠生辉。",
          "commentCount": 803,
          "shareCount": 4591,
          "resolutions": [
            {
              "resolution": 240,
              "size": 23147227
            },
            {
              "resolution": 480,
              "size": 33017919
            },
            {
              "resolution": 720,
              "size": 52659933
            }
          ],
          "creator": {
            "defaultAvatar": false,
            "province": 330000,
            "authStatus": 0,
            "followed": false,
            "avatarUrl": "http://p1.music.126.net/-MZDEHaFdvQtdIdY2fDgyw==/109951164877618139.jpg",
            "accountStatus": 0,
            "gender": 1,
            "city": 330100,
            "birthday": 841507200000,
            "userId": 268678989,
            "userType": 200,
            "nickname": "随身音乐厅",
            "signature": "音乐的魅力，在于人的精神与音乐的共鸣。",
            "description": "",
            "detailDescription": "",
            "avatarImgId": 109951164877618140,
            "backgroundImgId": 109951165866068220,
            "backgroundUrl": "http://p1.music.126.net/Msq8ASEUsD0nrXiDROSdmQ==/109951165866068231.jpg",
            "authority": 0,
            "mutual": false,
            "expertTags": [
              "华语"
            ],
            "experts": {
              "1": "音乐视频达人",
              "2": "生活图文达人"
            },
            "djStatus": 10,
            "vipType": 11,
            "remarkName": null,
            "backgroundImgIdStr": "109951165866068231",
            "avatarImgIdStr": "109951164877618139"
          },
          "urlInfo": {
            "id": "52973E58D94C7AA1C64F2971F4B711F8",
            "url": "http://vodkgeyttp9.vod.126.net/vodkgeyttp8/PfWjRvvj_101862675_shd.mp4?ts=1622211870&rid=49342E65B7FEEB11F169FE443776A9D4&rl=3&rs=dWHSWvNaNuOTMURjEHOnQylwpggIphMc&sign=c5873fe3dfbeb20272d1d577748579f8&ext=NDC4znYcOoiSQ%2BhMj3pOhUOZl6jqP3UBag2xFfY3j7aWfyeHrI3YHpfWP4%2Bwc18kHBEFJkvHsXx73BZDWksVG5VTovfuRYLdWjrgxA%2F0hmULPqIYKvF8Ap3CZrm%2F%2Ba7MGvIcowS4mxhFS%2BtxG3%2BAcu0LsD6mQqvsx8g870zzK%2BQ%2BxPC7fvKpDBXr%2BrKG1X5KlY%2Fr5qu5d%2F0wL%2FM4suIxBdXMCpN7tFLaeGUPMHIVVv4cyDC%2BoD1qGodLHB9IWTW5",
            "size": 52659933,
            "validityTime": 1200,
            "needPay": false,
            "payInfo": null,
            "r": 720
          },
          "videoGroup": [
            {
              "id": 58100,
              "name": "现场",
              "alg": null
            },
            {
              "id": 1100,
              "name": "音乐现场",
              "alg": null
            },
            {
              "id": 12100,
              "name": "流行",
              "alg": null
            },
            {
              "id": 5100,
              "name": "音乐",
              "alg": null
            },
            {
              "id": 14137,
              "name": "感动",
              "alg": null
            },
            {
              "id": 16237,
              "name": "粤语",
              "alg": null
            }
          ],
          "previewUrl": null,
          "previewDurationms": 0,
          "hasRelatedGameAd": false,
          "markTypes": null,
          "relateSong": [
            {
              "name": "下一站天后(Live)",
              "id": 178895,
              "pst": 0,
              "t": 0,
              "ar": [
                {
                  "id": 6100,
                  "name": "余文乐",
                  "tns": [

                  ],
                  "alias": [

                  ]
                }
              ],
              "alia": [

              ],
              "pop": 95,
              "st": 0,
              "rt": "",
              "fee": 8,
              "v": 10,
              "crbt": null,
              "cf": "",
              "al": {
                "id": 18091,
                "name": "加州红903热火乐团音乐会",
                "picUrl": "http://p4.music.126.net/nHJqdh10v3uwg1TYzMQmwQ==/56075093028920.jpg",
                "tns": [

                ],
                "pic": 56075093028920
              },
              "dt": 215771,
              "h": null,
              "m": {
                "br": 192000,
                "fid": 0,
                "size": 5178558,
                "vd": 1
              },
              "l": {
                "br": 128000,
                "fid": 0,
                "size": 3452386,
                "vd": 1
              },
              "a": null,
              "cd": "1",
              "no": 16,
              "rtUrl": null,
              "ftype": 0,
              "rtUrls": [

              ],
              "djId": 0,
              "copyright": 1,
              "s_id": 0,
              "rtype": 0,
              "rurl": null,
              "mst": 9,
              "cp": 7003,
              "mv": 0,
              "publishTime": 1120147200000,
              "privilege": {
                "id": 178895,
                "fee": 8,
                "payed": 0,
                "st": 0,
                "pl": 128000,
                "dl": 0,
                "sp": 7,
                "cp": 1,
                "subp": 1,
                "cs": false,
                "maxbr": 192000,
                "fl": 128000,
                "toast": false,
                "flag": 4,
                "preSell": false
              }
            }
          ],
          "relatedInfo": null,
          "videoUserLiveInfo": null,
          "vid": "52973E58D94C7AA1C64F2971F4B711F8",
          "durationms": 196830,
          "playTime": 2606840,
          "praisedCount": 10818,
          "praised": false,
          "subscribed": false
        }
      }
    ];
    let videoList = this.data.videoList;
    //将视频最新的数据更新到原有的数据列表中
    videoList.push(...newVideoList);
    this.setData({
      videoList
    })
  },

  //跳转到搜索页面
  toSearch(){
    wx.navigateTo({
      url: '/pages/search/search'
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
    console.log("页面下拉刷新");
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    console.log("页面上拉触底");
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function ({from}) {
    //from:button：页面内转发按钮,menu：右上角转发菜单
    console.log(from)
    if (from === 'button'){
      return {
        title: '来自button转发的内容',
        path: '/pages/video/video',
        imageUrl: '/static/images/nvsheng.jpg'
      }
    }else{
      return {
        title: '来自menu转发的内容',
        path: '/pages/video/video',
        imageUrl: '/static/images/nvsheng.jpg'
      }
    }

  }

})
