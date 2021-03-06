/**
 * Created by HuangXiaoFeng on 2018-11-07 0007.
 */

// 加载http模块
let http = require('http');
// Cheerio 是一个Node.js的库， 它可以从html的片断中构建DOM结构，然后提供像jquery一样的css选择器查询
let cheerio = require('cheerio');
// 引入koa
let Koa = require('koa');
// 引入koa路由
let router = require('koa-router')();
// 引入文件系统
let fs = require('fs');
// koa处理跨域请求
let cors = require('koa2-cors');
// 引入mysql
let mysql = require('mysql');
//引入sha1加密
let sha1 = require('sha1');
//引入jwt
let jwt = require('jsonwebtoken');

/* 前端传来的用户数据 */
let user = {
    name: 'xiaofeng',
    psd: sha1('coderxf123')
};

/* 生成token */
let token = jwt.sign(user, 'xff', {
    expiresIn: 3,  // 过期时间(3小时过期)
    issuer: 'otec',  // 发行者
});

/* 解密 */
try {
    /*
     解密成功：{
         name: 'xiaofeng',
         psd: '0caef48a9fe01f27bd9ef058341f334b7daa58c5',
         iat: 1541748209,  // token生成的时间毫秒数
         exp: 1541748329   // token失效的时间毫秒数
         iss: 'otec'
      }
    */
   let tokenInfo = jwt.verify(token, 'xff');
   console.log('解密成功：', tokenInfo);

}catch (e){
    console.log('解密失败(token时间过期/签名无效)', e);
}



let app = new Koa();

// 爬取网站的数据后生成JSON文件，此处设置JSON文件的保存路径
let savePath = 'E:/reptile/wuhanlvyou';

/*

// 创建数据库连接
let connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '888888',
    database : 'wuhan_lvyou'
});

// 连接数据库
connection.connect();

// 查询
connection.query('SELECT * FROM news where id=?', ['10'], function (err, result) {
    if(err){
        console.log('查询失败:', err);
        return
    }
    console.log(result);
});

// 修改
let param = '哈哈哈改标题！';
connection.query('UPDATE news SET title=? where id=?', [param,'10'], function (err, result) {
    if(err){
        console.log('更新失败:', err);
        return
    }
    console.log(result);
});

// 删除
connection.query('DELETE FROM news where id=10', function (err, result) {
    if(err){
        console.log('删除失败:', err);
        return
    }
    console.log(result);
});*/


// 解决跨域问题
app.use(cors());


app.use(async (ctx, next)=>{
    console.log(`请求地址：${ctx.request.url}`);
    await next();
});

router.get('/', async (ctx, next)=>{
    ctx.redirect('/getList/1');
    await next();
});


router.get('/getList/:page', async (ctx, next)=>{

    // 获取URL参数
    let page = ctx.params.page;
    let data = [];
    try{
        // 获取数据并筛选
        data = await getData(page);
    }catch(e) {
        console.log('获取数据出错：访问目标网站异常');
    }

    // 返回JSON数据
    ctx.response.type = 'json';
    ctx.response.body = data;

    // 创建JSON文件并保存数据
    saveJson(page, data);

    await next();

});

/* 下载页面 */
function getData(page) {

    // 定义网络爬虫的目标地址
    let url = `http://www.visitwuhan.cn/Default/wuhan/LYDT/${page}`;

    return new Promise((resolve, reject) => {
        http.get(url, function(res) {
            let html = '';
            // 获取页面数据
            res.on('data', function(data) {
                html += data;
            });
            // 数据获取结束
            res.on('end', function() {
                // 筛选出需要的HTML节点信息
                resolve(filterNode(html));
            });
        }).on('error', function() {
            reject('获取数据出错！');
        });
    });

}

/* 过滤页面信息 */
function filterNode(html) {
    if (html) {
        // 生成的json数组
        let newsList = [];
        // 沿用JQuery风格，定义$，加载HTML
        let $ = cheerio.load(html);

        // 获取需要的数据节点
        let slideList = $('#dataList');

        // 判断是否是最后一页
        if(slideList.children('span').eq(0).text()==='对不起，暂无相关新闻！'){return []}

        // 遍历节点获取数据并保存到数组
        slideList.find('ul.news-list').each(function(index, item) {
            const newsItem = $(this), aNode = newsItem.find('h5 a');
            let title = aNode.text();
            let news_url = aNode.prop('href');
            let time = newsItem.find('.nl-date').text();
            newsList.push({
                title,
                news_url,
                time
            });

            // 保存到数据库
            /*connection.query('INSERT INTO news(id,title,url,time,create_time) VALUES(0,?,?,?,?)', [title, news_url, time, new Date().toLocaleString()], function (err, result) {
                if(err){
                    console.log('保存失败：',err.message);
                }
            });*/

        });
        // 返回数据JSON数组
        return newsList;
    } else {
        console.log('未获取到网页数据！');
        return [];
    }
}

// 创建JSON文件夹保存爬取的JSON文件
function createJsonDir() {
    if(!fs.existsSync(savePath)){
        try {
            fs.mkdirSync(savePath);
        }catch (e){
            throw new Error(`JSON文件夹创建失败：${e}`);
        }
    }
}

// 保存JSON文件到本地
function saveJson(page, data) {
    createJsonDir();
    if(!fs.existsSync(`${savePath}/${page}.json`)){
        try{
            fs.writeFileSync(`${savePath}/${page}.json`, JSON.stringify(data), {flag:"w"});
        }catch (e){
            console.log(`保存文件失败：${e}`);
        }
    }else{
        console.log('文件已存在');
    }
}


// 添加路由中间件
app.use(router.routes());

// 启动服务 开启端口监听
app.listen(3000);
console.log('服务已启动：localhost:3000');