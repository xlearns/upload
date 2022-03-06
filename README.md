# [web worker](https://juejin.cn/post/6991140329931931656)
- 方法
  - 主进程：`postMessage、message、error、terminate`
  - work进程：`postMessage、message、error、close`
- 通信
  - 发送:`postMessage()`
  - 接收：`message()`
- 使用`new Worker(url,config)` 
- 注意事项:
  - url同源限制
  - 只能加载网络文件【不能打开file://】
  - 不能操作dom、document、window、但是提供了self来代替window对象
  - 可以发送ajax


# FileReader
- 属性
 - result 读取到的内容
 - onload 读取完成调用
- 方法
 - abort 终止读取操作
 - readAsArrayBuffer 以ArrayBuffer的格式读取文件，读取完成后result属性将返回一个ArrayBuffer实例
 - readAsDataURL  result属性中将包含一个Base64格式
 - readAsText   result属性中将包含一个字符串格式 
- ArrayBuffer
 - 8位 == byte ArrayBuffer字节数组【每个都是8位】里面存放的为字节
# hash
- 为什么要计算文件的 hash
  - 不同的两个文件，完全可以有相同的文件名，在这样的情况下，无论存储哪一个，都会覆盖掉另一个而hash可以理解为文件的指纹。内容不同的文件 hash 一定是不一样的，如果以 hash 为文件明在后端进行存储，就不会出现同名文件相互覆盖的问题了，这是使用 hash 的一个原因。
  - 在此之上还能拓展出一些别的功能，比如文件秒传：在上传文件之前，先将 hash 传到后端进行查询，如果已经有了这个 hash，说明文件已经在后端存在了，那么就不用重新上传，这个时候前端提示用户文件秒传成功即可。
# [spark-md5](https://www.npmjs.com/package/spark-md5)
- 如果文件开始变得大起来，直接一股脑的进行计算，很容易让浏览器变得卡顿甚至直接卡死，所以通常我们需要先将文件进行切片，随后对切片进行增量的 hash 计算。
- 以增量方式对文件进行哈希处理
```js

document.getElementById('file').addEventListener('change', function () {
    var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
        file = this.files[0],
        chunkSize = 2097152,                             // Read in chunks of 2MB
        chunks = Math.ceil(file.size / chunkSize),
        currentChunk = 0,
        spark = new SparkMD5.ArrayBuffer(),
        fileReader = new FileReader();

    fileReader.onload = function (e) {
        console.log('read chunk nr', currentChunk + 1, 'of', chunks);
        spark.append(e.target.result);                   // Append array buffer
        currentChunk++;

        if (currentChunk < chunks) {
            loadNext();
        } else {
            console.log('finished loading');
            console.info('computed hash', spark.end());  // Compute hash
        }
    };

    fileReader.onerror = function () {
        console.warn('oops, something went wrong.');
    };

    function loadNext() {
        var start = currentChunk * chunkSize,
            end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;

        fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
    }

    loadNext();
});
```

# promise并发限制

# 大文件上传

# 断点续传


# [参考](https://blog.51cto.com/u_15087089/2600231)