## 环境
lnmp环境
php需要的扩展：pcntl、posix、redis、pdo
建议安装libevent扩展，高并发性更好
安装redis并启动

## 需要配置的文件
- 1.数据库配置 Applications/Config/Db.php
- 2.redis配置: Applications/Config/Redis.php

## 需要的库表 
（需要手动建立webChat库，并手动建立其内的user表，其他的表会自动生成）
- 库： webChat （需要手动建立）
- 表：webchat_message年月       //（自动生成）用来存储聊天记录
- 表：webchat_broadcast年       //（自动生成）用来存储广播消息
- 表：queue_deamon_status  //（自动生成）用来存储队列状态
- 表： webchat_user		 //（手动建立）用来存储用户数据

  		CREATE TABLE `webchat_user` (
		  `uid` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '用户id',
		  `accountid` varchar(40) NOT NULL COMMENT '域账户',
		  `pwd` varchar(40) NOT NULL,
		  `username` varchar(40) NOT NULL COMMENT '姓名',
		  `dept` varchar(40) NOT NULL COMMENT '部门',
		  `tel` varchar(40) NOT NULL COMMENT '分机号',
		  `mobile` varchar(100) NOT NULL COMMENT '移动电话（用,分隔）',
		  `email` varchar(255) NOT NULL COMMENT '邮箱',
		  `deptDetail` varchar(128) NOT NULL DEFAULT '' COMMENT '详细部门从一级到n级',
		  `updateTime` int(11) NOT NULL DEFAULT '0',
		  PRIMARY KEY (`uid`),
		  UNIQUE KEY `accoutiduq` (`accountid`)
		) ENGINE=MyISAM AUTO_INCREMENT=10727 DEFAULT CHARSET=utf8


## 注意事项
用户账号仅支持 字母、数字、下划线、英文.  例如(cui_hong.bo)
- chatid:chatid一共两种情况
	       如果是单人聊天则chatid就是两个人用‘--’连接的字串（且注意俩名称是经过sort排序的）cuihb--xieyx
	       如果是群组聊天则chatid就是唯一的字串(例如群组+创建群的时间)cuihb-63756323 根据这个字串可以从redis中获取成员

- 入口文件
		   Applications/Web 是web访问目录，该目录下的chat.html是前端入口文件
## 运行：
### 一、启动聊天服务。根目录下

	（以debug方式启动 ） 
	php start.php start
	（以daemon方式启动  ）
	php start.php start -d
	除了start命令，还可以使用 stop restart reload status 等命令
	
### 二、聊天/广播数据保存永久保存、生成最近联系人、生成缓存消息/广播列表。
	/Vendors/Redis/ 下运行

           临时运行    	  php doQuene 
	daemon方式运行     nohub php doQuene &


## 消息发送和接受机制
 
#### 登录
	wc_ws.send({"type":"login","clientName":wc_loginName})
	
#### 前端发送消息机制
	wc_ws.send(JSON.stringify({"type":"say","chatid":chatid,"content":"aaa", "msgType":''}));

#### 发送广播消息
	wc_ws.send(JSON.stringify({"type":"broadcast","fromuser":"cuihb","touser":'cuihb-wangjx',"title":"aaa","content":"bbbb"}));

#### 修改群组广播
	wc_ws.send(JSON.stringify({"type":"groupset","chatid":chatid,"title":groupTitle,"members":memberids}));

#### 修改群名称广播
	wc_ws.send(JSON.stringify({"type":"systemNotice","action":"grouptitle","chatid":chatid,"title":''}));

#### 开启与屏蔽群消息
	wc_ws.send(JSON.stringify({"type":"systemNotice","chatid":nowChatid,"action":"opennotice"}));
	wc_ws.send(JSON.stringify({"type":"systemNotice","chatid":nowChatid,"action":"closenotice"}));


## 实现的功能：
- 1、所有聊天历史记录永久保存
- 2、记录用户最近联系人
- 3、支持拉群
- 4、支持新消息/广播、离线消息/广播提醒
- 5、消息提醒支持 声音、桌面弹窗、title闪烁 三种提醒方式
- 5、支持用户上线提醒
- 7、支持发送广播消息
- 8、支持图片、附件发送
- 9、支持屏蔽消息、选择消息发送方式
- 6、消息队列监控

