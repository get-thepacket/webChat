	if (typeof console == "undefined") {    this.console = { log: function (msg) {  } };}
	//几个全局变量
	var wc_loginName='',  //用户登录名称
		wc_allUserArr = [],//用以存储所有用户的id=》name
		wc_ws,
		wc_reConnectTimeid, 
		wc_reconnect=false, 
		wc_errorType=false;
	function init() {
	    // 创建websocket
	 	wc_ws = new WebSocket("ws://"+document.domain+":7272");
	   // 当socket连接打开时，输入用户名
	   wc_ws.onopen = function() {
	 	  wc_reConnectTimeid && window.clearInterval(wc_reConnectTimeid);
	 	  if(!wc_loginName)
	 	  {
			    showLoginPage();
	 	  }
	 	  if(!wc_loginName) {
	 		  return wc_ws.close();
			  }
	 	  if(wc_reconnect == false)
	 	  {
	     	  // 登录
	 		  var login_data = JSON.stringify({"type":"login","clientName":wc_loginName});
	 		  console.log("发送登录数据:"+login_data);
			      wc_ws.send(login_data);
	 		  wc_reconnect = true;
	 	  }
	 	  else
	 	  {
	     	  // 断线重连
	     	  var relogin_data = JSON.stringify({"type":"login","clientName":wc_loginName});
	 		  console.log("发送登录数据:"+relogin_data);
	 		  wc_ws.send(relogin_data);
	 	  }
	   };
	   // 当有消息时根据消息类型显示不同信息
	   wc_ws.onmessage = function(e) {
	 	 console.log(e.data);
	     var data = JSON.parse(e.data);
	     switch(data['type']){
	           // 服务端ping客户端
	           case 'ping':
	         	wc_ws.send(JSON.stringify({"type":"pong"}));
	             break;;
	           // 登录 更新用户列表
	           case 'login':
	               //{"type":"re_login","clientName":"xxx","client_list":"[...]","all_list":"[...]","time":"xxx"}
	        	   lightOnlineUserList(new Array(data['clientName']));
	        	   break;
	           // 发言
	           case 'say':
	         	  //{"type":"say","fromuser":xxx,"chatid":xxx,"message":"xxx","time":"xxx"}
	        	   recieveMsg(data['fromuser'], data['chatid'], data['message'], data['time']);
	         	  break;
	           // 发言
	           case 'broadcast':
	               //前端发送广播接口
	               //wc_ws.send(JSON.stringify({"type":"broadcast","touser":["技术部"],"content":"qqqdddddddddddddddddddd"}));
	               console.log(data);
	         	  break;
	           // 加载历史消息
	           case 'history':
	         	  //{"type":"history","messageList":"[...]"}
	         	  loadHistoryMessage(data['messageList']);
	         	  break;
	           // 错误处理
	           case 'error':
	         	  switch(data['info']){
	       	          case 'erroruser':
	             	      alert(data['msg']);
	             	      wc_errorType = true;wc_loginName = '';
	             	      break;
	       	          case 'loginconflict':
	             	      alert(data['msg']);
	             	      wc_errorType = true;
	             	      break;
	         	      default:
	             	      break;
	         	  }
	         	  break; 
	          // 用户退出 更新用户列表
	           case 'logout':
	         	  //{"type":"logout","clientName":xxx,"time":"xxx"}
	        	  lightOfflineUserList(new Array(data['clientName']))
	         	  break;
	     }
	   };
	   wc_ws.onclose = function() {
	 	  console.log("连接关闭");
	 	  // 定时重连
	 	  window.clearInterval(wc_reConnectTimeid);
	 	  if(!wc_errorType){
	 		  wc_reConnectTimeid = window.setInterval(init, 3000);
	       }
	   };
	   wc_ws.onerror = function() {
	 	  console.log("出现错误");
	   };
	 }
	init();
	
	// 输入姓名
    function showLoginPage(){  
        wc_loginName = prompt('输入你的名字：', '');
        if(!wc_loginName || wc_loginName=='null'){  
            alert("输入名字为空或者为'null'，请重新输入！");  
            showLoginPage();
        }
    }
    //更新用户列表
    function flushAllList(data) {
    	var userlist_all_window = $("#organization-structure");
    	userlist_all_window.empty();
    	flushAllListFunc(userlist_all_window,data);
    	userlist_all_window.treeViewModify({});
    }
    //更新最近联系人列表
    function loadNearestContact(data) {
    	for(var p in data) {
    		loadNearestContactFunc(data[p]);
    	}
    }
    //更新在线用户
    function addOnlineList(data) {
    	lightOnlineUserList(data);
    }
    //更新未读消息
    function loadUnreadMsg(data) {
    	for(var q in data) {
    		loadUnreadMsgFun(q, data[q]);
    	}
    }
    /*************ws****************/
    //发送消息
    function sendToWsMsg(msg, type) {
    	msg = encMsg(msg, type);
		
		var nowChatId = getNowChatId();
		wc_ws.send(JSON.stringify({"type":"say","chatid":nowChatId,"content":msg}));
    }
    //接收消息
    function recieveMsg(fromuser, chatid, msg, time) {
    	makeHistoryList(fromuser, chatid, msg, time);
    	
    	var nowChatId = getNowChatId();
		//判断是否在最近联系人中，如没有则显示(个人消息和群消息都判断)
		if(!isChatidInContact(chatid)){
			loadNearestContactFunc(chatid);
			lightOnlineUserList(new Array(fromuser));
		}
    	
		//判断是否为当前用户，当前用户则append到聊天box里面，否则则将该聊天对话的未读消息+1
		if(nowChatId === chatid) {
			var msgList = [{"message":msg, "fromuser":fromuser, "time":time}];
			chatInDialogContainer(msgList);
		}else{
			loadUnreadMsgFun(chatid, 1);
		}
    }
    
    
    
    /*******接口函数********/
    //向某chatid的dialogcontainer中加载本地历史数据
    function historyInDialog(chatid) {
    	$('.logs').empty();
    	if(window["chat"+chatid+"History"] != undefined){
            var historyLog = window["chat"+chatid+"History"];
            chatInDialogContainer(historyLog);
        //redis中取历史记录
        }else{
        	wc_ws.send(JSON.stringify({"type":"history","chatid":chatid}));

        	//等待redis中数据
            var i = 0;
            var waitHistory = function(){
                    i++;
                	if(window["chat"+chatid+"History"] != undefined){
                		chatInDialogContainer(window["chat"+chatid+"History"], true);
                		clearInterval(waitTime);
                    }
            	    if(i>50)
            	    	clearInterval(waitTime);
                };
        	var waitTime = setInterval(waitHistory, 10);
        	
        }
    }
    //向聊天容器中放数据都走这个
    function chatInDialogContainer(msgList) {
    	for(var i in msgList){
    		$('.logs').append(decMsg(msgList[i].message,msgList[i].fromuser,msgList[i].time));
    	}
		$('.logs').scrollToBottom();
    }
    //根据chatid获取userList
    function getUserListFromChatid (chatid) {
    	var userInfo = null;
    	$.ajax({
    		async:false,
    		url:'/chatapi.php?c=group&a=getinfo&chatid='+chatid,
    		dataType:'json',
    		success:function(r) {
    			userInfo = r.data;
    		}
    	});
		return userInfo;
    }
    //加载历史消息
    function loadHistoryMessage(messageList){
    	for(var p in messageList){
        	var chatSomeoneHistory = 'chat'+messageList[p].chatid+'History';
        	
        	if(window[chatSomeoneHistory] == undefined){
            	window[chatSomeoneHistory] = [];
            }
        	window[chatSomeoneHistory].push(messageList[p]);
        }
    }
    //encmsg 原始的msg数据加工成像数据库中存储的数据（return str）
    function encMsg(msg, type) {
    	switch(type) {
    	case 'image':
    		break;
    	case 'file':
    		break;
    	default :
    		var face_pattern = /<img\b\ssrc="\.\/images\/smiley\/(\d+)\.gif">/g;
			var br_pattern = /<\/div>/g;
			var clear_tag_pattern = /<\/?(\w+\b)[^>]*>(?:([^<]*)<\/\1[^>]*>)?/g;
			//表情转义
			msg = msg.replace(face_pattern, '[\\face$1]');
			msg = msg.replace(br_pattern, '[\\br]');
			msg = msg.replace(clear_tag_pattern, '$2');	
    		break;
    	}
		return msg;
    }
    //decMsg 将从数据库中获取的msg，还原成可以向聊天box append的字符串。
    function decMsg(msg, userid, time) {
    	//消息还原
		msg = msg.replace(/\[\\([a-z]+)(\d+)?\]/g, function(match, p1, p2, offset, string) {
			switch(p1) {
				case 'face':
					return '<img src="./images/smiley/'+p2+'.gif">';
				case 'br':
					return '<br />';
				case 'image':
					//查附件表，id为p2
					return '';
				case 'file':
					//查附件表，id为p2
					return '';
			}
		});
		var selfClass = userid === wc_loginName ? ' self' : ''
	    var pitem     = wc_allUserArr[userid]+' - '+timestampTodate(time);
		return '<div class="row'+selfClass+'"><div class="user-avatar"><img class="avatar" src="./default_34_34.jpg"></div> \
				<div class="message-detail"> \
					<p>'+pitem+'</p> \
					<div class="message-box"> \
						'+msg+'&nbsp; \
						<i class="chat-icon message-box-pike"></i> \
					</div> \
				</div></div>';
    }
    /**
     * 判断某一路聊天是否在最近聊天列表中
     */
    function isChatidInContact(chatid) {
    	if(!$('#nearest-contact span[type=personal][data-id='+chatid+']').length && !$('#nearest-contact span[type=group][data-id='+chatid+']').length)
    		return false;
    	return true;
    }
    /**
     * 根据未读消息更新最近联系人列表（传入，touserstr，和数量。如果已有该touserstr则加数量）
     * 如果没有则创建最近联系人并加数量
     */
    function loadUnreadMsgFun(chatid, msgNum) {
		if(!isChatidInContact(chatid)){
			loadNearestContactFunc(chatid);
		}
		
		var itemType = chatid.indexOf('--') > -1 ? 'personal' : 'group';
    	var chatItem = $('#nearest-contact span[type='+itemType+'][data-id='+chatid+']');
    	
    	if(msgNum === 0) {
    		chatItem.find('b').remove();return;
    	}
    	
    	if(chatItem.find('b').length){
			unreadNum = chatItem.find('b').html();
			chatItem.find('b').html(parseInt(unreadNum)+msgNum);
		}else{
			chatItem.append('<b class="unread">'+msgNum+'</b>');
		}
    }
    //组装本地历史消息数组
    function makeHistoryList(fromuser, chatid, message, time){
        //俩通信客户端的唯一历史记录
        var chatSomeoneHistory = 'chat'+chatid+'History';
        var nowMessage = {};
        nowMessage.fromuser = fromuser;
        nowMessage.chatid = chatid;
        nowMessage.message = message;
        nowMessage.time = time;
        if(window[chatSomeoneHistory] == undefined){
            //此时应该从redis中取出最新的数据，防止用户点击标红信息的时候只有一条
        	wc_ws.send(JSON.stringify({"type":"history","chatid":chatid}));
        }

        //等待redis中数据
        var i = 0;
        var waitHistory = function(){
                i++;
            	if(window["chat"+chatid+"History"] != undefined){
            		window[chatSomeoneHistory].push(nowMessage);
            		clearInterval(waitTime);
                }
        	    if(i>50)
        	    	clearInterval(waitTime);
            };
    	var waitTime = setInterval(waitHistory, 10);
        
    }
    //给出一个在线或者上线用户组，使用户列表和最近联系人中头像点亮
    function lightOnlineUserList(users) {
    	if(!users) return false;
    	for(var i in users) {
    		var tmpchatid = makeChatIdFromGf(users[i]);
			$("#organization-structure .no-child[data-id='"+tmpchatid+"']").each(function(){
				$(this).removeClass('no-login').moveTreeTop($(this).parent());
			})
    		//联系人列表在线处理
    		/*userItemObjInUserList = $("#organization-structure .no-child[data-id='"+tmpchatid+"']");
    		userItemObjInUserList.removeClass('no-login');
    		userItemObjInUserList.moveTreeTop(userItemObjInUserList.parent());*/
    		//最近联系人在线处理
    		nearestContactList = $("#nearest-contact .no-child[data-id='"+tmpchatid+"']");
    		nearestContactList.removeClass('no-login');
    		$.each(nearestContactList,function(key,item){
    			$(item).moveTreeTop($(item).parent());
    		});
    	}
    }
    //给出一个下线用户组，使用户列表和最近联系人中头像变灰
    function lightOfflineUserList(users) {
    	if(!users) return false;
    	for(var i in users) {
    		var tmpchatid = makeChatIdFromGf(users[i]);
    		//联系人列表处理
    		userItemObjInUserList = $("#organization-structure .no-child[data-id='"+tmpchatid+"']").addClass('no-login');;
    		//userItemObjInUserList.parent().append(userItemObjInUserList);
    		
    		//最近联系人处理
    		$("#nearest-contact .no-child[data-id='"+tmpchatid+"']").addClass('no-login');
    	}
    }
    //获取当前聊天人员 a,b,c
    function getNowChatId() {
    	return $('.contact-msg').attr('chatid');
    }
    //给出一路对话，更新到最近联系人列表
    function loadNearestContactFunc(chatid) {
    	//单用户聊天
    	var treeData = {};
    		treeData.member = [];
		if(chatid.indexOf('--') > -1) {
			var contactArr = chatid.split('--');
			for(var q in contactArr) {
				if(contactArr[q] === wc_loginName) continue;
			    treeData.title = wc_allUserArr[contactArr[q]];
			    treeData.member.push({
			    	'username':wc_allUserArr[contactArr[q]],
			    	'avatar':'default_34_34.jpg',
			    	'attr':{'data-id':chatid,'type':'member'}
			    });
			    //var loginClass = getUserStatus(chatid) ? 'no-login' : '';
			    treeData.attr = {'data-id':chatid,'type':'personal','class':'no-login'};
			    $('.recent').children('.tree-folders').addTree(treeData);
			}
			
		//群用户聊天
		} else if (chatid.indexOf('-') > -1) {
			var groupInfo = getUserListFromChatid(chatid);
		    treeData.title = groupInfo.info.title;
		    for(var r in groupInfo.members) {
				var tempidstr = makeChatIdFromGf(groupInfo.members[r]);
				treeData.member.push({
			    	'username':wc_allUserArr[groupInfo.members[r]],
			    	'avatar':'default_34_34.jpg',
			    	'attr':{'data-id':tempidstr,'type':'member','class':'no-login'}
			    });
			}
		    treeData.attr = {'data-id':chatid,'type':'group'};
		    $('.recent').children('.tree-folders').addTree(treeData);
		}
    	return;
    }
    //递归更新所有用户列表
    function flushAllListFunc(parentObj, allList){
    	var innerStr = '';
    	var isFolder = false;
    	for(var p in allList) {
    		if(typeof(allList[p]) === 'object') {
    			isFolder = true;
    			innerStr += '<span>'+p+'</span>';
    			
    			var filesObj = document.createElement('div');
    				filesObj.className = "tree-files";
    			var filesObj = $(filesObj);
    			//递归调用
    			filesObj = flushAllListFunc(filesObj, allList[p]);
    			parentObj.append(filesObj);
    		} else {
    			wc_allUserArr[p] = allList[p];
    			var tempchatid = makeChatIdFromGf(p);
    			innerStr = '<span class="no-child no-login" type="member" data-id="'+tempchatid+'"><img class="avatar" src="./default_34_34.jpg" width="22px">'+allList[p]+'</span>'+innerStr;
    		}
    	}
    	if(false === isFolder) {
    		parentObj.append(innerStr);
    	} else {
    		parentObj.prepend('<div class="tree-folders">'+innerStr+'</div>');
    	}
    	return parentObj;
    }
    //前端获取用户在线状态
    function getUserStatus(chatid){
    	return $("#organization-structure .no-child[data-id='"+chatid+"']").hasClass('no-login');
    }
    //js 将php时间戳转为时间
    function timestampTodate(timestamp) {
    	var d = new Date(parseInt(timestamp) * 1000);
    	return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()+' '+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();
    }
    //根据聊天对象生成单人聊天chatid
    function makeChatIdFromGf (touserid) {
    	if(!wc_loginName) return false;
    	var tomakechatid = [];
			tomakechatid.push(touserid);
			tomakechatid.push(wc_loginName);
			tomakechatid.sort();
		return tomakechatid.join('--');
    }
