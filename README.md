# 前端实现图片压缩上传

## 前言


现在移动Web页面越来越多，活动页很多都牵涉到图片上传的问题，随着手机像素越来越高，随便一张图片就是很多好多M，要一次上传多张图片的话，第一时间花费太多，第二个就是用户的流量也要耗费不少，而如果实现前端图片压缩则能很好的避开这些问题。


前端图片压缩的主要思路就是将图片绘制到 canvas 中，然后通过 canvas 的 toDataURL 方法来控制图片的质量，对图片进行压缩，另一方面是对图片进行宽高等比缩小来达到图片压缩的效果。


这边的基本思路就是通过 input 文本框获取到图片信息后，将图片画在 Canvas 画布上，然后再转成图片来实现压缩上传。


## FileReader


`FileReader` 对象允许Web应用程序异步读取存储在用户计算机上的文件（或原始数据缓冲区）的内容，使用`File`或 `Blob`对象指定要读取的文件或数据。通俗来讲，就是这个对象是用来读取`File`对象或`Blob`对象的。

作为一个js原生用于读取文件的对象，这里主要介绍图片压缩，所以不做展开介绍了，这里只用到了：


- `FileReader.onload`:处理`load`事件。即该钩子在读取操作完成时触发，通过该钩子函数可以完成例如读取完图片后进行预览的操作，或读取完图片后对图片内容进行二次处理等操作。
- `FileReader.readAsDataURL`：读取方法，并且读取完成后，`result`属性将返回 `Data URL` 格式（Base64 编码）的字符串，代表图片内容。



在`onload`这个钩子对上传的图片实现了预览，并且进行了图片压缩处理。通过`readAsDataURL()`方法进行了文件的读取，并且通过`result`属性拿到了图片的`Base64(DataURL)`格式的数据，然后通过该数据实现了图片预览的功能。有的同学看到这里是不是有点好奇，为什么拿到了这个`Base64(DataURL)`格式的数据就能直接展示处图片了呢？不要紧，往下看，我会在后文中解释这个`DataURL`格式的神奇。


那么将图片转为base64有什么好处呢？

- 将图片转换为Base64编码，可以让你很方便地在没有上传文件的条件下将图片插入其它的网页、编辑器中。 这对于一些小的图片是极为方便的，因为你不需要再去寻找一个保存图片的地方。
- 将图片转换成base64编码的，在web网上一般用于小图片上，不仅可以减少图片的请求数量（集合到js、css代码中），还可以防止因为一些相对路径等问题导致图片404错误。



## 获取文件信息


首先我们先要获取文件信息，通过设置 `input` 标签的 `type` 属性为 `file`，来让用户可以选择文件，设置 `accept` 限制选择的文件类型，绑定 `onchange` 事件，来获取确认选择后的文件
```jsx
export default class Upload extends React.Component {
  fileChange = (e) => {
    let files = e.target.files;    // 文件信息
    if (files.length) {
      let file = files[0];
      compress(file).then(r => {
        // 会返回 {img: 图片信息, file: 原数据, compressBlob: 压缩过的blob信息, compressFile: 压缩过的文件信息}
        console.log(r)    
      }) 
    }
  };

  render() {
    // Internet Explorer 9 以及更早的版本不支持 input 标签的 accept 属性
    // 在文件上传中使用 accept 属性，本例中的输入字段可以接受 GIF 和 JPEG 两种图像
    // accept="image/gif, image/jpeg"
    return (
      <div>
        <input type="file" onChange={this.fileChange} accept="image/*" />
      </div>
    );
  }
}
```