## 实现方法：

### 消息永久保存
 所有用户聊天消息都会存放到一个消息队列中，处理消息队列的程序采用始终循环的方式，将消息队列数据中的数据弹出并存到数据库表中。
 记录消息的表中有一个chatid字段，这个chatid就是用来记录每一路聊天的唯一标记，比如zhangsan、lisi两人之间的聊天，
 那么他们的chatid就是lisi--zhangsan。其中array('lisi','zhangsan')是
 经过排序的，即不管是lisi对zhangsan说还是zhangsan对lisi说生成的chatid都是一样的。
 如果是群聊天，则在第一次建群时的群主+时间戳 会生成本群的 chatid 群成员存储在 redis 的hash数据类型中
 如果队列中没有消息，则处理程序会自动sleep，减少服务器压力。
 消息表会每月自动分表，搜索消息历史是可以查询所有的消息的。

  
### 记录用户最近联系人
 在处理消息队列时记录用户最近联系人，循环每一条消息所涉及的用户群，然后将用户群存于相关用户的redis有序集合中，因为集合不允许重复的值存在，
redis中的几种数据结构只有有序集合可以实现根据score更新元素的顺序。（集合做不到、列表则需要判断，删除，添加）

### 拉群
支持多用户群聊，修改群名称。拉人、踢人都会有提醒。群聊用户无上限设置，但是建议不超过500人。

### 发送广播消息
支持发送广播消息。广播对象数量无上限。

### 消息提醒
新消息提醒就是当用户在线时，新消息到来时，如果最近联系人列表中有对方，则将未读消息数加1，如果没有，则将对方加在最近联系人列表，并未读消息数加1。
离线消息提醒，当A向B发送消息时，会用过B的用户名取client_id来判断B是否在线，如果B不在线，则会将此消息压入属于B的离线消息列表，
离线消息列表最多保留50条，当B登陆时会加载离线消息列表并判处最近联系人列表中有A，则将A未读消息加1，如果没有，则将A加在最近联系人列表，并未读消息加1。
群离线消息的提醒的实现与双人对话的离线消息提醒相类似。

### 消息提醒方式
消息提醒方式一共有三种：声音、桌面弹窗、title闪烁

### 用户上线提醒
 用户上线时向所有在线用户广播。

### 历史记录
 也是在处理消息队列时处理。任何一路对话的最新20条都会存在redis的列表中，redis的键值也会用到上面的chatid。
 因为是基于浏览器的聊天，每刷新页面本地的聊天记录都会清空，第一次加载的记录需要远程取，就可以直接从redis中取，
 之后只要用户不刷新页面，那么聊天记录都是通过js存在本地，而且每路对话最多存50条到本地，避免从远程取。如果要看以前的记录则向数据库中取。
 
### 图片、附件发送
支持图片、附件的发送。发送的文件无大小限制，前端进行分片上传，但是为了防止恶意上传，可以设置后端上传大小限制。

### 屏蔽群消息，选择消息发送方式
屏蔽与开启群消息提示会向群发送广播提示，再向前端种cookie，来达到这个目的。
消息发送方式可选择 enter或者enter+ctrl

### 队列监控
 监控该消息队列总共处理消息数量
 监控当天处理消息数量
 监控该消息队列是否还活着

简化目录结构：
./ 
   |-start.php   *workman的启动程序
   |-Workerman   *workman开源框架
   |-GatewayWorker	*GatewayWorker开源框架，
   |-Applications / |
    				|Api / |
    				|      |Controler	*控制器
					|      |
					|      |Model	*model
					|      |
					|      |Plugin	*公用插件model
					|
					|Config /  |
					|		   |St	*存储一些全局的常量字段
					|		   |
					|		   |Db.php *用于配置Db
					|		   |
					|		   |Redis.php	*用于配置Redis
					|		   |
					|		   |Store.php	*用与选择存储引擎，现在仅支持redis
					|
					|Vendors / |
					|		   |-Quene	*统一队列逻辑处理
					|		   |
					|		   |-Redis / |-doQuene.php	*处理消息队列
					|
					|Web / | 
					|      |chat.html	*聊天页面
					|      |
					|      |chatapi.php	*接口入口文件
					|	
					|Event.php	*聊天推送主处理程序
   
   
   
   
   
