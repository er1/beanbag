(function (window, document) {
	"use strict";

	var innerWidth;
	var innerHeight;
	var devicePixelRatio;
	var gl;

	function lerp(a, b, f) {
		return (b - a) * f + a;
	}

	function randfrange(a, b) {
		return lerp(a, b, Math.random());
	} 

	function flip() {
		return Math.random() < 0.5;
	}

	var NUM_BEANS = 40;
	var MIN_SCALE = 0.2;
	var MAX_SCALE = 1.0;
	var MAX_RADIUS = 576 * MAX_SCALE;

	var BEANS = [
		[4, "redbean0x.png"],
		[2, "redbean1x.png"],
		[2, "redbean2x.png"],
		[1, "redbeandroidx.png"],
	];

	var COLORS = [
		[0.0,0.8,0.0],
		[0.8,0.0,0.0],
		[0.0,0.0,0.8],
		[1.0,1.0,0.0],
		[1.0,0.5,0.0],
		[0.0,0.8,1.0],
		[1.0,0.0,0.5],
		[0.5,0.0,1.0],
		[1.0,0.5,0.5],
		[0.5,0.5,1.0],
		[11/16,3/4,13/16],
		[13/15,13/15,13/15],
		[0.2,0.2,0.2],
	];

	var colorbeans = [];

	var beans = [];
	var mPreviousTime;
	var ptr;

	window.onload = function () {
		var canv = document.getElementById("c");
		gl = canv.getContext("webgl");

		var vertexShaderSource = document.getElementById("shader-vs").textContent;
		var fragmentShaderSource = document.getElementById("shader-fs").textContent;

		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, vertexShaderSource);
		gl.compileShader(vertexShader);

		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, fragmentShaderSource);
		gl.compileShader(fragmentShader);

		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
			return alert(gl.getShaderInfoLog(vertexShader));
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
			return alert(gl.getShaderInfoLog(fragmentShader));

		var shaderProgram = gl.createProgram();
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);

		gl.linkProgram(shaderProgram);
		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
			return alert("Could not initialise shaders");
		gl.useProgram(shaderProgram);

		ptr = {
			uColor: gl.getUniformLocation(shaderProgram, "uColor"),
			uTexture: gl.getUniformLocation(shaderProgram, "uTexture"),
			uTransform: gl.getUniformLocation(shaderProgram, "uTransform"),
			uViewport: gl.getUniformLocation(shaderProgram, "uViewport"),
			aTexCoord: gl.getAttribLocation(shaderProgram, "aTexCoord"),
			bTexCoord: gl.createBuffer(),
		};

		gl.enableVertexAttribArray(ptr.aTexCoord);
		gl.vertexAttribPointer(ptr.aTexCoord, 2, gl.FLOAT, false, 0, 0);

		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);

		gl.activeTexture(gl.TEXTURE0);
		gl.uniform1i(ptr.uTexture, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, ptr.bTexCoord);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);

		transformbean(0);
	};

	function resize() {
		innerWidth = window.innerWidth;
		innerHeight = window.innerHeight;

		devicePixelRatio = window.devicePixelRatio;

		var canv = document.getElementById("c");
		canv.width = Math.round(innerWidth * devicePixelRatio);
		canv.height = Math.round(innerHeight * devicePixelRatio);

		canv.style.width = canv.width / devicePixelRatio + "px";
		canv.style.height = canv.height / devicePixelRatio + "px";

		gl.viewport(0, 0, canv.width, canv.height);
		gl.uniform2fv(ptr.uViewport, new Float32Array([innerWidth, innerHeight]));

	}

	window.onresize = resize;

	function transformbean(i) {
		if (!BEANS[i]) {
			return startbeans();
		}

		var bean_img = new Image();
		var bean_count = BEANS[i][0];
		var bean_src = BEANS[i][1];

		bean_img.onload = function () {
			var tex = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bean_img); 
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.bindTexture(gl.TEXTURE_2D, null);

			for (var c = 0; c < COLORS.length; c++) {
				var color = new Float32Array(COLORS[c]);
				var j = bean_count;
				while (j --> 0) {
					colorbeans.push([tex, color]);
				}
			}
			transformbean(i + 1);
		};
		bean_img.src = bean_src;
	}

	function startbeans() {
		resize();

		var i;

		MAX_SCALE = Math.min(MAX_SCALE, Math.min(innerWidth, innerHeight) / 256 / 4);

		function pickBean() {
			return colorbeans[Math.floor(Math.random() * colorbeans.length)];
		}

		for (i = 0; i < NUM_BEANS; i++) {
			var nv = Bean();
			var z = i / NUM_BEANS;

			beans[i] = nv;

			nv.picker(pickBean);

			nv.init(z);
		}

		mPreviousTime = performance && performance.now() || new Date().getTime();

		var animate = function(loopfunc) {
			setInterval(loopfunc, 50);
		};

		if (window.requestAnimationFrame) {
			animate = function (loopfunc) {
				function loop() {
					loopfunc();
					requestAnimationFrame(loop);
				}
				loop();
			};
		}

		animate(function () {
			var i;
			var currentTime = performance && performance.now() || new Date().getTime();
			var deltaTime = currentTime - mPreviousTime;
			mPreviousTime = currentTime;

			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			for (i = 0; i < beans.length; i++) {
				var nv = beans[i];
				nv.update(deltaTime / 1000.0);
				var render = nv.render();
				var transform = render[0];
				var texh = render[1];

				gl.bindTexture(gl.TEXTURE_2D, texh[0]);
				gl.uniform3fv(ptr.uColor, texh[1]);
				gl.uniform4fv(ptr.uTransform, transform);

				gl.vertexAttribPointer(ptr.aTexCoord, 2, gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ARRAY_BUFFER, ptr.bTexCoord);
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			}

			gl.flush();
		});

		var touchtargets = {};

		document.body.addEventListener("touchstart", function (e) {
			// var did_something = false;
			var bean;
			var i, j;
			for (j = 0; j < e.targetTouches.length; j++) {
				var touch = e.targetTouches[j];
				for (i = beans.length; i --> 0; ) {
					bean = beans[i];
					if (bean.at(touch.pageX, touch.pageY)) {
						bean.start(touch.pageX, touch.pageY);
						touchtargets[touch.identifier] = bean;
						// did_something = true;
						i = 0;
					}
				}
			}
			// if (did_something) {
			e.preventDefault();
			// }
		}, false);

		document.body.addEventListener("touchend", function (e) {
			// var did_something = false;
			var j;
			for (j = 0; j < e.changedTouches.length; j++) {
				var bean = touchtargets[e.changedTouches[j].identifier];
				if (bean) {
					bean.end();
					// did_something = true;
				}
			}
			// if (did_something) {
			e.preventDefault();
			// }
		}, false);

		document.body.addEventListener("touchcancel", function (e) {
			// var did_something = false;
			var j;
			for (j = 0; j < e.changedTouches.length; j++) {
				var bean = touchtargets[e.changedTouches[j].identifier];
				if (bean) {
					bean.end();
					// did_something = true;
				}
			}
			// if (did_something) {
			e.preventDefault();
			// }
		}, false);

		document.body.addEventListener("touchmove", function (e) {
			// var did_something = false;
			var j;
			for (j = 0; j < e.changedTouches.length; j++) {
				var touch = e.changedTouches[j];
				var bean = touchtargets[touch.identifier];
				if (bean) {
					bean.move(touch.pageX, touch.pageY);
					// did_something = true;
				}
			}
			// if (did_something) {
			e.preventDefault();
			// }
		}, false);
	}

	var Bean = function () {
		var grabx_offset = 0.0, graby_offset = 0.0;

		var x = 0.0, y = 0.0, a = 0.0;
		var va = 0.0;
		var vx = 0.0, vy = 0.0;
		var r = 0.0;
		var z = 0.0;
		var h = 256, w = 256;
		var grabbed = false;
		var grabx = 0.0, graby = 0.0;

		var scale = 1.0;
		var texh;

		var pickBean = function () {};

		function reset() {
			texh = pickBean();

			scale = lerp(MIN_SCALE, MAX_SCALE, z);

			r = 0.3 * Math.max(h, w) * scale;

			a = randfrange(0, 360);
			va = randfrange(-30, 30);

			vx = randfrange(-40, 40) * z;
			vy = randfrange(-40, 40) * z;

			var boardh = innerHeight;
			var boardw = innerWidth;

			if (flip()) {
				x = (vx < 0 ? boardw + 2 * r : -r * 4);
				y = (randfrange(0, boardh - 3 * r) * 0.5 + ((vy < 0) ? boardh * 0.5 : 0));
			} else {
				y = (vy < 0 ? boardh + 2 * r : -r * 4);
				x = (randfrange(0, boardw - 3 * r) * 0.5 + ((vx < 0) ? boardw * 0.5 : 0));
			}
		}

		function init(_z) {
			z = _z;
			z *= z;
			reset();
			x = randfrange(0, innerWidth);
			y = randfrange(0, innerHeight);
		}

		function update(dt) {
			if (grabbed) {
				vx = (vx * 0.75) + ((grabx - x) / dt) * 0.25;
				x = grabx;
				vy = (vy * 0.75) + ((graby - y) / dt) * 0.25;
				y = graby;
			} else {
				x = (x + vx * dt);
				y = (y + vy * dt);
				a = (a + va * dt);
			}

			var boardh = innerHeight;
			var boardw = innerWidth;

			if (x < -MAX_RADIUS || x > boardw + MAX_RADIUS || y < -MAX_RADIUS || y > boardh + MAX_RADIUS) {
				reset();
			}
		}

		function picker(f) {
			pickBean = f;
		}

		function at(_x, _y) {
			var sz = scale * w * 0.5;
			var dx = x - _x;
			var dy = y - _y;
			return dx * dx + dy * dy <= sz * sz;
		}

		function render() {
			return [
				new Float32Array([
					x,
					y,
					scale,
					a * Math.PI / 180,
				]),
				texh,
			];
		}

		function start(_x, _y) {
			grabbed = true;
			grabx_offset = _x - x;
			graby_offset = _y - y;
			va = 0.0;
			move(_x, _y);
		}

		function move(_x, _y) {
			grabx = _x - grabx_offset;
			graby = _y - graby_offset;
		}

		function end() {
			grabbed = false;
			va = (flip()?1:-1) * Math.min(Math.max(Math.sqrt(vx * vx + vy * vy) * 0.33, 0), 1080.0) * randfrange(0.5, 1.0);
		}

		return { init: init, render: render, update: update, picker: picker, at: at,
			start: start, move: move, end: end};
	};

	var movetarget = null;
	window.addEventListener("mousedown", function (e) {
		var bean;
		var i;
		for (i = beans.length; i --> 0; ) {
			bean = beans[i];
			if (bean.at(e.pageX, e.pageY)) {
				bean.start(e.pageX, e.pageY);
				movetarget = bean;
				e.preventDefault();
				return;
			}
		}
	}, false);
	window.addEventListener("mousemove", function (e) {
		if (movetarget) {
			movetarget.move(e.pageX, e.pageY);
		}
		e.preventDefault();
	}, false);
	window.addEventListener("mouseup", function (e) {
		if (movetarget) {
			movetarget.end();
			movetarget = null;
		}
		e.preventDefault();
	}, false);
}(window, document));
