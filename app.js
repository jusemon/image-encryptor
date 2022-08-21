let url;
let colors;
let pxls;
let width = 16;
let height = 16;
let tile;
let tileCtx;
let pixels;
let px;
let slf = this;
var external = null;

window.onpopstate = (event) => {
	colors = null;
	app.style.display = "block";
	output.style.display = "none";
	result.style.display = "none";
	rescol.style.display = "none";
	resenc.style.display = "none";
	//document.getElementById("size").style.display = "none";
	defaultWarning();

	const lastState = event.state && colorsText.innerHTML == event.state.split("colors=")[1];
	init(lastState ? false : {});
	loadedImageContainer.style.display = lastState ? "block" : "none";
}

function load(event) {
	imageEncryptor.addEventListener("dragover", handleDragOver, false);
	imageEncryptor.addEventListener("drop", handleFileSelect, false);
	init(event);
}

function init(postLoad) {
	url = new URL(window.location.href);
	colors = url.searchParams.get("colors");
	pxls = url.searchParams.get("pixels");
	width = parseInt(url.searchParams.get("width"));
	height = parseInt(url.searchParams.get("height"));

	if (colors || postLoad === false) {
		output.style.display = "block";
		result.style.display = "inline-table";
		rescol.style.display = "inline-table";
		resenc.style.display = "inline-table";

		if (colors.length > 48) {
			colors = colors.substr(0, 48);
			encryptImage("⛔️ There are more than 8 colors in this image!");
			document.getElementById("size").style.backgroundColor = "#daa";
			document.getElementById("size").style.borderColor = "#e88";
		} else if (pxls.length > 4096 || !pxls.length) {
			pxls = pxls.substr(0, 4096);
			encryptImage("⛔️ The image is too large! Total pixels limit is 4096 (64x64 image)");
			document.getElementById("size").style.backgroundColor = "#daa";
			document.getElementById("size").style.borderColor = "#e88";
		} else {
			document.getElementById("size").style.backgroundColor = "#ada";
			document.getElementById("size").style.borderColor = "#9c9";
			encryptImage(postLoad);
		}
	} else {
		app.style.display = "block";
		output.style.display = "none";
		result.style.display = "none";
		rescol.style.display = "none";
		resenc.style.display = "none";
	}

	if (external) external();
}

function closeFooterClick(event) {
	topper.style.display = "none";
	app.style.float = "none";
	app.style.width = "100%";
	app.style.maxWidth = "calc(100% - 32px)";
	if (external) external();
}

function resetClick(event) {
	window.history.pushState('', '',  url.origin + url.pathname);
	defaultWarning();
	init();
}

function defaultWarning() {
	document.getElementById("size").style.backgroundColor = "#ccc";
	document.getElementById("size").style.borderColor = "#ccc";
	document.getElementById("size").style.color = "#555";
	document.getElementById("size").innerHTML = "Image limitations: 8 colors + tranparency, 4096 total pixels max (64x64).";
}

function buildRgb(imageData) {
	const rgbValues = [];
	for (let i = 0; i < imageData.length; i += 4) {
		let red = imageData[i].toString(16);
		if (red.length == 1) red = '0' + red;
		let green = imageData[i + 1].toString(16);
		if (green.length == 1) green = '0' + green;
		let blue = imageData[i + 2].toString(16);
		if (blue.length == 1) blue = '0' + blue;
		let alpha = imageData[i + 3];
		let alphaHex = imageData[i + 3].toString(16);
		if (alphaHex.length == 1) alphaHex = '0' + alphaHex;
		rgbValues.push({
			color: red + green + blue + alphaHex,
			red: imageData[i],
			green: imageData[i+1],
			blue: imageData[i+2],
			alpha: imageData[i+3] / 255
		});
	}
	return rgbValues;
};

