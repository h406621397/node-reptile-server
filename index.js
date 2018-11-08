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

let app = new Koa();

// 爬取网站的数据后生成JSON文件，此处设置JSON文件的保存路径
let savePath = 'E:/reptile/wuhanlvyou';

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