```javascript
/**
 * @description 图片信息 file -> 生成 canvas 图片 -> 压缩 -> 压缩过的信息
 * @param {file} 文件信息
 * @return {Promise} .resolve：{img: 图片信息, file: 原数据, compressBlob: 压缩过的blob信息, compressFile: 压缩过的文件信息}
 */
export default function compress(file) {
  return new Promise((resolve, reject) => {
    if(window.URL || window.webkitURL) {
      resolve(_compress(file, URL.createObjectURL(file)))
    } else {
      const fileReader = new FileReader(); //读取文件的对象
      fileReader.readAsDataURL(file); //对文件读取，读取完成后会将内容以base64的形式赋值给result属性
      // 加载完成执行
      fileReader.onload = function (e) {
        resolve(_compress(file, this.result))
      };
    }
  });
}
```
`window.URL.createObjectURL`  方法可以用于在浏览器上预览本地图片或者视频。上面代码，如果该API兼容存在，则使用该API，否则使用 FileReader API。


- 通过 `FileReader.readAsDataURL(file) `可以获取一段 `data:base64 `的字符串
- 通过 `URL.createObjectURL(blob) `可以获取当前文件的一个内存URL



两种方式都是在本地内存中创建了一个图片暂时地址。以下是内存使用的不同点：


- `createObjectURL` 返回一段带 hash 的 url，并且一直存储在内存中，直到 document 触发了 unload 事件（例如：document close）或者执行 `revokeObjectURL` 来释放。
- `FileReader.readAsDataURL` 则返回包含很多字符的 base64，并会比 blob url 消耗更多内存，但是在不用的时候会自动从内存中清除（通过垃圾回收机制）



两种的优劣势：


- 使用 createObjectURL可以节省性能并更快速，只不过需要在不使用的情况下手动释放内存
- 如果不太在意设备性能问题，并想获取图片的base64，则推荐使用 `FileReader.readAsDataURL`



通过 `fileReader.readAsDataURL(file)`  可以将图片转为了 base64 。


## 使用canvas压缩图片（核心）


这里主要有以下几个步骤：

1. 绘制画布
1. 加载图片，获取图片信息，将图片信息（压缩、宽高限制、等比例限制） 进过处理后绘制到画布上
1. 将 canvas 图片转为dataURL(base64)
1. 将转成的 base64 -> blob
1. 最后 将 blob ->  file，此时的 file 就是经过压缩处理后的文件了，可以看到 size 体积变小了很多
```javascript
/**
 * @description         图片压缩，返回压缩信息、原图片信息、原文件信息
 * @param {*} file      原文件信息
 * @param {*} url    原文件转为 一个 内存地址 或者 base64 的 url
 * @return {Promise}    .resolve：{img: 图片信息, file: 原数据, compressBlob: 压缩过的blob信息, compressFile: 压缩过的文件信息}
 */
function _compress(file, url) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.onload = function () {
      // 图片原始尺寸，
      const originWidth = this.width;
      const originHeight = this.height;

      // 最大尺寸限制、如果尺寸越小，做好压缩后的 size 可以越小，所以设置一个最大值
      const maxWidth = MAX_WIDTH,
        maxHeight = MAX_HEIGHT;

      // 目标尺寸
      let targetWidth = originWidth,
        targetHeight = originHeight;

      // 图片尺寸超过设定的限制，根据 宽、高 哪个长，来等比例缩放
      if (originWidth > maxWidth || originHeight > maxHeight) {
        if (originWidth / originHeight > maxWidth / maxHeight) {
          // 在超过设定最大尺寸的情况下 更宽，按照宽度限定尺寸
          targetWidth = maxWidth;
          targetHeight = Math.round(maxWidth * (originHeight / originWidth));
        } else {
          targetHeight = maxHeight;
          targetWidth = Math.round(maxHeight * (originWidth / originHeight));
        }
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      // 清除一下画板
      ctx.clearRect(0, 0, targetWidth, targetHeight);
      // 绘制画板
      ctx.drawImage(img, 0, 0, targetWidth, targetWidth);

      // 将 canvas 图片转为dataURL(base64)
      let canvasBase64 = canvas.toDataURL(file.type, QUALITY);

      // base64 -> blob
      let blob = convertBase64UrlToBlob(canvasBase64);

      // blob ->  file
      let newFile = new File([blob], file.name, { type: file.type });

      resolve({
        img, // 原图片信息
        file, // 原 file 信息
        compressBlob: blob, // 经过 转 canvas 处理过的 blob
        compressFile: newFile, // 经过处理过的新 File
      });
    };
    
    img.src = url; // ObjectUrl 或 base64

  })
}
```