function createFileReader() {
	const fileReader = new FileReader();
	fileReader.onload = function (event) {
		const img = document.getElementById('loadedImage');
		img.src = fileReader.result;
		img.onload = () => {
			loadedImageContainer.style.display = "block";
			const imgWidth = document.getElementById('imageWidth');
			imgWidth.innerHTML = img.width;
			const imgHeight = document.getElementById('imageHeight');
			imgHeight.innerHTML = img.height;

			const canvas = document.getElementById("canvas");
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext("2d");
			ctx.drawImage(img, 0, 0);

			const scale = canvas.width>64||canvas.height>64?2:canvas.width>48||canvas.height>48?3:canvas.width>32||canvas.height>32?4:canvas.width>16||canvas.height>16?5:6;
			loadedImageFrame.style.width = img.width * scale + "px";
			loadedImageFrame.style.height = img.height * scale + "px";

			let pixelsData = [];
			let colorsTxt = '';
			const imgColors = document.getElementById('imageColors');
			if (canvas.width * canvas.height < 4096) {
				loadedImageFrame.style.display = "inline-block";
				img.style.display = "inline-block";
				img.style.transform = `scale(${scale})`;
				img.style.transformOrigin = `0% ${canvas.height < 16 ? [100,90,80,73,50,36,27,20,15,11,8,5,3,1,0,0][canvas.height] : 0}%`;
				tileContainer.style.display = "block";
				colorPalette.style.display = "block";

				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				const colorsArray = buildRgb(imageData.data);
				differentColors = [...new Map(colorsArray.map(item => [item["color"], item])).values()];

				const colorsData = document.getElementById('colorsData');
				while (colorsData.lastElementChild) {
					colorsData.removeChild(colorsData.lastElementChild);
				}

				let dummyColor = -1;
				differentColors.forEach((colorObject, index) => {
					if (colorObject.alpha) {
						if (index < 9) {
							addColorBox(colorsData, colorObject);
						}
					} else {
						dummyColor = index;
					}

					colorsTxt += colorObject.color.substr(0,6) + (colorObject.color.substr(6,2) == "ff" ? "XX" : "__");
				});

				imgColors.innerHTML = ", Colors: ";
				imgColors.innerHTML += dummyColor > -1 && differentColors.length < 10 ? (differentColors.length - 1) + ` (+1 transparent${differentColors.length<9?'':', optimal'})` :
					(differentColors.length > 8) ? `${differentColors.length} ⚠ ${differentColors.length-8} color${differentColors.length-8>1?'s':''} overhead!` : differentColors.length;

				if (dummyColor > -1) {
					colorsData.innerHTML += "<span style='line-height:44px'> + </span>";
					addColorBox(colorsData, {red: 0, green: 0, blue: 0, alpha: 0});
				}

				for (let i = 0; i < imageData.data.length; i += 4) {
					let red = imageData.data[i].toString(16); if (red.length == 1) red = "0" + red;
					let green = imageData.data[i+1].toString(16); if (green.length == 1) green = "0" + green;
					let blue = imageData.data[i+2].toString(16); if (blue.length == 1) blue = "0" + blue;
					let alpha = imageData.data[i+3];
					const colorString = red + green + blue + (alpha ? "XX" : "__");
					pixelsData.push(colorsTxt.indexOf(colorString) / 8);
				}

				colorsTxt = '';
				differentColors.forEach((colorObject, index) => {
					colorsTxt += colorObject.color.substr(0, 6);
				});

				if (dummyColor > -1) {
					colorsTxt = colorsTxt.substr(0, dummyColor * 6) + colorsTxt.substr(dummyColor * 6 + 6);
					pixelsData.forEach((color, index) => {
						if (color < dummyColor) pixelsData[index] = color + 1;
						else if (color == dummyColor) pixelsData[index] = 0;
						else pixelsData[index] = color;
					});
				}
				else pixelsData.forEach((color, index) => pixelsData[index] = color + 1);

				colorsText.innerHTML = colorsTxt.length > 48 ? colorsTxt.substr(0,48) + "…" + colorsTxt.substr(48) : colorsTxt;
			} else {
				loadedImageFrame.style.display = "none";
				img.style.display = "none";
				tileContainer.style.display = "none";
				colorPalette.style.display = "none";
				imgColors.innerHTML = ` ⚠ ${canvas.width * canvas.height - 4096} pixels overhead!`;
			}

			let URL = url.origin + url.pathname;
			let PARAMS = "?pixels=";
			PARAMS += pixelsData.join('');
			PARAMS += "&width=" + img.width;
			PARAMS += "&height=" + img.height;
			PARAMS += "&colors=" + colorsTxt;
			window.history.pushState(PARAMS, '', URL + PARAMS);

			init(colorsTxt != "");
		};
	}
	return fileReader;
}

function onOpen(event) {
	const fileReader = createFileReader();
	fileReader.readAsDataURL(event.target.files[0]);
}

function handleDragOver(event) {
	event.stopPropagation();
	event.preventDefault();
	event.dataTransfer.dropEffect = "copy";
}

