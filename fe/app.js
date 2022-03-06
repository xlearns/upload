const BASE_URL = 'http://localhost:3000'
const SIZE = 0.5 * 1024 * 1024
const Status = {
  wait: 'wait',
  pause: 'pause',
  uploading: 'uploading'
}

new Vue({
  el: '#app',

  data () {
    return {
      file: null,
      worker: null,
      hash: '',
      list: [],
      status: Status.wait,
      requestList: [],
      hashPercentage: 0,
      fakeUploadPercentage: 0
    }
  },

  computed: {
    uploadDisabled () {
      return (
        !this.file || [Status.pause, Status.uploading].includes(this.status)
      )
    },

    uploadPercentage () {
      if (!this.file || !this.list.length) return 0

      const loaded = this.list
        .map(item => item.size * item.percentage)
        .reduce((acc, cur) => acc + cur)
     
      return parseInt((loaded / this.file.size).toFixed(2))
    }
  },

  watch: {
    uploadPercentage (now) {
      if (now > this.fakeUploadPercentage) {
        this.fakeUploadPercentage = now
      }
    }
  },

  filters: {
    transformByte (val) {
      return (Number(val) / 1024).toFixed(0)
    }
  },

  methods: {
    // 根据 hash 验证文件是否曾经已经被上传过
    // 没有才进行上传
    async verifyUpload (filename, fileHash) {
      const { data } = await this.request({
        url: `${BASE_URL}/verify`,
        headers: {
          'content-type': 'application/json'
        },
        data: JSON.stringify({
          filename,
          fileHash
        })
      })
      return JSON.parse(data)
    },

    handlePause () {
      this.status = Status.pause
      this.resetData()
    },

    async handleResume () {
      this.status = Status.uploading
      const { uploadedList } = await this.verifyUpload(
        this.file.name,
        this.hash
      )
      //已上传切片名
      // console.log(uploadedList)
      this.uploadChunks(uploadedList)
    },

    resetData () {
      this.requestList.forEach(xhr => xhr && xhr.abort())
      this.requestList = []
      this.worker && (this.worker.onmessage = null)
    },

    handleFileChange (e) {
      const [file] = e.target.files
      if (!file) return
      this.resetData()
      Object.assign(this.$data, this.$options.data())
      this.file = file
    },
    // 上传
    async handleUpload () {
      if (!this.file) return
      this.status = Status.uploading
      // 切片
      const fileChunkList = this.createFileChunk(this.file)
      this.hash = await this.calculateHash(fileChunkList)
        // 判断文件是否上传
      const { shouldUpload, uploadedList } = await this.verifyUpload(
        this.file.name,
        this.hash
      )
      if (!shouldUpload) {
        this.$message.success('秒传：上传成功')
        this.status = Status.wait
        return
      }
      this.list = fileChunkList.map(({ file }, index) => ({
        fileHash: this.hash,
        index,
        hash: this.file.name + '-' + index,
        chunk: file,
        size: file.size,
        percentage: uploadedList.includes(index) ? 100 : 0
      }))
      await this.uploadChunks(uploadedList)
    },
    //上传切片
    async uploadChunks (uploadedList = []) {
      const requests = this.list
        .filter(({ hash }) => !uploadedList.includes(hash))
        .map(({ chunk, hash, index }) => {
          const formData = new FormData()

          formData.append('chunk', chunk)
          formData.append('hash', hash)
          formData.append('filename', this.file.name)
          formData.append('fileHash', this.hash)

          return { formData, index }
        })
        .map(async ({ formData, index }) =>
          this.request({
            url: BASE_URL,
            data: formData,
            onProgress: this.createProgressHandler(this.list[index]),
            requestList: this.requestList
          })
        )
      await Promise.all(requests)
      this.status = Status.wait
      // 之前上传的切片数量 + 本次上传的切片数量 = 所有切片数量时
      uploadedList.length + requests.length === this.list.length &&
      this.mergeRequest()
    },

    async mergeRequest () {
      await this.request({
        url: `${BASE_URL}/merge`,
        headers: {
          'content-type': 'application/json'
        },
        data: JSON.stringify({
          size: SIZE,
          filename: this.file.name,
          fileHash: this.hash
        })
      })
    },

    request ({
      url,
      method = 'post',
      data,
      headers = {},
      onProgress = e => e,
      requestList = []
    }) {
      return new Promise(resolve => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = onProgress
        xhr.open(method, url)
        Object.keys(headers).forEach(key =>
          xhr.setRequestHeader(key, headers[key])
        )
        xhr.send(data)
        xhr.onload = e => {
          const xhrIndex = requestList.findIndex(item => item === xhr)
          requestList.splice(xhrIndex, 1)
          resolve({
            data: e.target.response
          })
        }
        requestList.push(xhr)
      })
    },

    createFileChunk (file, size = SIZE) {
      const fileChunkList = []
      let cur = 0
     
      while (cur < file.size) {
        fileChunkList.push({ file: file.slice(cur, cur + size) })
        cur += size
      }
      return fileChunkList
    },

    // 生成文件 hash（web-worker）
    calculateHash (fileChunkList) {
      return new Promise(resolve => {
        this.worker = new Worker('/hash.js')
        this.worker.postMessage({ fileChunkList })
        this.worker.onmessage = e => {
          const { percentage, hash } = e.data
          this.hashPercentage = percentage.toFixed(2)
          if (hash) {
            resolve(hash)
          }
        }
      })
    },

    createProgressHandler (item) {
      return e => {
        item.percentage = parseInt(String((e.loaded / e.total) * 100))
      }
    }
  }
})