### ctx.drawImage()


`drawImage()` 方法在画布上绘制图像、画布或视频。`drawImage()` 方法也能够绘制图像的某些部分，以及/或者增加或减少图像的尺寸。参数如下
```javascript
var canvas = document.querySelector('canvas')
var ctx = cas.getContext('2d')
// 先创建图片对象
var img = new Image()
img.src = './images/1.jpg'

// 图片加载完之后
img.onload = function () {
  ctx.drawImage(img, 206, 111, 32, 38, 100, 100, 32, 38)
}
```


### canvas.toDataURl()


`canvas.toDataURl()` 方法可以将 `canvas` 画布上的信息转换为 `base64(DataURL)` 格式的图像信息，纯字符的图片表示形式。该方法接收 2 个参数：


- `mimeType`(可选): 表示需要转换的图像的 `mimeType` 类型。默认值是 `image/png`，还可以是 `image/jpeg`， `image/webp` 等。
- `quailty`(可选)：quality 表示转换的图片质量。范围是 0 到 1。图片的 `mimeType` 需要是 `image/jpeg` 或者 `image/webp`，其他 `mimeType` 值无效。默认压缩质量是 0.92。
```javascript
// canvas.toDataURL(mimeType, quality);

var canvas = document.createElement('canvas')
canvas.toDataURL("image/jpeg" 0.2)
```
**但是**，如果你的目的是将图片先进行压缩，压缩后再上传给服务器，并且服务器只接受二进制的图片信息的话，那就得好好考虑怎么将base64转换成二进制Blob对象了，关于Blob，再下面会讲到

## DataUrl格式


本文中多次提到了`DataURL`格式的数据，那究竟什么才是`DataURL`格式的数据呢？

一般我们的图片的 src 路径形式有：
```html
<img src="https://xxxx">
```
那么除了这种赋值方式之外，还有什么形式能够展示图片呢？就是DataURL,详见如下：
```html
<img src="data:image/jpeg;base64,.9asdfsdgbdjbghdjfgjksbfhjsdf">
```
那么DataURL在实际中有什么用处呢？它的定义是什么？什么场景下需要用到它？


### 1. DataURL格式的定义


官方网站对DataURL的定义：`DataURL`是由RFC2397定义的一种把小文件直接嵌入文档的方案。格式如下：
```
data: [<MIME type>][;charset=<charset>][;base64],<encoded data>
```
整体可以分为：参数+数据，逗号左边是各种参数，右边的是数据，如下：
```html
<img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAS...">
```


### 2. DataURL的优缺点


优点：

1. 当我们访问外部资源很麻烦的时候比如跨域限制的时候，可以直接使用`DataURL`，因为他不需要向外界发起访问。
1. 浏览器都有默认的同一时间最多同时加载的资源数量限制，比如Chrome，最多允许同时加载6个资源，其它起源就得排队等待，但是对于`DataURL`来说，它并不需要向服务器发送Http请求，它就自然不会占用一个http会话资源。
1. 当图片是在服务器端用程序动态生成，每个访问用户显示的都不同时



缺点：

1. `base64`的数据体积实际上会比原数据大，也就是**Data URL形式的图片会比二进制格式的图片体积大1/3**。所以如果图片较小，使用`DataURL`形式的话是比较有利的，图片较小即使比原图片大一些也不会大很多，相比发起一个Http会话这点开销算什么。但是如果图片较大的情况下，使用`DataURL`的开销就会相应增大了，具体还是要结合实际场景来考量
1. Data URL形式的图片**不会被浏览器缓存**，这意味着每次访问这样页面时都被下载一次。这是一个使用效率方面的问题——尤其当这个图片被整个网站大量使用的时候。（不过这个缺点好像可以规避，具体可自寻查找资料）