function handleFileSelect(event) {
	event.stopPropagation();
	event.preventDefault();
	const fileReader = createFileReader();
	fileReader.readAsDataURL(event.dataTransfer.files[0]);
}

function addColorBox(colorsData, colorObject) {
	const colorFrame = document.createElement('div');
	colorFrame.style.width = "32px";
	colorFrame.style.height = "32px";
	colorFrame.style.margin = "5px";
	colorFrame.style.border = "1px solid black";
	colorFrame.style.backgroundColor = `rgba(${colorObject.red},${colorObject.green},${colorObject.blue},${colorObject.alpha})`;
	if (!colorObject.alpha) {
		addTransparency(colorFrame);
	}
	colorsData.appendChild(colorFrame);
}

// Imitate transparency in a color box
function addTransparency(colorFrame) {
	addTransparentBox(colorFrame);
	addTransparentBox(colorFrame, 16, -8);
	addTransparentBox(colorFrame, 8);
	addTransparentBox(colorFrame, 24, -8);
	addTransparentBox(colorFrame);
	addTransparentBox(colorFrame, 16, -8);
	addTransparentBox(colorFrame, 8);
	addTransparentBox(colorFrame, 24, -8);
}
function addTransparentBox(colorFrame, offsetX = 0, offsetY = 0) {
	const transparentFrame = document.createElement('div');
	transparentFrame.style.width = "8px";
	transparentFrame.style.height = "8px";
	transparentFrame.style.marginLeft = offsetX + "px";
	transparentFrame.style.marginTop = offsetY + "px";
	transparentFrame.style.backgroundColor = `#fff`;
	colorFrame.appendChild(transparentFrame);
}

// Color-picker handler
function pickerChange(id) {
	const color = document.getElementById("c" + (id + 1)).value.substr(1);
	colors = colors.substr(0, id*6) + color + colors.substr(id*6 + 6);
	encryptImage(true);
}

// Image to string encryption
function encryptImage(warning) {
	tile = document.getElementById("tile");
	tileCtx = tile.getContext("2d");
	pixels = [];
	px = [];
	const loadedFromMemory = "<div>⚠️ The below encrypted image was loaded from history.</div>";
	if (typeof warning == "object") {
		warning = loadedFromMemory;
		document.getElementById("size").style.backgroundColor = "#ec8";
		document.getElementById("size").style.borderColor = "#eb6";
	}
	document.getElementById("size").innerHTML = warning && warning != true ? warning : "<div>✅	Image encryption successful!</div>";
	document.getElementById("size").style.display = "block";
	document.getElementById("size").style.color = "#000";

	for(let j = 0; j < pxls.length; j++){
		px.push(pxls.substr(j,1));
	}
	document.getElementById("output").style.display = "block";
	for(j = 0; j < 48; j+=6){
		let i = (parseInt(j/6)+1);
		if (j < colors.length && i) {
			document.getElementById("ct"+i).style.display = "block";
			document.getElementById("c"+i).style.display = "block";
			document.getElementById("ct"+i).innerHTML = (j<colors.length) ? "#"+colors.substr(j,6) : i ? "transparent" : "#FFFFFF";
			document.getElementById("c"+i).value = (j<colors.length) ? "#"+colors.substr(j,6) : i ? "transparent" : "#FFFFFF";
			//document.getElementById("c"+i).style.backgroundColor = (j<colors.length) ? "#"+colors.substr(j,6) : i ? "transparent" : "#FFFFFF";
		} else {
			document.getElementById("ct"+i).style.display = "none";
			document.getElementById("c"+i).style.display = "none";
		}
	}
	encrypt(warning === true || warning == loadedFromMemory);
}

function encrypt(_successful) {
	pxl = px;
	let tm = []
	for(let i = 0; i < height; i++){
		tm = [];
		for(let j = 0; j < width; j++){
			tm.push(parseInt(pxl[i*width+j]));
		}
		pixels.push(tm);
	}
	prepare(width, height);
	draw();
	if (_successful) exportData();
	else {
		exp.value = "Image encryption unsuccessful! Please pick a suitable image.";
		col.value = "";
		enc.value = "";
		jsfiddle.style.display = "none";
	}
}

// Prepare tile frame
function prepare(width, height) {
	if (width * height > 4096) return;
	let tileSize = width > 48 ? 8 : width > 32 ? 9 : 10;
	tile.width = width * tileSize;
	tile.height = height * tileSize;
}

