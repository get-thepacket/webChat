<?php 
    namespace Api\Controler;
    use Api\Model\Mbroadcast;
use Config\St\Storekey;
        class Broadcast extends Abstractex {
        /**
         * 获取用户的广播消息列表
         * 请求参数             是否必须            类型(示例)      说明
         * accountid   true      string        用户账号
         * time        false     string        根据这个时间来向前查询消息记录，默认为当前时间
         * type        true      int           查询方式，0:向前查 1:向后查
         * 
         * 返回值json
         * data.data = 广播消息列表
         */
        public function doList() {
            $accountid = $this->toStr('accountid');
            $time      = $this->toStr('time');
            $type      = $this->toInt('type');
            if(!$time) $time = time();
            if(!$accountid) $this->_error('param error');
            $list = Mbroadcast::getList(array(
                'accountid' => $accountid,
                'time'      => $time,
                'selectType'=> $type,
                'fields'    => array('fromuser','touserTitle', 'title', 'content','time'),
            ));
            if(!$list) $this->_error('暂无数据');
            $this->_success($list);
        }
        /**
         * 用户获取未读广播消息数量
         * 请求参数             是否必须            类型(示例)      说明
         * accountid   true      string        用户账号
         * 
         * 返回值json
         * data.data = num
         */
        public function doUnreadNum() {
            $accountid = $this->toStr('accountid');
            if(!$accountid) $this->_error('param error');
            $num = Mbroadcast::getUnreadBroadcast($accountid);
            $this->_success($num);
        }
        /**
         * 删除用户未读广播消息数量
         * 请求参数             是否必须            类型(示例)      说明
         * accountid   true      string        用户账号
         */
        public function doDelUnreadNum() {
            $accountid = $this->toStr('accountid');
            if(!$accountid) $this->_error('param error');
            Mbroadcast::delUnreadBroadcast($accountid);
            $this->_success('ok');
        }
        
        /**
         * 新增一个离线广播数据
         */
        public function doAddUnreadNum() {
            $accountid = $this->toStr('accountid');
            if(!$accountid) $this->_error('param error');
            Mbroadcast::addUnreadBroadcastNum($accountid, Storekey::UNREAD_BROADCAST);
            $this->_success('ok');
        }
    }
?>