总结：`DataURL`带来的便利原因就是一个：**它不需要发起http请求**；而它的缺点归纳起来就是两个：**体积比原有还要大**、**不会被缓存**。

### 3. 那么这里为什么要使用DataURL


为什么要使用DataURL，`FileReader.readAsDataURL()` 方法呢？因为 FileReader 去读取文件，并且返回文件的内容，要么就是二进制字符串，要么就是二进制数组，这些都不能直接展示图片，只有调用 `readAsDataURL` 该方法返回的DataURL数据才能直接使用。


## 将 base64 转为 Blob


也许后端需要二进制数据，所以我们需要把 base64 转为 blob


上面已经介绍到了一个完整的 dataURI 应该是这样的：
```
data:[<mediatype>][;base64],<data>
```
其中mediatype声明了文件类型，遵循MIME规则，如“image/png”、“text/plain”；之后是编码类型，这里我们只涉及 base64；紧接着就是文件编码后的内容了。我们常常在 HTML 里看到img标签的src会这样写：
```
src="data:image/gif;base64,R0lGODdhMAAwAPAAAAAAAP///ywAAAAAMAAwAAAC8IyPqcvt3wCcDkiLc7C0qwyGHhSWpjQu5yqmCYsapyuvUUlvONmOZtfzgFzByTB10QgxOR0TqBQejhRNzOfkVJ+5YiUqrXF5Y5lKh/DeuNcP5yLWGsEbtLiOSpa/TPg7JpJHxyendzWTBfX0cxOnKPjgBzi4diinWGdkF8kjdfnycQZXZeYGejmJlZeGl9i2icVqaNVailT6F5iJ90m6mvuTS4OK05M0vDk0Q4XUtwvKOzrcd3iq9uisF81M1OIcR7lEewwcLp7tuNNkM3uNna3F2JQFo97Vriy/Xl4/f1cf5VWzXyym7PHhhx4dbgYKAAA7"
```


以下是一个将 base64 转为 blob 的方法
```javascript
/**
 * @description base64转文件流  base64 -> blob
 * @param {base64} base64数据
 * @return {file}  文件blob
 */
function convertBase64UrlToBlob(base64) {
  const arr = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)[1]; // mime 类型
  // atob() 方法用于解码使用 base-64 编码的字符串。
  const bstr = atob(arr[1]);
  let n = bstr.length;
  // 开辟内存空间
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n); // Unicode
  }
  return new Blob([u8arr], { type: mime });
}
```

- 通过 `window.atob` 将 `base-64` 字符串解码为 `binaryString`（二进制文本）；
- 将 `binaryString` 构造为 `multipart/form-data` 格式；
- 用 `Uint8Array` 将 `multipart` 格式的二进制文本转换为 `ArrayBuffer`。
- 最后转为 Blob 实例对象



## Blob 转为 File


```javascript
new File([blob], file.name, { type: file.type });
```


## FormData数据进行文件的上传
```javascript
let formData = new FormData()
formData.append('file', compressFile)
```