// Reset
function reset() {
	pixels = [];
	prepare(width, height);
	for(i = 0; i < height; i++){
		pixels.push([]);
	}
}

// Draw
function draw() {
	tileCtx.fillStyle = "#aaa";
	let tileSize = width > 48 ? 8 : width > 32 ? 9 : 10;
	for(i = 0; i < height; i++){
		tileCtx.fillRect(0, i * tileSize, width * tileSize, 1);
	}
	for(i = 0; i < width; i++){
		tileCtx.fillRect(i * tileSize, 0, 1, height * tileSize);
	}
	for(j = 0; j < height; j++){
		for(i = 0; i < width; i++){
			colorindex = pixels[j][i];

			if(colorindex == 1) { ccolor = ct1.innerHTML; }
			else if(colorindex == 2){ ccolor = ct2.innerHTML; }
			else if(colorindex == 3){ ccolor = ct3.innerHTML; }
			else if(colorindex == 4){ ccolor = ct4.innerHTML; }
			else if(colorindex == 5){ ccolor = ct5.innerHTML; }
			else if(colorindex == 6){ ccolor = ct6.innerHTML; }
			else if(colorindex == 7){ ccolor = ct7.innerHTML; }
			else if(colorindex == 8){ ccolor = ct8.innerHTML; }
			else { ccolor = "transparent" };

			tileCtx.fillStyle = ccolor;
			tileCtx.fillRect(i * tileSize, j * tileSize, tileSize, tileSize);
		}
	}
}

// Export
function exportData() {
	colors = "";
	for(i = 1; i < 9; i++){
		colors += (slf["ct"+i].innerHTML != "transparent") ? slf["ct"+i].innerHTML.replace("#","") : "";
	}
	px = [];
	pxascii = "";
	for(j=0;j<height;j++){
		for(i=0;i<width;i++){
			px.push(pixels[j][i]);
		}
	}
	let char;
	for(i = 0; i < px.length; i+=2){
		char = String.fromCharCode(0b1000000 + (px[i] || 0) + ((px[i+1] || 0) << 3));
		pxascii += (char=="`"||char=="\\"?"\\":"")+String.fromCharCode(0b1000000 + (px[i] || 0) + ((px[i+1] || 0) << 3));
	}
	col.value = `${colors}`
	enc.value = `${pxascii}`
exp.value =
`<canvas id=a>
<script>
c=a.getContext\`2d\`
C="${colors}"
px=[]
P="${pxascii}".replace(/./g,a=>{
	z=a.charCodeAt()
	px.push(z&7)
	px.push((z>>3)&7)
})
W=${width}
H=${height}
for(j=0;j<H;j++){
	for(i=0;i<W;i++){
		if(px[j*W+i]){
			c.fillStyle="#"+C.substr(6*(px[j*W+i]-1),6)
			c.fillRect(i,j,1,1)
		}
	}
}
<\/script>`
	enc.focus();
	enc.select();
	jsfiddle.style.display = "block";

	imageBytes.innerHTML = (new TextEncoder().encode(enc.value)).length;
	paletteBytes.innerHTML = (new TextEncoder().encode(col.value)).length;
}

// JS Fiddle integration
function fiddleClick(event) {
	//event.preventDefault();
	const l = exp.value.split("<script>")[1].split("</script>")[0];
	const n = "<canvas id=a>";
	const k = "/*\r  Start of generated encrypted image snippet\r*/\r\r" + l + "\r/*\r  End of generated encrypted image snippet\r*/";
	const o = "/*\r  Image Encryptor 2.0 - by Noncho Savov (www.FoumartGames.com)\r*/\r\r/* Note: the following CSS is only for the preview purposes */\r#a {\r  transform: scale(5);\r  transform-origin: 0% 0%;\r  image-rendering: pixelated;\r  image-rendering: -moz-crisp-edges;\r  image-rendering: crisp-edges;\r}";
	post("https://jsfiddle.net/api/post/library/pure/", {
		html: n,
		css: o,
		js: k
	})
}
function post(k, j, i) {
	i = i || "post";
	const l = document.createElement("form");
	l.setAttribute("method", i);
	l.setAttribute("target", "_blank");
	l.setAttribute("action", k);
	for (let g in j) {
		if (j.hasOwnProperty(g)) {
			const h = document.createElement("input");
			h.setAttribute("type", "hidden");
			h.setAttribute("name", g);
			h.setAttribute("value", j[g]);
			l.appendChild(h)
		}
	}
	document.body.appendChild(l);
	l.submit()
}
