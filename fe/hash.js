self.importScripts('/spark-md5.min.js') // 导入脚本
// 生成hash
self.onmessage = e => {
  const { fileChunkList } = e.data
  const spark = new self.SparkMD5.ArrayBuffer()
  let percentage = 0
  let count = 0
  const loadNext = index => {
    const reader = new FileReader()
    reader.readAsArrayBuffer(fileChunkList[index].file)
    reader.onload = e => {
      count++
      spark.append(e.target.result)
      if (count === fileChunkList.length) {
        // 全部生成hash完成
        self.postMessage({
          percentage: 100,
          hash: spark.end(),
        })
        self.close()
      } else {
        //percentage 百分比：进度
        percentage += 100 / fileChunkList.length
        self.postMessage({
          percentage,
        })
        loadNext(count)
      }
    }
  }
  loadNext(0)
}