# 前端实现图片压缩上传

## 前言


现在移动Web页面越来越多，活动页很多都牵涉到图片上传的问题，随着手机像素越来越高，随便一张图片就是很多好多M，要一次上传多张图片的话，第一时间花费太多，第二个就是用户的流量也要耗费不少，而如果实现前端图片压缩则能很好的避开这些问题。


前端图片压缩的主要思路就是将图片绘制到 canvas 中，然后通过 canvas 的 toDataURL 方法来控制图片的质量，对图片进行压缩，另一方面是对图片进行宽高等比缩小来达到图片压缩的效果。


这边的基本思路就是通过 input 文本框获取到图片信息后，将图片画在 Canvas 画布上，然后再转成图片来实现压缩上传。


## 获取file图片信息


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


## 压缩图片


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
我们可以看到压缩过后的文件大小变小了很多很多
![image.png](https://cdn.nlark.com/yuque/0/2020/png/312064/1604894708821-092f7646-fea5-4632-8e05-318fe967706e.png#align=left&display=inline&height=368&margin=%5Bobject%20Object%5D&name=image.png&originHeight=368&originWidth=748&size=65724&status=done&style=none&width=748)


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




## 参考


[例子github地址](https://github.com/visitor-h/file-compress)