## 总体代码
```javascript
// 图片最大宽和最大高
const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
// 图像质量
const QUALITY = 0.2;

/**
 * @description base64转文件流  base64 -> blob
 * @param {base64} base64数据
 * @return {file}  文件blob
 */
function convertBase64UrlToBlob(base64) {
  const arr = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)[1]; // mime 类型
  // atob() 方法用于解码使用 base-64 编码的字符串。
  const bstr = atob(arr[1]);
  let n = bstr.length;
  // 开辟内存空间
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n); // Unicode
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * @description         图片压缩，返回压缩信息、原图片信息、原文件信息
 * @param {*} file      原文件信息
 * @param {*} url    原文件转为 一个 内存地址 或者 base64 的 url
 * @return {Promise}    .resolve：{img: 图片信息, file: 原数据, compressBlob: 压缩过的blob信息, compressFile: 压缩过的文件信息}
 */
function _compress(file, url) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.onload = function () {
      // 图片原始尺寸，
      const originWidth = this.width;
      const originHeight = this.height;

      // 最大尺寸限制、如果尺寸越小，做好压缩后的 size 可以越小，所以设置一个最大值
      const maxWidth = MAX_WIDTH,
        maxHeight = MAX_HEIGHT;

      // 目标尺寸
      let targetWidth = originWidth,
        targetHeight = originHeight;

      // 图片尺寸超过设定的限制，根据 宽、高 哪个长，来等比例缩放
      if (originWidth > maxWidth || originHeight > maxHeight) {
        if (originWidth / originHeight > maxWidth / maxHeight) {
          // 在超过设定最大尺寸的情况下 更宽，按照宽度限定尺寸
          targetWidth = maxWidth;
          targetHeight = Math.round(maxWidth * (originHeight / originWidth));
        } else {
          targetHeight = maxHeight;
          targetWidth = Math.round(maxHeight * (originWidth / originHeight));
        }
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      // 清除一下画板
      ctx.clearRect(0, 0, targetWidth, targetHeight);
      // 绘制画板
      ctx.drawImage(img, 0, 0, targetWidth, targetWidth);

      // 将 canvas 图片转为dataURL(base64)
      let canvasBase64 = canvas.toDataURL(file.type, QUALITY);

      // base64 -> blob
      let blob = convertBase64UrlToBlob(canvasBase64);

      // blob ->  file
      let newFile = new File([blob], file.name, { type: file.type });

      resolve({
        img, // 原图片信息
        file, // 原 file 信息
        compressBlob: blob, // 经过 转 canvas 处理过的 blob
        compressFile: newFile, // 经过处理过的新 File
      });
    };
    
    img.src = url; // ObjectUrl 或 base64

  })
}

/**
 * @description 图片信息 file -> 生成 canvas 图片 -> 压缩 -> 压缩过的信息
 * @param {file} 文件信息
 * @return {Promise} .resolve：{img: 图片信息, file: 原数据, compressBlob: 压缩过的blob信息, compressFile: 压缩过的文件信息}
 */
export default function compress(file) {
  return new Promise((resolve, reject) => {
    if(window.URL || window.webkitURL) {
      resolve(_compress(file, URL.createObjectURL(file)))
    } else {
      const fileReader = new FileReader(); //读取文件的对象
      fileReader.readAsDataURL(file); //对文件读取，读取完成后会将内容以base64的形式赋值给result属性
      // 加载完成执行
      fileReader.onload = function (e) {
        resolve(_compress(file, this.result))
      };
    }
  });
}
```
```jsx
import React from "react";
import compress from '../../libs/compress'

export default class Upload extends React.Component {
  fileChange = (e) => {
    let files = e.target.files;
    if (files.length) {
      let file = files[0];
      compress(file).then(r => {
        let formData = new FormData()
				formData.append('file', r.compressFile)
      }) 
    }
  };

  render() {
    // Internet Explorer 9 以及更早的版本不支持 input 标签的 accept 属性
    // 在文件上传中使用 accept 属性，本例中的输入字段可以接受 GIF 和 JPEG 两种图像
    // accept="image/gif, image/jpeg"
    return (
      <div>
        <input type="file" onChange={this.fileChange} accept="image/*" />
      </div>
    );
  }
}
```
我们可以看到压缩过后的文件大小变小了很多很多
![image.png](https://cdn.nlark.com/yuque/0/2020/png/312064/1604894708821-092f7646-fea5-4632-8e05-318fe967706e.png#align=left&display=inline&height=368&margin=%5Bobject%20Object%5D&name=image.png&originHeight=368&originWidth=748&size=65724&status=done&style=none&width=748)


## 参考


[例子github地址](https://github.com/visitor-h/file-compress)
