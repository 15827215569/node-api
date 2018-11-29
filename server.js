//引入各种模块
var express = require('express');
var async = require('async');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://127.0.0.1:27017';
var app = express();
app.listen(3000);
//处理POST请求的请求体
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//设置响应头来处理跨域
app.use(function (req, res, next) {
    res.set({ 'Access-Control-Allow-Origin': '*' });//允许所有访问
    next();
})

// 登录的请求 localhost:3000/api/login
app.post('/api/login', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var results = {};
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '数据连接失败';
            res.json(results);
            return;
        }
        var db = client.db('project');
        db.collection('user').find({
            name: username,
            password: password
        }).toArray(function (err, data) {
            if (err) {
                results.code = -1;
                results.msg = '查询失败';
            } else if (data.length <= 0) {
                results.code = -1;
                results.msg = "用户名或密码错误";
            } else {
                results.code = 0;
                results.msg = '登录成功';
                results.data = {
                    nikename: data[0].nikename
                }
            }
            client.close();
            res.json(results);
        })
    });
});
//删除的请求
app.post('/api/user/delete', function (req, res) {
    var name = req.body.name;
    var results = {};
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '数据连接失败';
            res.json(results);
            return;
        }
        var db = client.db('project');
        db.collection('user').deleteOne({ name: name }, function (err, data) {
            console.log(data)
            if (err) {
                results.code = -1;
                results.msg = '数据删除失败';
                results.data = false
            } else {
                results.code = 0;
                results.data = data;
            }
            client.close();
            res.json(results);
        })
    })
})

//主页上显示是否是管理员的请求

app.post('/api/isAdmin', function (req, res) {
    var nikename = req.body.nikename;
    var results = {};
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '数据连接失败';
            res.json(results);
            return;
        }
        var db = client.db('project');
        db.collection('user').find({
            nikename: nikename
        }).toArray(function (err, data) {
            if (err) {
                results.code = -1;
                results.msg = '查询失败';
            } else {
                results.code = 0;
                results.msg = '登录成功';
                results.data = {
                    isAdmin: data[0].isAdmin
                }
            }
            client.close();
            res.json(results);
        })
    });
});

//注册的请求
app.post('/api/register', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var nikename = req.body.nikename;
    var age = parseInt(req.body.age);
    var isAdmin = req.body.isAdmin === '是' ? true : false;
    var sex = req.body.sex;
    var results = {};
    console.log(111)
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '数据连接失败';
            res.json(results);
            return;
        }
        var db = client.db('project');
        async.series([
            function (cb) {
                db.collection('user').find({ $or: [{ name: username }, { nikename: nikename }] }).count(function (err, num) {
                    if (err) {
                        cb(err)
                    } else if (num > 0) {
                        // 这个人已经注册过了，
                        cb(new Error('已经注册'));
                    } else {
                        // 可以注册了
                        cb(null);
                    }
                })
            },
            function (cb) {
                db.collection('user').insertOne({
                    name: username,
                    password: password,
                    nikename: nikename,
                    age: age,
                    sex: sex,
                    isAdmin: isAdmin
                }, function (err) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null);
                    }
                })
            }
        ], function (err, result) {
            if (err) {
                results.code = -1;
                results.msg = '用户名或昵称已注册';
            } else {
                results.code = 0;
                results.msg = '注册成功';
            }
            // 不管成功or失败，
            client.close();
            res.json(results);
        })
    })
})

//用户列表的请求
app.get('/api/user/list', function (req, res) {
    var page = parseInt(req.query.page);
    var pageSize = parseInt(req.query.pageSize);
    var totalSize = 0;
    var totalPage = 0;

    var results = {};
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '数据连接失败';
            res.json(results);
            return;
        }
        var db = client.db('project');
        async.series([
            function (cb) {
                db.collection('user').find().count(function (err, num) {
                    if (err) {
                        cb(err);
                    } else {
                        totalSize = num;
                        cb(null);
                    }
                })
            },
            function (cb) {
                db.collection('user').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function (err, data) {
                    if (err) {
                        cb(err)
                    } else {
                        cb(null, data);
                    }
                })
            }
        ], function (err, result) {
            if (err) {
                results.code = -1;
                results.msg = err.message;
            } else {
                totalPage = Math.ceil(totalSize / pageSize);
                results.code = 0;
                results.msg = '查询成功';
                results.data = {
                    list: result[1],
                    totalPage: totalPage,
                    page: page
                }
            }
            client.close();
            res.json(results);
        });
    })
});

//搜索的请求
