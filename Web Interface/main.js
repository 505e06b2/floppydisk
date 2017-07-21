var width = 0;
var height = 0;
var img = {};
var floppy = {};

var canvas = {};
var ctx = {};

var labelspecs = {
	"width": 1287,
	"height": 984,
	"x": 355,
	"y": 1016
};

var label = document.createElement('canvas');
label.width = labelspecs.width; label.height = labelspecs.height; label.lastText = "";
var labelcontext = label.getContext('2d');
labelcontext.fontSize = 150; labelcontext.textAlign = "center"; labelcontext.font = labelcontext.fontSize + "px Monospace"; labelcontext.lineSpace = 170;

window.onload = function() {
	canvas = document.getElementById('c');
	ctx = canvas.getContext('2d');
	img = new Image();
	img.onload = function () {
		
		canvas.width = img.width;
		width = img.width;
		
		canvas.height = img.height;
		height = img.height;
		
		ctx.drawImage(img, 0, 0);
	};
	
	img.src = 'floppy.png';
}

function changeText(text) {
	changeData(new TextEncoder("utf-8").encode(text));
}

function loadFile(e) {
	if(!e.files) return;
	if(e.files[0].size > 0x211750) {alert("Too big; max size is 2.2MB");return;}
	var reader = new FileReader();
	reader.onload = function(event) {
		changeData(new Uint8Array(event.target.result), false, e.files[0].name);
	}
	reader.readAsArrayBuffer(e.files[0]);
}

function changeData(uint8, debug, fname) {
	var f = []; //debug the spaces

	var avg = 0;
	var done = false;
	var spacing = false;
	var skippixels = 0;
	var eof = 0;
	ctx.drawImage(img, 0, 0);
	floppy = ctx.getImageData(0,0,width,height);
	for(var i = floppy.data.length-4, a = 0, e = uint8.length; i ; i-=4) {
		if(floppy.data[i] == 0xFF) {
			if(debug) {
				if(!spacing) {
					f.push(i);
					spacing = true; 
					skippixels = 0;
				} else {
					skippixels++;
				}
			}
			continue;
		}
		if(debug && spacing) {f.push(skippixels); spacing = false;}
		if(!done) {
			if(a >= e) {
				done = true
				avg /= e;
				eof = i;
			} else {
				avg += uint8[a];
			}
		}

		for(var b = 0; b < 3; b++) floppy.data[i+b] = ((done) ? avg : uint8[a]);
		a++;
	}
	
	//"Headers" for the file
	//Filesize (stop at index) LITTLE ENDIAN
	var temp = eof & 0x0000FF;
	floppy.data[0] = temp;
	floppy.data[1] = temp;
	floppy.data[2] = temp;
	
	temp = (eof & 0x00FF00) >> 8;
	floppy.data[4] = temp;
	floppy.data[5] = temp;
	floppy.data[6] = temp;
	
	temp = (eof & 0xFF0000) >> 16;
	floppy.data[8] = temp;
	floppy.data[9] = temp;
	floppy.data[10] = temp;
	
	//filename 30
	for(var i = 0; i < 30; i++) {
		temp = fname.charCodeAt(i);
		if(isNaN(temp)) break;
		var index = 12+(i*4);
		for(var b = 0; b < 3; b++) floppy.data[index+b] = temp;
	}
	for(var b = 0; b < 3; b++) floppy.data[12+(i*4)+b] = 0;
	
	ctx.putImageData(floppy, 0, 0);
	changeLabel(label.lastText); //add label back on
	if(debug) debug(f);
}

function saveSpaces(space) {
	space = new Blob(["var SPACES = " + JSON.stringify(space)], {
    	type: 'text/plain'
	}); //reuse var for RAM sake
	saveAs(space, "spaces.js");
}

function changeLabel(text) {
	label.lastText = text;
	
	labelcontext.fillStyle = "white";
	labelcontext.fillRect(0, 0, label.width, label.height);
	if(text === undefined) return;
	labelcontext.fillStyle = "black";
	
	text = text.split("\n");
	for(var i = 0, e = text.length; i != e; i++) {//I just feel that != can be checked with less CPU cycles...
		labelcontext.fillText(text[i],
						  			labelspecs.width / 2,
						  			(((labelcontext.fontSize + labelcontext.lineSpace)*(i+1) + labelspecs.height)/2  ) - ((labelcontext.fontSize + labelcontext.lineSpace)*(e))/4); //height = labelcontext.fontSize*(i+1) ; maxheight = labelspecs.height
	}
	ctx.drawImage(label, labelspecs.x, labelspecs.y);
}

function loadFloppy(e) {
	console.log(e);
	var img = new Image();
	var reader = new FileReader();
	img.onload = function () {
		ctx.drawImage(img, 0, 0);
		readFloppy();
	}
	reader.onload = function(ev) {
		img.crossOrigin="anonymous";
		img.src = ev.target.result;
	}
	reader.readAsDataURL(e.files[0]);
}

function readFloppy() {
	floppy = ctx.getImageData(0,0,width,height);
	var generated = [];
	var fileStop = floppy.data[0] + (floppy.data[4] << 8) + (floppy.data[8] << 16);
	
	var filename = (function() {
		if(floppy.data[12] == 0) return "my.file";
		var temp = [];
		for(var i = 0; i < 30; i++) {
			var num = floppy.data[12+(i*4)];
			if(num == 0) return temp.join("");
			var char = String.fromCharCode(num);
			temp.push(char);
		}
		return temp.join("");
	})();
	
	for(var i = floppy.data.length-4, a = 0; i != fileStop; i-=4) {
		if(i == SPACES[a]) {
			i -= (SPACES[++a])*4;
			a++;
			continue;
		}
		generated.push( floppy.data[i] );
	}
	var dontfuckmeplz = new Uint8Array(generated);
	saveAs( new Blob([dontfuckmeplz], {type: "application/octet-stream"}) , filename);
}
