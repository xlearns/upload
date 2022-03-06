// 入口文件 - 根据此文件在目录下生成 yb.jpeg

const path = require('path'); // 路径
const fse = require('fs-extra'); // fs扩展包

// 合并文件块
// 上传目录 __dirname项目根目录超级变量
const UPLOAD_DIR = path.resolve(__dirname, "..", "文件合成测试");

// 文件路径
const filename = 'test';
const filePath = path.resolve(UPLOAD_DIR, '..', `${filename}.gif`);
console.log(filePath, '文件路径');
const pipeStream = (path, writeStream) =>
	new Promise(resolve => {
		// 创建一个可读流
		const readStream = fse.createReadStream(path); 
		readStream.on("end", () => {
			// fse.unlinkSync(path); // 删除切片
			resolve();
		})
		readStream.pipe(writeStream);
	})

const mergeFileChunk = async (filePath, filename, size) => {
  const chunkPaths = await fse.readdir(UPLOAD_DIR);
	console.log(chunkPaths)
	// [ 'yb-0', 'yb-1', 'yb-2' ]
	// 升序排序，前面减后面的
	chunkPaths.sort((a,b) => a.split('-')[1] - b.split('-')[1]);
	// 每块内容写入最后的文件，promise
	await Promise.all(
	// [ 'yb-0', 'yb-1', 'yb-2' ]
		chunkPaths.map((chunkPath, index) => 
			pipeStream(
				path.resolve(UPLOAD_DIR, chunkPath),
				fse.createWriteStream(filePath, {
					// 写入
					start: index * size,
					end: (index+1)*size
				})
			)
		)
	)
	console.log('文件合并成功');
	// fse.rmdirSync(chunkDir); // 删除target/yb
}

mergeFileChunk(filePath, filename, 0.5*1024*1024);