// 图片最大宽和最大高
const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
// 图像质量
const QUALITY = 0.2;

// 检验是否为图片
function isImage (type) {
  let reg = /(image\/jpeg|image\/jpg|image\/png)/gi
  return reg.test(type)
}

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
function compress(file) {
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