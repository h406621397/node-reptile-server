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
// 引入request模块
var request = require('request')
// koa处理跨域请求
var cors = require('koa2-cors');



let app = new Koa();

let savePath = 'E:/reptile/meizi';

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
    let url = page==='1'? 'http://www.mzitu.com/mm/':`http://www.mzitu.com/mm/page/${page}/`;
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
    saveImg(page, data, url);

    await next();

});

function getData(page) {

    // 定义网络爬虫的目标地址
    let url = page==='1'? 'http://www.mzitu.com/mm/':`http://www.mzitu.com/mm/page/${page}/`;

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
        let resultList = [];
        // 沿用JQuery风格，定义$，加载HTML
        let $ = cheerio.load(html);

        // 获取数据并筛选生成JSON数组
        let imgList = $('#pins');

        // 判断是否是最后一页
        //if(imgList.children('span').eq(0).text()==='对不起，暂无相关新闻！'){return []}

        imgList.find('li').each(function(index, item) {
            const liItem = $(this), imgNode = liItem.find('a img');
            let title = imgNode.prop('alt');
            let img_url = imgNode.data('original');
            resultList.push({
                title,
                img_url,
            });
        });
        // 返回数据JSON数组
        return resultList;
    } else {
        console.log('无数据');
        return [];
    }

}

// 创建文件夹
function createDir(path){
    if(!fs.existsSync(path)){
        try {
            fs.mkdirSync(path);
        }catch (e){
            throw new Error(`文件夹创建失败：${e}`);
        }
    }
}

// 创建JSON文件夹保存爬取的JSON文件
function saveImg(page, data, url) {

    createDir(savePath);

    data.forEach((obj, index) => {

        /* 设置Referer为目标网站，反防盗链 */
        let headers = {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*!/!*;q=0.8",
            "Accept-Encoding": "gzip, deflate",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Cache-Control": "no-cache",
            Host: "i.meizitu.net",
            Pragma: "no-cache",
            "Proxy-Connection": "keep-alive",
            Referer: url,//根据爬取的网址跟换
            "Upgrade-Insecure-Requests": 1,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.19 Safari/537.36"
        };

        try {
            const name = obj.img_url.slice(obj.img_url.lastIndexOf('/') + 1);
            createDir(`${savePath}/img${page}`);
            request(obj.img_url, {headers}).pipe(fs.createWriteStream(`${savePath}/img${page}/${name}`));
        }catch (e){
            console.log(`meizi图片保存失败：${e}`);
        }

    });

}


// 添加路由中间件
app.use(router.routes());

// 启动服务 开启端口监听
app.listen(3000);
console.log('服务已启动：localhost:3000');