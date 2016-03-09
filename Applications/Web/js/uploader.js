(function($){
	//图片预览、拖拽、黏贴、多线程、分片、压缩
	uploader = {
		opts : {
			//是否允许放大
			allowMagnify: true,
			//是否裁剪
			crop: true,
			//是否保留头部信息
			preserveHeaders: false,
			//默认图片质量
			quality:90
		},
		BLANK : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D',
		loadFromBlob : function() {
			var urlAPI = window.createObjectURL && window ||
                window.URL && URL.revokeObjectURL && URL ||
                window.webkitURL,
        	createObjectURL = function(){};
			if(urlAPI) {
				return urlAPI.createObjectURL.apply(urlAPI, arguments);
			}
			return null;
		},
		getAsDataUrl : function(canvas, type) {
			if(type == 'image/jpeg') {
				return canvas.toDataURL(type, this.opts.quality/100);
			}else{
				return canvas.toDataURL(type);
			}
		},
		destory : function(canvas, img) {
				img.onload = null;

				if(canvas) {
					canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
					canvas.width = canvas.height = 0;
					canvas = null;
				}
				img.src = this.BLANK;
				img = null;
		},
		thumb : function(file, callback, param){
				//只预览图片类型
				if(!file.type.match(/^image\//)) {
					callback(true);
					return false;
				}
				this.opts = $.extend(this.opts, param);
				var img = new Image();
				var canvas = $('<canvas/>');
				var cxt = canvas[0].getContext('2d');
				img.onload = function() {
					canvas.attr({'width':uploader.opts.width, 'height':uploader.opts.height});
					var width  = uploader.opts.width;
					var height = uploader.opts.height;
					if(uploader.opts.width/img.width > uploader.opts.height/img.height)
						height = uploader.opts.width/img.width*img.height;
					else
						width = uploader.opts.height/img.height*img.width;
					cxt.drawImage(img, width > uploader.opts.width ? (img.width-uploader.opts.width*img.height/uploader.opts.height)/2 : 0, height > uploader.opts.height ? (img.height-uploader.opts.height*img.width/uploader.opts.width)/2 : 0, img.width, img.height, 0, 0, width, height);
					callback(false, uploader.getAsDataUrl(canvas[0], uploader.opts.type));
					uploader.destory(canvas[0], img);
				};
				img.src = this.loadFromBlob(file);
		},
		drop : function(obj, callback, param) {
			//防止拖动打开图片
			obj.ondragover = function () { return false; };
			obj.ondrop = function (e) {
            	e.stopPropagation();
            	e.preventDefault(); 
            	e = e || window.event;
            	var files = e.dataTransfer.files;
            	if(files){
            	    uploader.thumb(files[0], callback, param);
            	}
        	};
		},
		paste : function(obj, callback, param) {
			obj.onpaste = function(e){
				e.preventDefault();
				if(e.clipboardData&&e.clipboardData.items){
					for(var i=0, items = e.clipboardData.items;i<items.length;i++){
						if( items[i].kind==='file' && items[i].type.match(/^image/) ){
							uploader.thumb(items[i].getAsFile(), callback, param);
							break;
						}
					}
				}
				return false;
			};
		}
	}
})(jQuery)
