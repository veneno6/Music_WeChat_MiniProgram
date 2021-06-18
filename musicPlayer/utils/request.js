// 发送ajax请求
/*
* 1. 封装功能函数
*   1. 功能点明确
*   2. 函数内部应该保留固定代码(静态的)
*   3. 将动态的数据抽取成形参，由使用者根据自身的情况动态的传入实参
*   4. 一个良好的功能函数应该设置形参的默认值(ES6的形参默认值)
* 2. 封装功能组件
*   1. 功能点明确
*   2. 组件内部保留静态的代码
*   3. 将动态的数据抽取成props参数，由使用者根据自身的情况以标签属性的形式动态传入props数据
*   4. 一个良好的组件应该设置组件的必要性及数据类型
*     props: {
*       msg: {
*         required: true,
*         default: 默认值，
*         type: String
*       }
*     }
*
* */
import config from "./config";

export default (url, data={}, method='get') => {
    return new Promise((resolve, reject) => {
        wx.request({
            url: config.host + url,
            data,
            header: {
                //不可以通过下标来获取MUSIC_U，返回的数据会变化不在指定的位置，所以使用find函数，！= -1 默认没找到返回-1转换为布尔值为ture,则直接返回第一条数据，使用！=-1为过滤第一条数据
                //这样之后每次发送都会携带cookie,使用三元表达式判断，因为如果第一次进入主界面没有登录，就没有cookie信息缓存到本地，获取缓存cookie时就会为空，发送请求中会用find函数，会报错
                cookie: wx.getStorageSync('cookies')?wx.getStorageSync('cookies').find(item => item.indexOf('MUSIC_U') != -1):''
            },
            success: (res) => {
                //res中是原始的的响应数据，其中包含cookie 和 head的原始数据，res.data中只有页面数据
                //使用传入的参数(isLogin)来判断是否为登录的请求，为登录的话就将cookie存到本地
                if (data.isLogin){
                    wx.setStorage({
                        key: 'cookies',
                        data: res.cookies
                    })
                }
                resolve(res.data)
            },
            fail: (err) => {
                reject(err)
            }
        })
    })
}
